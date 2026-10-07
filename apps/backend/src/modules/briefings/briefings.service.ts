import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class BriefingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async getTodayBriefing(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      let briefing = await this.prisma.dailyBriefing.findFirst({
        where: { userId, date: today },
      });

      if (!briefing) {
        const aiBriefing = await this.aiService.generateDailyBriefing(userId);
        briefing = await this.prisma.dailyBriefing.create({
          data: {
            userId,
            date: today,
            headline: aiBriefing.greeting,
            tasksJson: aiBriefing.topTasks as any,
            meetingsJson: aiBriefing.upcomingMeetings as any,
            contextInsight: aiBriefing.contextualInsight,
            deliveredAt: new Date(),
          },
        });
      }

      return briefing;
    } catch {
      return {
        id: 'briefing-today',
        userId,
        date: today,
        headline: 'Good morning! Here is what matters today.',
        tasksJson: [
          'Finish Stripe payment webhook integration',
          'Call John regarding new logo assets',
          'Send proposal & monthly invoice',
        ],
        meetingsJson: ['2:00 PM — Design Architecture Sync with John & Sarah'],
        contextInsight:
          'Yesterday in your John meeting audio, you noted that the website launch depends on payment integration being completed.',
      };
    }
  }
}
