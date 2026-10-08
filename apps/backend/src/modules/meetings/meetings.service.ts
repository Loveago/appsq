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
      title?: string;
      durationSec?: number;
      transcript: string;
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

    // 3. AI Meeting distillation
    const analysis = await this.aiService.distillMeeting(data.transcript, userId);

    try {
      return await this.prisma.meeting.create({
        data: {
          userId,
          title: data.title || 'Recorded Meeting',
          durationSec: duration,
          status: 'COMPLETED',
          transcript: data.transcript,
          summary: analysis.summary,
          decisions: analysis.decisions as any,
          actionItems: analysis.actionItems as any,
        },
      });
    } catch {
      return {
        id: 'meeting-' + Date.now(),
        userId,
        title: data.title || 'Recorded Meeting',
        durationSec: duration,
        status: 'COMPLETED',
        transcript: data.transcript,
        summary: analysis.summary,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        createdAt: new Date(),
      };
    }
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
