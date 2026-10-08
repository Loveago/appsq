import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebSocketServer, WebSocket, RawData } from 'ws';
import * as http from 'http';
import * as url from 'url';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from './ai.service';
import { BillingService } from '../billing/billing.service';

interface ActiveStreamSession {
  sessionId: string;
  userId: string;
  voiceNoteId?: string;
  meetingId?: string;
  clientWs: WebSocket;
  aaiWs?: WebSocket;
  isAaiReady: boolean;
  totalAudioBytes: number;
  maxAllowedSec: number;
  limitReached: boolean;
  collectedTranscript: string;
  currentTurnTranscript: string;
  startedAt: Date;
  isFinalized: boolean;
}

@Injectable()
export class StreamingTranscriptionGateway
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(StreamingTranscriptionGateway.name);
  private wss: WebSocketServer | null = null;
  private readonly activeSessions = new Map<string, ActiveStreamSession>();

  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly billingService: BillingService,
    private readonly jwtService: JwtService,
  ) {}

  onApplicationBootstrap() {
    try {
      const server: http.Server = this.httpAdapterHost.httpAdapter.getHttpServer();
      if (!server) {
        this.logger.warn('HTTP Server not ready during bootstrap. Streaming transcription will initialize lazily.');
        return;
      }

      this.wss = new WebSocketServer({
        noServer: true,
      });

      server.on('upgrade', (request, socket, head) => {
        try {
          const parsed = new URL(request.url || '', 'http://localhost');
          if (parsed.pathname === '/transcription/stream') {
            this.wss?.handleUpgrade(request, socket, head, (ws) => {
              this.wss?.emit('connection', ws, request);
            });
          }
        } catch (_) {}
      });

      this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
        this.handleClientConnection(ws, req);
      });

      this.logger.log('AssemblyAI Universal Streaming WebSocket Gateway initialized on /transcription/stream');
    } catch (err: any) {
      this.logger.error(`Failed to initialize WebSocket Gateway: ${err.message}`, err.stack);
    }
  }

  onApplicationShutdown() {
    if (this.wss) {
      this.logger.log('Closing streaming transcription WebSocket gateway...');
      for (const [_, session] of this.activeSessions) {
        this.terminateSession(session, 'SERVER_SHUTDOWN');
      }
      this.wss.close();
      this.wss = null;
    }
  }

  private async authenticateRequest(
    req: http.IncomingMessage,
  ): Promise<{ userId: string; userEmail: string } | null> {
    try {
      const parsed = new URL(req.url || '', 'http://localhost');
      let token = parsed.searchParams.get('token') || undefined;

      if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
          token = parts[1];
        }
      }

      if (!token) {
        return null;
      }

      const secret =
        this.configService.get<string>('JWT_SECRET') ||
        'super_secret_mindora_jwt_key_2026';

      const payload = this.jwtService.verify(token, { secret });
      if (!payload || !payload.sub) {
        return null;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, isSuspended: true, accountStatus: true },
      });

      if (!user || user.isSuspended || user.accountStatus === 'SUSPENDED' || user.accountStatus === 'DELETED') {
        return null;
      }

      return { userId: user.id, userEmail: user.email };
    } catch (err: any) {
      this.logger.warn(`WebSocket auth verification failed: ${err.message}`);
      return null;
    }
  }

  private async handleClientConnection(ws: WebSocket, req: http.IncomingMessage) {
    const auth = await this.authenticateRequest(req);
    if (!auth) {
      this.sendJson(ws, {
        type: 'error',
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing authentication token.',
      });
      ws.close(4001, 'Unauthorized');
      return;
    }

    const { userId } = auth;
    const parsed = new URL(req.url || '', 'http://localhost');
    const sessionId = parsed.searchParams.get('sessionId') || `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const voiceNoteId = parsed.searchParams.get('voiceNoteId') || undefined;
    const meetingId = parsed.searchParams.get('meetingId') || undefined;

    // Check authoritative transcription eligibility before establishing upstream stream
    const canTranscribeCheck = await this.billingService.canTranscribe(userId, 60);
    if (!canTranscribeCheck.allowed) {
      this.logger.log(`User ${userId} transcription quota reached. Rejecting streaming transcription.`);
      this.sendJson(ws, {
        type: 'error',
        code: 'TRANSCRIPTION_LIMIT_REACHED',
        message: 'Monthly transcription allowance reached. Voice recording will be preserved locally.',
        remainingMinutes: canTranscribeCheck.remainingMinutes,
        limitMinutes: canTranscribeCheck.limitMinutes,
      });
      ws.close(4003, 'Quota Exceeded');
      return;
    }

    // Securely retrieve AssemblyAI API Key (kept strictly on server)
    const assemblyAiKey = await this.aiService.getAssemblyAiKey();
    if (!assemblyAiKey) {
      this.logger.error('AssemblyAI API key not configured.');
      this.sendJson(ws, {
        type: 'error',
        code: 'PROVIDER_ERROR',
        message: 'Transcription service temporarily unavailable.',
      });
      ws.close(4004, 'Provider Configuration Missing');
      return;
    }

    // Calculate maximum allowed seconds for this session based on remaining allowance
    const maxAllowedSec = canTranscribeCheck.remainingMinutes * 60;

    const session: ActiveStreamSession = {
      sessionId,
      userId,
      voiceNoteId,
      meetingId,
      clientWs: ws,
      isAaiReady: false,
      totalAudioBytes: 0,
      maxAllowedSec,
      limitReached: false,
      collectedTranscript: '',
      currentTurnTranscript: '',
      startedAt: new Date(),
      isFinalized: false,
    };

    // Prevent duplicate sessions for same ID
    if (this.activeSessions.has(sessionId)) {
      const old = this.activeSessions.get(sessionId)!;
      this.terminateSession(old, 'REPLACED_BY_NEW_SESSION');
    }
    this.activeSessions.set(sessionId, session);

    // Connect to AssemblyAI Universal Streaming v3
    this.initAssemblyAiStream(session, assemblyAiKey);

    // Handle client messages (audio chunks & control messages)
    ws.on('message', (data: RawData, isBinary: boolean) => {
      this.handleClientMessage(session, data, isBinary);
    });

    ws.on('close', () => {
      this.logger.log(`Client disconnected for session: ${sessionId}`);
      this.finalizeAndPersistSession(session);
    });

    ws.on('error', (err) => {
      this.logger.warn(`Client WebSocket error on session ${sessionId}: ${err.message}`);
      this.finalizeAndPersistSession(session);
    });
  }

  private initAssemblyAiStream(session: ActiveStreamSession, apiKey: string) {
    try {
      // AssemblyAI Universal Streaming WebSocket v3
      // 16kHz, 16-bit PCM mono (pcm_s16le)
      const aaiUrl =
        'wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&encoding=pcm_s16le&format_text=true';

      const aaiWs = new WebSocket(aaiUrl, {
        headers: {
          Authorization: apiKey,
        },
      });

      session.aaiWs = aaiWs;

      aaiWs.on('open', () => {
        this.logger.log(`AssemblyAI Universal Streaming connection established for session: ${session.sessionId}`);
        session.isAaiReady = true;
        this.sendJson(session.clientWs, {
          type: 'session_ready',
          sessionId: session.sessionId,
          maxAllowedMinutes: Math.floor(session.maxAllowedSec / 60),
        });
      });

      aaiWs.on('message', (msgData: RawData) => {
        this.handleAssemblyAiMessage(session, msgData);
      });

      aaiWs.on('close', (code, reason) => {
        this.logger.log(
          `AssemblyAI stream closed for session ${session.sessionId} (code ${code}: ${reason.toString()})`,
        );
        session.isAaiReady = false;
      });

      aaiWs.on('error', (err) => {
        this.logger.warn(
          `AssemblyAI streaming error on session ${session.sessionId}: ${err.message}`,
        );
        this.sendJson(session.clientWs, {
          type: 'error',
          code: 'STREAMING_PROVIDER_ERROR',
          message: 'AssemblyAI streaming encountered an issue. Local recording is preserved.',
        });
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to initialize AssemblyAI stream for session ${session.sessionId}: ${err.message}`,
      );
      this.sendJson(session.clientWs, {
        type: 'error',
        code: 'INITIALIZATION_FAILED',
        message: 'Could not connect to streaming transcription.',
      });
    }
  }

  private handleAssemblyAiMessage(session: ActiveStreamSession, rawMsg: RawData) {
    try {
      const msg = JSON.parse(rawMsg.toString());

      // AssemblyAI Universal v3 message handling
      if (msg.type === 'Turn') {
        const text: string = (msg.transcript || '').trim();
        const endOfTurn: boolean = Boolean(msg.end_of_turn);

        if (endOfTurn) {
          // Final stabilized turn segment
          if (text.length > 0) {
            session.collectedTranscript += (session.collectedTranscript ? ' ' : '') + text;
          }
          session.currentTurnTranscript = '';
          this.sendJson(session.clientWs, {
            type: 'final_turn',
            text,
            fullTranscript: session.collectedTranscript,
          });
        } else {
          // Partial real-time transcript update
          session.currentTurnTranscript = text;
          const combined = session.collectedTranscript
            ? `${session.collectedTranscript} ${text}`
            : text;

          this.sendJson(session.clientWs, {
            type: 'partial_transcript',
            text,
            fullTranscript: combined,
          });
        }
      } else if (msg.type === 'SessionBegan' || msg.message_type === 'SessionBegins') {
        this.sendJson(session.clientWs, {
          type: 'session_began',
          sessionId: session.sessionId,
          providerSessionId: msg.session_id,
        });
      } else if (msg.type === 'Error') {
        this.logger.warn(
          `AssemblyAI error for session ${session.sessionId}: ${msg.error || JSON.stringify(msg)}`,
        );
        this.sendJson(session.clientWs, {
          type: 'error',
          code: 'AAI_ERROR',
          message: msg.error || 'AssemblyAI streaming error',
        });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to parse AssemblyAI message: ${e.message}`);
    }
  }

  private handleClientMessage(
    session: ActiveStreamSession,
    data: RawData,
    isBinary: boolean,
  ) {
    if (isBinary) {
      // Binary 16-bit 16kHz PCM audio chunk
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      session.totalAudioBytes += buffer.length;

      // 16kHz * 2 bytes/sample = 32,000 bytes per second
      const durationSec = Math.floor(session.totalAudioBytes / 32000);

      // Check if quota limit reached mid-recording
      if (durationSec >= session.maxAllowedSec && !session.limitReached) {
        session.limitReached = true;
        this.logger.log(
          `Session ${session.sessionId} reached transcription limit (${durationSec}s >= ${session.maxAllowedSec}s). Halting streaming transcription.`,
        );
        this.sendJson(session.clientWs, {
          type: 'limit_reached',
          message:
            'Monthly transcription allowance reached. Audio recording continues uninterrupted.',
        });

        // Close AssemblyAI stream cleanly to stop incurring costs
        if (session.aaiWs && session.aaiWs.readyState === WebSocket.OPEN) {
          try {
            session.aaiWs.send(JSON.stringify({ type: 'Terminate' }));
            session.aaiWs.close();
          } catch (_) {}
        }
        return;
      }

      // If within limits and AssemblyAI socket is ready, forward binary audio frame
      if (!session.limitReached && session.aaiWs && session.aaiWs.readyState === WebSocket.OPEN) {
        try {
          session.aaiWs.send(buffer);
        } catch (err: any) {
          this.logger.warn(`Error sending chunk to AssemblyAI: ${err.message}`);
        }
      }
    } else {
      // JSON Control Message from client
      try {
        const text = data.toString();
        const json = JSON.parse(text);

        if (json.type === 'stop') {
          this.logger.log(`Client requested stop for session ${session.sessionId}`);
          this.finalizeAndPersistSession(session);
        } else if (json.type === 'ping') {
          this.sendJson(session.clientWs, { type: 'pong' });
        }
      } catch (_) {}
    }
  }

  private async finalizeAndPersistSession(session: ActiveStreamSession) {
    if (session.isFinalized) return;
    session.isFinalized = true;

    // 1. Terminate upstream AssemblyAI connection
    if (session.aaiWs && session.aaiWs.readyState === WebSocket.OPEN) {
      try {
        session.aaiWs.send(JSON.stringify({ type: 'Terminate' }));
        session.aaiWs.close();
      } catch (_) {}
    }

    // 2. Synthesize complete final transcript
    let finalTranscript = session.collectedTranscript.trim();
    if (session.currentTurnTranscript && session.currentTurnTranscript.trim().length > 0) {
      finalTranscript = (finalTranscript + ' ' + session.currentTurnTranscript.trim()).trim();
    }

    // 3. Compute final audio duration in seconds
    const durationSec = Math.max(1, Math.floor(session.totalAudioBytes / 32000));

    // 4. Record authoritative transcription usage with BillingService
    if (session.totalAudioBytes > 0 && finalTranscript.length > 0) {
      const feature = session.meetingId ? 'MEETING_TRANSCRIPTION' : 'TRANSCRIPTION';
      await this.billingService
        .recordTranscriptionUsage(session.userId, durationSec, feature, {
          sessionId: session.sessionId,
          voiceNoteId: session.voiceNoteId,
          meetingId: session.meetingId,
          streaming: true,
        })
        .catch((e) => this.logger.warn(`Usage recording failed: ${e.message}`));
    }

    // 5. Trigger AI context extraction (tasks, deadlines, title) on final transcript only
    let extractedContext: { tasks: { title: string }[]; deadlines: string[]; suggestedTitle: string } = {
      tasks: [],
      deadlines: [],
      suggestedTitle: 'Voice Memo',
    };

    if (finalTranscript.length > 0) {
      try {
        extractedContext = await this.aiService.extractContext(finalTranscript, session.userId);
      } catch (e: any) {
        this.logger.warn(`AI extraction failed on final transcript: ${e.message}`);
      }
    }

    // 6. Update database record (VoiceNote or Meeting) authoritatively
    if (session.voiceNoteId) {
      try {
        await this.prisma.voiceNote.upsert({
          where: { id: session.voiceNoteId },
          create: {
            id: session.voiceNoteId,
            userId: session.userId,
            title: extractedContext.suggestedTitle || 'Voice Memo',
            durationSec,
            transcript: finalTranscript,
            status: finalTranscript.length > 0 ? 'TRANSCRIBED' : 'SAVED',
            detectedTasks: extractedContext.tasks.map((t) => t.title),
            detectedDue: extractedContext.deadlines[0] || null,
          },
          update: {
            title: extractedContext.suggestedTitle || 'Voice Memo',
            durationSec,
            transcript: finalTranscript,
            status: finalTranscript.length > 0 ? 'TRANSCRIBED' : 'SAVED',
            detectedTasks: extractedContext.tasks.map((t) => t.title),
            detectedDue: extractedContext.deadlines[0] || null,
          },
        });
      } catch (e: any) {
        this.logger.warn(`Failed to update VoiceNote ${session.voiceNoteId}: ${e.message}`);
      }
    }

    if (session.meetingId) {
      try {
        await this.prisma.meeting.update({
          where: { id: session.meetingId },
          data: {
            transcript: finalTranscript,
            durationSec,
            status: 'COMPLETED',
          },
        }).catch(() => {});
      } catch (_) {}
    }

    // 7. Send canonical final transcript to client
    if (session.clientWs.readyState === WebSocket.OPEN) {
      this.sendJson(session.clientWs, {
        type: 'final_transcript',
        sessionId: session.sessionId,
        transcript: finalTranscript,
        durationSec,
        detectedTasks: extractedContext.tasks.map((t) => t.title),
        detectedDue: extractedContext.deadlines[0] || null,
        suggestedTitle: extractedContext.suggestedTitle || 'Voice Memo',
        limitReached: session.limitReached,
      });

      // Close client socket normally
      session.clientWs.close(1000, 'Session Completed');
    }

    // 8. Clean up active session
    this.activeSessions.delete(session.sessionId);
    this.logger.log(
      `Session ${session.sessionId} finalized successfully. Duration: ${durationSec}s. Words: ${finalTranscript.split(' ').length}`,
    );
  }

  private terminateSession(session: ActiveStreamSession, reason: string) {
    if (session.aaiWs && session.aaiWs.readyState === WebSocket.OPEN) {
      try {
        session.aaiWs.send(JSON.stringify({ type: 'Terminate' }));
        session.aaiWs.close();
      } catch (_) {}
    }
    if (session.clientWs && session.clientWs.readyState === WebSocket.OPEN) {
      try {
        this.sendJson(session.clientWs, { type: 'session_terminated', reason });
        session.clientWs.close(1001, reason);
      } catch (_) {}
    }
    this.activeSessions.delete(session.sessionId);
  }

  private sendJson(ws: WebSocket, payload: any) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(payload));
      } catch (_) {}
    }
  }
}
