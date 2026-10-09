import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly billingService: BillingService,
  ) {}

  async findAll(userId: string) {
    try {
      return await this.prisma.meeting.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string, userId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!meeting) throw new NotFoundException('Meeting not found or unauthorized');
    return meeting;
  }

  async create(
    userId: string,
    data: {
      id?: string;
      title?: string;
      durationSec?: number;
      transcript: string;
      audioUrl?: string;
      summary?: string;
      decisions?: any[];
      actionItems?: any[];
      keyPoints?: any[];
      openQuestions?: any[];
      participants?: any[];
      speakers?: any[];
      segments?: any[];
    },
  ) {
    // 1. Authoritative Backend Pro-Gate: Meeting Mode is PRO ONLY
    const isMeetingModeAllowed = await this.billingService.canUseMeetingMode(userId);
    if (!isMeetingModeAllowed) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'FEATURE_REQUIRES_PRO',
        message: 'Meeting Mode is available exclusively on Mindora Pro. Please upgrade to unlock.',
        requiredPlan: 'PRO',
      });
    }

    // 2. Transcription allowance check & deduction
    const duration = data.durationSec || 60;
    await this.billingService.recordTranscriptionUsage(
      userId,
      duration,
      'MEETING_TRANSCRIPTION',
      { title: data.title },
    );

    // 3. AI Meeting distillation with structured multi-speaker context (skip if already provided)
    let analysis: any = null;
    if (data.summary && data.summary.trim().length > 0) {
      analysis = {
        summary: data.summary,
        decisions: data.decisions || [],
        actionItems: data.actionItems || [],
        keyPoints: data.keyPoints || [],
        openQuestions: data.openQuestions || [],
        participants: data.participants || [],
      };
    } else {
      try {
        analysis = await this.aiService.distillMeeting(data.transcript, userId);
      } catch (distillErr) {
        console.warn('AI distillMeeting failed during meeting creation:', distillErr);
        analysis = {
          summary: data.transcript.slice(0, 200),
          decisions: [],
          actionItems: [],
          keyPoints: [],
          openQuestions: [],
          participants: [],
        };
      }
    }

    const meetingPayload = {
      title: data.title || 'Recorded Meeting',
      durationSec: duration,
      audioUrl: data.audioUrl,
      status: 'COMPLETED' as const,
      transcript: data.transcript,
      summary: analysis.summary || data.summary || 'Meeting discussion recorded.',
      decisions: (data.decisions || analysis.decisions || []) as any,
      actionItems: (data.actionItems || analysis.actionItems || []) as any,
      keyPoints: (data.keyPoints || analysis.keyPoints || []) as any,
      openQuestions: (data.openQuestions || analysis.openQuestions || []) as any,
      participants: (data.participants || analysis.participants || []) as any,
      speakers: (data.speakers || []) as any,
      segments: (data.segments || []) as any,
      deletedAt: null,
    };

    if (data.id) {
      return await this.prisma.meeting.upsert({
        where: { id: data.id },
        update: meetingPayload,
        create: {
          id: data.id,
          userId,
          ...meetingPayload,
        },
      });
    }

    return await this.prisma.meeting.create({
      data: {
        userId,
        ...meetingPayload,
      },
    });
  }

  async updateSpeakers(
    id: string,
    userId: string,
    body: {
      speakerKey?: string;
      newName?: string;
      mergeSpeakerKey?: string;
      intoSpeakerKey?: string;
    },
  ) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!meeting) throw new NotFoundException('Meeting not found or unauthorized');

    let speakers: any[] = (meeting.speakers as any[]) || [];
    let segments: any[] = (meeting.segments as any[]) || [];

    // Rename speaker
    if (body.speakerKey && body.newName) {
      const key = body.speakerKey.trim().toUpperCase();
      const newName = body.newName.trim();

      speakers = speakers.map((sp) => {
        if (sp.key?.toUpperCase() === key || sp.id === body.speakerKey) {
          return { ...sp, displayName: newName, isCustomNamed: true };
        }
        return sp;
      });

      segments = segments.map((seg) => {
        if (seg.speakerKey?.toUpperCase() === key) {
          return { ...seg, speakerName: newName };
        }
        return seg;
      });
    }

    // Merge speaker
    if (body.mergeSpeakerKey && body.intoSpeakerKey) {
      const fromKey = body.mergeSpeakerKey.trim().toUpperCase();
      const targetKey = body.intoSpeakerKey.trim().toUpperCase();
      const targetSpeaker = speakers.find((s) => s.key?.toUpperCase() === targetKey);
      const targetName = targetSpeaker?.displayName || `Speaker ${targetKey}`;

      speakers = speakers.filter((s) => s.key?.toUpperCase() !== fromKey);
      segments = segments.map((seg) => {
        if (seg.speakerKey?.toUpperCase() === fromKey) {
          return {
            ...seg,
            speakerKey: targetKey,
            speakerName: targetName,
          };
        }
        return seg;
      });
    }

    // Reconstruct canonical transcript text
    const updatedTranscript = segments
      .map((seg) => `${seg.speakerName || 'Speaker ' + seg.speakerKey}: "${seg.text}"`)
      .join('\n\n');

    return this.prisma.meeting.update({
      where: { id },
      data: {
        speakers: speakers as any,
        segments: segments as any,
        transcript: updatedTranscript.length > 0 ? updatedTranscript : meeting.transcript,
      },
    });
  }

  async askQuestion(id: string, userId: string, question: string) {
    return this.aiService.askMeetingQuestion(id, question, userId);
  }

  async delete(id: string, userId: string) {
    const meeting = await this.prisma.meeting.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!meeting) throw new NotFoundException('Meeting not found or unauthorized');

    await this.prisma.meeting.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, deletedMeetingId: id };
  }
}
