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
        headline: 'Welcome to Mindora! Capture your first thought or task to begin.',
        tasksJson: [],
        meetingsJson: [],
        contextInsight: 'Your Second Brain is ready. Start by recording audio or taking notes to populate your daily brief.',
      };
    }
  }
}
