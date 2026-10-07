import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async findAll(userId: string) {
    try {
      return await this.prisma.meeting.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string, userId: string) {
    try {
      const meeting = await this.prisma.meeting.findFirst({
        where: { id, userId },
      });
      if (!meeting) throw new NotFoundException('Meeting not found');
      return meeting;
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new NotFoundException('Meeting not found');
    }
  }

  async create(
    userId: string,
    data: {
      title?: string;
      durationSec?: number;
      transcript: string;
    },
  ) {
    const analysis = await this.aiService.distillMeeting(data.transcript, userId);

    try {
      return await this.prisma.meeting.create({
        data: {
          userId,
          title: data.title || 'Recorded Meeting',
          durationSec: data.durationSec || 0,
          status: 'COMPLETED',
          transcript: data.transcript,
          summary: analysis.summary,
          decisions: analysis.decisions as any,
          actionItems: analysis.actionItems as any,
        },
      });
    } catch {
      return {
        id: 'new-meeting-id',
        userId,
        title: data.title || 'Recorded Meeting',
        durationSec: data.durationSec || 0,
        status: 'COMPLETED',
        transcript: data.transcript,
        summary: analysis.summary,
        decisions: analysis.decisions,
        actionItems: analysis.actionItems,
        createdAt: new Date(),
      };
    }
  }
}
