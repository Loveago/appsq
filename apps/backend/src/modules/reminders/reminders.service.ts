import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';

export interface CreateReminderDto {
  title: string;
  description?: string;
  remindAt: string | Date;
  timezone?: string;
  noteId?: string;
  taskId?: string;
  meetingId?: string;
  voiceNoteId?: string;
  recurrenceRule?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  metadata?: any;
}

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Create a personal or note/task-linked reminder
   */
  async createReminder(userId: string, dto: CreateReminderDto) {
    if (!dto.title || dto.title.trim().length === 0) {
      throw new BadRequestException('Reminder title is required');
    }

    const remindAtDate = new Date(dto.remindAt);
    if (isNaN(remindAtDate.getTime())) {
      throw new BadRequestException('Invalid reminder date');
    }

    // Verify linked note if provided
    if (dto.noteId) {
      const note = await this.prisma.note.findFirst({
        where: { id: dto.noteId, userId, deletedAt: null },
      });
      if (!note) {
        throw new NotFoundException('Linked note not found or has been deleted');
      }
    }

    // Verify linked task if provided
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, userId },
      });
      if (!task) {
        throw new NotFoundException('Linked task not found');
      }
    }

    const reminder = await this.prisma.reminder.create({
      data: {
        userId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        remindAt: remindAtDate,
        timezone: dto.timezone || 'UTC',
        noteId: dto.noteId,
        taskId: dto.taskId,
        meetingId: dto.meetingId,
        voiceNoteId: dto.voiceNoteId,
        recurrenceRule: dto.recurrenceRule || 'NONE',
        status: 'PENDING',
        isCompleted: false,
        metadata: dto.metadata || {},
      },
      include: {
        note: { select: { id: true, title: true } },
        task: { select: { id: true, title: true } },
      },
    });

    return reminder;
  }

  /**
   * Get filtered reminders for user
   */
  async getReminders(
    userId: string,
    query: {
      tab?: 'all' | 'upcoming' | 'overdue' | 'completed';
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 30));
    const skip = (page - 1) * limit;
    const now = new Date();

    const where: any = { userId };

    if (query.tab === 'upcoming') {
      where.status = { in: ['PENDING', 'SNOOZED'] };
      where.OR = [
        { status: 'PENDING', remindAt: { gt: now } },
        { status: 'SNOOZED', snoozedUntil: { gt: now } },
      ];
    } else if (query.tab === 'overdue') {
      where.status = 'PENDING';
      where.remindAt = { lte: now };
    } else if (query.tab === 'completed') {
      where.OR = [{ status: 'COMPLETED' }, { isCompleted: true }];
    }

    if (query.search && query.search.trim().length > 0) {
      where.title = { contains: query.search.trim(), mode: 'insensitive' };
    }

    const [reminders, total] = await Promise.all([
      this.prisma.reminder.findMany({
        where,
        orderBy: [{ remindAt: 'asc' }],
        skip,
        take: limit,
        include: {
          note: { select: { id: true, title: true } },
          task: { select: { id: true, title: true } },
        },
      }),
      this.prisma.reminder.count({ where }),
    ]);

    return {
      reminders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get single reminder
   */
  async getReminder(userId: string, id: string) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id, userId },
      include: {
        note: { select: { id: true, title: true, content: true } },
        task: { select: { id: true, title: true } },
      },
    });

    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    return reminder;
  }

  /**
   * Update reminder details
   */
  async updateReminder(userId: string, id: string, dto: Partial<CreateReminderDto>) {
    await this.getReminder(userId, id);

    return this.prisma.reminder.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.remindAt !== undefined && { remindAt: new Date(dto.remindAt) }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.recurrenceRule !== undefined && { recurrenceRule: dto.recurrenceRule }),
      },
    });
  }

  /**
   * Mark reminder completed (or schedule next occurrence if recurring)
   */
  async completeReminder(userId: string, id: string) {
    const reminder = await this.getReminder(userId, id);

    if (reminder.recurrenceRule && reminder.recurrenceRule !== 'NONE') {
      // Calculate next occurrence
      const nextDate = this.calculateNextOccurrence(reminder.remindAt, reminder.recurrenceRule);
      return this.prisma.reminder.update({
        where: { id },
        data: {
          remindAt: nextDate,
          status: 'PENDING',
          isCompleted: false,
          snoozedUntil: null,
          lastTriggeredAt: new Date(),
        },
      });
    }

    return this.prisma.reminder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        isCompleted: true,
      },
    });
  }

  /**
   * Snooze reminder
   */
  async snoozeReminder(userId: string, id: string, minutes: number = 15) {
    await this.getReminder(userId, id);
    const snoozedUntil = new Date(Date.now() + Math.max(1, minutes) * 60 * 1000);

    return this.prisma.reminder.update({
      where: { id },
      data: {
        status: 'SNOOZED',
        snoozedUntil,
      },
    });
  }

  /**
   * Delete reminder
   */
  async deleteReminder(userId: string, id: string) {
    await this.getReminder(userId, id);
    return this.prisma.reminder.delete({ where: { id } });
  }

  /**
   * Parse natural-language reminder request using AI / smart NLP
   */
  async aiParseReminder(prompt: string, userTimezone: string = 'UTC') {
    const text = prompt.trim();
    if (!text) {
      return { isAmbiguous: true, clarificationPrompt: 'Please specify what you would like to be reminded about.' };
    }

    const { client, model } = await this.aiService.getAiClient();
    if (client) {
      try {
        const nowIso = new Date().toISOString();
        const systemPrompt = `You are Mindora's Natural Language Reminder Assistant.
Current server UTC timestamp: ${nowIso}. User timezone: ${userTimezone}.
Extract the reminder title, targeted date/time (in ISO 8601 UTC format), and recurrence rule ('NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY').
If the date or time is completely missing or ambiguous (e.g. "remind me later"), set "isAmbiguous": true and provide a helpful "clarificationPrompt".
Return strictly valid JSON:
{
  "title": "Clean task/reminder title",
  "remindAt": "ISO 8601 UTC string or null",
  "recurrenceRule": "NONE" | "DAILY" | "WEEKLY" | "MONTHLY",
  "isAmbiguous": boolean,
  "clarificationPrompt": string or null,
  "confidence": number
}`;

        const completion = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ],
          temperature: 0.1,
          max_tokens: 500,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          return JSON.parse(cleaned);
        }
      } catch (e) {
        this.logger.warn(`AI reminder parse fallback: ${e}`);
      }
    }

    // Heuristic NLP fallback
    const lower = text.toLowerCase();
    const isTomorrow = lower.includes('tomorrow');
    const targetDate = new Date();

    if (isTomorrow) {
      targetDate.setDate(targetDate.getDate() + 1);
      targetDate.setHours(9, 0, 0, 0); // 9:00 AM default
    } else {
      targetDate.setHours(targetDate.getHours() + 1, 0, 0, 0); // 1 hour from now
    }

    const cleanTitle = text
      .replace(/^(remind me to|remind me|reminder to|set a reminder to|todo:)\s+/i, '')
      .replace(/\b(tomorrow|at \d+(:?\d+)?\s*(am|pm)?|in \d+ hours?)\b/gi, '')
      .trim();

    return {
      title: cleanTitle.length > 0 ? cleanTitle : 'Follow up reminder',
      remindAt: targetDate.toISOString(),
      recurrenceRule: lower.includes('every day') ? 'DAILY' : (lower.includes('every week') ? 'WEEKLY' : 'NONE'),
      isAmbiguous: false,
      clarificationPrompt: null,
      confidence: 0.85,
    };
  }

  /**
   * Calculate next occurrence for recurring reminders
   */
  calculateNextOccurrence(currentDate: Date, rule: string): Date {
    const next = new Date(currentDate);
    switch (rule.toUpperCase()) {
      case 'DAILY':
        next.setDate(next.getDate() + 1);
        break;
      case 'WEEKLY':
        next.setDate(next.getDate() + 7);
        break;
      case 'MONTHLY':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        next.setDate(next.getDate() + 1);
    }
    return next;
  }

  /**
   * Durable serverless-compatible scheduler execution tick
   */
  async processDueReminders() {
    const now = new Date();
    this.logger.log(`Executing scheduled reminder processor tick at ${now.toISOString()}`);

    // Query all due reminders where user is active
    const dueReminders = await this.prisma.reminder.findMany({
      where: {
        status: { in: ['PENDING', 'SNOOZED'] },
        OR: [
          { status: 'PENDING', remindAt: { lte: now } },
          { status: 'SNOOZED', snoozedUntil: { lte: now } },
        ],
        user: { accountStatus: 'ACTIVE' },
      },
      include: {
        note: { select: { id: true, title: true, deletedAt: true } },
        task: { select: { id: true, title: true } },
      },
      take: 100, // Batch limit per tick
    });

    const processedIds: string[] = [];

    for (const reminder of dueReminders) {
      try {
        // If linked note was deleted, cancel reminder to prevent navigating to deleted content
        if (reminder.note && reminder.note.deletedAt) {
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: { status: 'CANCELLED' },
          });
          continue;
        }

        // Construct deep link
        let deepLink = `mindora://reminders/${reminder.id}`;
        let targetType: 'REMINDER' | 'NOTE' | 'TASK' = 'REMINDER';
        let targetId = reminder.id;

        if (reminder.noteId) {
          deepLink = `mindora://notes/${reminder.noteId}`;
          targetType = 'NOTE';
          targetId = reminder.noteId;
        } else if (reminder.taskId) {
          deepLink = `mindora://tasks/${reminder.taskId}`;
          targetType = 'TASK';
          targetId = reminder.taskId;
        }

        // Deliver notification with idempotency
        const triggerStamp = Math.floor(now.getTime() / 60000); // 1-minute idempotency window
        const idempotencyKey = `reminder_${reminder.id}_${triggerStamp}`;

        await this.notificationsService.createNotification({
          userId: reminder.userId,
          title: `Reminder: ${reminder.title}`,
          body: reminder.description || 'You have a scheduled reminder in your Second Brain.',
          category: 'REMINDER',
          priority: 'HIGH',
          channel: 'BOTH',
          deepLink,
          targetType,
          targetId,
          idempotencyKey,
        });

        // Update reminder state
        if (reminder.recurrenceRule && reminder.recurrenceRule !== 'NONE') {
          const nextDate = this.calculateNextOccurrence(reminder.remindAt, reminder.recurrenceRule);
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              remindAt: nextDate,
              status: 'PENDING',
              snoozedUntil: null,
              lastTriggeredAt: now,
            },
          });
        } else {
          await this.prisma.reminder.update({
            where: { id: reminder.id },
            data: {
              status: 'TRIGGERED',
              lastTriggeredAt: now,
            },
          });
        }

        processedIds.push(reminder.id);
      } catch (err: any) {
        this.logger.error(`Failed to process due reminder ${reminder.id}: ${err?.message || err}`);
      }
    }

    return {
      processedCount: processedIds.length,
      processedIds,
      executedAt: now.toISOString(),
    };
  }
}
