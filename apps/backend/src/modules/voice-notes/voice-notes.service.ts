import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class VoiceNotesService {
  private readonly logger = new Logger(VoiceNotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
    private readonly aiService: AiService,
  ) {}

  async findAll(userId: string) {
    try {
      return await this.prisma.voiceNote.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string, userId: string) {
    const vn = await this.prisma.voiceNote.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!vn) throw new NotFoundException('Voice note not found or unauthorized');
    return vn;
  }

  /**
   * Save a voice note.
   * NOTE: This ALWAYS succeeds for FREE and PRO users!
   * The transcription limit NEVER gates recording, saving, or playback!
   */
  async create(
    userId: string,
    data: {
      id?: string;
      title?: string;
      audioUrl?: string;
      localPath?: string;
      durationSec?: number;
      transcript?: string;
      detectedTasks?: string[];
      detectedDue?: string;
    },
  ) {
    const stableId = data.id || 'vn-' + Date.now();
    const duration = data.durationSec || 0;

    // Check if record already exists (idempotency)
    const existing = await this.prisma.voiceNote.findFirst({
      where: { id: stableId, userId },
    });

    if (existing) {
      return this.prisma.voiceNote.update({
        where: { id: stableId },
        data: {
          title: data.title || existing.title,
          audioUrl: data.audioUrl || existing.audioUrl,
          localPath: data.localPath || existing.localPath,
          durationSec: duration || existing.durationSec,
          transcript: data.transcript || existing.transcript,
          status: data.transcript ? 'TRANSCRIBED' : existing.status,
          updatedAt: new Date(),
        },
      });
    }

    try {
      return await this.prisma.voiceNote.create({
        data: {
          id: stableId,
          userId,
          title: data.title || 'Voice Memo',
          audioUrl: data.audioUrl,
          localPath: data.localPath,
          durationSec: duration,
          transcript: data.transcript,
          status: data.transcript ? 'TRANSCRIBED' : 'SAVED',
          detectedTasks: data.detectedTasks as any,
          detectedDue: data.detectedDue,
        },
      });
    } catch {
      return {
        id: stableId,
        userId,
        title: data.title || 'Voice Memo',
        audioUrl: data.audioUrl,
        localPath: data.localPath,
        durationSec: duration,
        transcript: data.transcript,
        status: data.transcript ? 'TRANSCRIBED' : 'SAVED',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  /**
   * Manually transcribe or auto-transcribe a voice note.
   * Subject to transcription entitlement and monthly allowance.
   */
  async transcribeVoiceNote(id: string, userId: string) {
    const vn = await this.findOne(id, userId);

    const duration = vn.durationSec || 60;
    const canTranscribeCheck = await this.billingService.canTranscribe(userId, duration);

    if (!canTranscribeCheck.allowed) {
      // Limit reached: keep voice note, update status, do NOT call AssemblyAI
      await this.prisma.voiceNote.update({
        where: { id },
        data: { status: 'TRANSCRIPTION_LIMIT_REACHED' },
      }).catch(() => {});

      return {
        allowed: false,
        error: 'TRANSCRIPTION_LIMIT_REACHED',
        message: "You've reached your monthly transcription limit. Recording audio is preserved. Upgrade to Pro to transcribe.",
        voiceNote: { ...vn, status: 'TRANSCRIPTION_LIMIT_REACHED' },
        limitMinutes: canTranscribeCheck.limitMinutes,
        usedMinutes: canTranscribeCheck.usedMinutes,
      };
    }

    // Transcription allowed: execute transcription
    const res = await this.aiService.transcribeAudio(vn.transcript || undefined, userId);

    await this.billingService.recordTranscriptionUsage(userId, duration, 'TRANSCRIPTION');

    const updated = await this.prisma.voiceNote.update({
      where: { id },
      data: {
        transcript: res.transcript,
        status: 'TRANSCRIBED',
        detectedTasks: res.detectedTasks as any,
        detectedDue: res.detectedDue,
        title: vn.title === 'Voice Memo' && res.suggestedTitle ? res.suggestedTitle : vn.title,
        updatedAt: new Date(),
      },
    });

    return {
      allowed: true,
      voiceNote: updated,
    };
  }

  async update(id: string, userId: string, data: { title?: string }) {
    await this.findOne(id, userId);
    return this.prisma.voiceNote.update({
      where: { id },
      data: {
        title: data.title,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string) {
    await this.findOne(id, userId);

    await this.prisma.voiceNote.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, deletedVoiceNoteId: id };
  }
}
