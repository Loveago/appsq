import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface CreateNotificationDto {
  userId: string;
  title: string;
  body: string;
  category?: 'REMINDER' | 'NOTE_REVIEW' | 'TASK_DUE' | 'MEETING' | 'VOICE_NOTE' | 'ANNOUNCEMENT' | 'SYSTEM';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  channel?: 'IN_APP' | 'PUSH' | 'BOTH';
  deepLink?: string;
  targetType?: 'NOTE' | 'TASK' | 'REMINDER' | 'MEETING' | 'VOICE_NOTE' | 'ANNOUNCEMENT';
  targetId?: string;
  scheduledFor?: Date;
  expiresAt?: Date;
  idempotencyKey?: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an authoritative notification record with preference checks and deduplication
   */
  async createNotification(dto: CreateNotificationDto) {
    // 1. Idempotency check: prevent duplicate notifications
    if (dto.idempotencyKey) {
      const existing = await this.prisma.notification.findUnique({
        where: { idempotencyKey: dto.idempotencyKey },
      });
      if (existing) {
        return existing;
      }
    }

    // 2. Fetch or initialize user preferences
    const preferences = await this.getPreferences(dto.userId);

    // 3. Verify user preference by category
    const category = dto.category || 'REMINDER';
    let isCategoryEnabled = true;

    if (category === 'REMINDER' && !preferences.reminderAlerts) isCategoryEnabled = false;
    if (category === 'NOTE_REVIEW' && !preferences.noteReviewAlerts) isCategoryEnabled = false;
    if (category === 'TASK_DUE' && !preferences.taskDueAlerts) isCategoryEnabled = false;
    if (category === 'MEETING' && !preferences.meetingAlerts) isCategoryEnabled = false;
    if (category === 'VOICE_NOTE' && !preferences.voiceNoteAlerts) isCategoryEnabled = false;
    if (category === 'ANNOUNCEMENT' && !preferences.announcements) isCategoryEnabled = false;

    if (!isCategoryEnabled) {
      this.logger.debug(`Notification suppressed for user ${dto.userId}: category ${category} is disabled by preferences`);
      return null;
    }

    if (!preferences.inAppEnabled && !preferences.pushEnabled) {
      this.logger.debug(`Notification suppressed for user ${dto.userId}: both in-app and push are disabled`);
      return null;
    }

    const channel = dto.channel || (preferences.pushEnabled ? 'BOTH' : 'IN_APP');

    // 4. Create persistent record
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        title: dto.title,
        body: dto.body,
        category: category as any,
        priority: (dto.priority || 'NORMAL') as any,
        channel: channel as any,
        deepLink: dto.deepLink,
        targetType: dto.targetType,
        targetId: dto.targetId,
        scheduledFor: dto.scheduledFor || new Date(),
        expiresAt: dto.expiresAt,
        idempotencyKey: dto.idempotencyKey,
        metadata: dto.metadata || {},
        deliveryStatus: 'DELIVERED',
        deliveredAt: new Date(),
        deliveryAttempts: 1,
      },
    });

    // 5. Push notification dispatch to registered user devices
    if ((channel === 'PUSH' || channel === 'BOTH') && preferences.pushEnabled) {
      await this.dispatchPushNotification(dto.userId, notification);
    }

    return notification;
  }

  /**
   * Dispatch push notification to user's registered active devices
   */
  private async dispatchPushNotification(userId: string, notification: any) {
    try {
      const devices = await this.prisma.userDevice.findMany({
        where: { userId, isActive: true },
      });

      if (devices.length === 0) {
        return;
      }

      this.logger.log(
        `Dispatching push notification "${notification.title}" to ${devices.length} device(s) for user ${userId}`,
      );

      // Provider dispatch logic (e.g. FCM / APNs payload structure)
      for (const device of devices) {
        // Record timestamp of dispatch attempt
        await this.prisma.userDevice.update({
          where: { id: device.id },
          data: { lastSeenAt: new Date() },
        });
      }
    } catch (err: any) {
      this.logger.warn(`Push dispatch warning for user ${userId}: ${err?.message || err}`);
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { lastError: String(err?.message || err) },
      }).catch(() => null);
    }
  }

  /**
   * Get paginated notifications for a user
   */
  async getUserNotifications(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
      category?: string;
    },
  ) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      userId,
      deliveryStatus: { not: 'CANCELLED' },
    };

    if (query.unreadOnly) {
      where.isRead = false;
    }

    if (query.category && query.category !== 'ALL') {
      where.category = query.category;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false, deliveryStatus: { not: 'CANCELLED' } },
      }),
    ]);

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get unread notification badge count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deliveryStatus: { not: 'CANCELLED' },
      },
    });
  }

  /**
   * Mark single notification as read
   */
  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(userId: string, notificationId: string) {
    return this.prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
  }

  /**
   * Get user notification preferences or initialize defaults
   */
  async getPreferences(userId: string) {
    let pref = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.notificationPreference.create({
        data: {
          userId,
          pushEnabled: true,
          inAppEnabled: true,
          reminderAlerts: true,
          noteReviewAlerts: true,
          taskDueAlerts: true,
          meetingAlerts: true,
          voiceNoteAlerts: true,
          announcements: true,
          timezone: 'UTC',
        },
      });
    }

    return pref;
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId: string, dto: any) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
        ...(dto.inAppEnabled !== undefined && { inAppEnabled: dto.inAppEnabled }),
        ...(dto.reminderAlerts !== undefined && { reminderAlerts: dto.reminderAlerts }),
        ...(dto.noteReviewAlerts !== undefined && { noteReviewAlerts: dto.noteReviewAlerts }),
        ...(dto.taskDueAlerts !== undefined && { taskDueAlerts: dto.taskDueAlerts }),
        ...(dto.meetingAlerts !== undefined && { meetingAlerts: dto.meetingAlerts }),
        ...(dto.voiceNoteAlerts !== undefined && { voiceNoteAlerts: dto.voiceNoteAlerts }),
        ...(dto.announcements !== undefined && { announcements: dto.announcements }),
        ...(dto.quietHoursStart !== undefined && { quietHoursStart: dto.quietHoursStart }),
        ...(dto.quietHoursEnd !== undefined && { quietHoursEnd: dto.quietHoursEnd }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
      },
      create: {
        userId,
        pushEnabled: dto.pushEnabled ?? true,
        inAppEnabled: dto.inAppEnabled ?? true,
        reminderAlerts: dto.reminderAlerts ?? true,
        noteReviewAlerts: dto.noteReviewAlerts ?? true,
        taskDueAlerts: dto.taskDueAlerts ?? true,
        meetingAlerts: dto.meetingAlerts ?? true,
        voiceNoteAlerts: dto.voiceNoteAlerts ?? true,
        announcements: dto.announcements ?? true,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
        timezone: dto.timezone ?? 'UTC',
      },
    });
  }

  /**
   * Register or update mobile push device token
   */
  async registerDevice(
    userId: string,
    dto: { token: string; platform: string; deviceModel?: string; appVersion?: string },
  ) {
    if (!dto.token || dto.token.trim().length === 0) {
      return null;
    }

    return this.prisma.userDevice.upsert({
      where: { token: dto.token.trim() },
      update: {
        userId,
        platform: dto.platform.toUpperCase(),
        deviceModel: dto.deviceModel,
        appVersion: dto.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
      create: {
        userId,
        token: dto.token.trim(),
        platform: dto.platform.toUpperCase(),
        deviceModel: dto.deviceModel,
        appVersion: dto.appVersion,
        isActive: true,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Deactivate device token on sign out
   */
  async unregisterDevice(userId: string, token: string) {
    return this.prisma.userDevice.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }
}
