import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
      await this.ensureSchemaSync();
    } catch (err: any) {
      this.logger.warn(`Prisma connect notice: ${err?.message || err}`);
    }
  }

  async ensureSchemaSync() {
    const ddl = [
      // 1. User & Note sync fields
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudSyncEnabled" BOOLEAN NOT NULL DEFAULT false;',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudSyncDisabledAt" TIMESTAMP(3);',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudStorageBytes" INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudStorageQuotaBytes" INTEGER NOT NULL DEFAULT 26214400;',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "serverRevision" INTEGER NOT NULL DEFAULT 1;',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "clientModifiedAt" TIMESTAMP(3);',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pendingExpirationAt" TIMESTAMP(3);',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "expirationReason" TEXT;',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);',
      'ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);',

      // 2. Subscription Table
      `CREATE TABLE IF NOT EXISTS "Subscription" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "provider" TEXT NOT NULL DEFAULT 'IN_APP',
        "providerSubscriptionId" TEXT,
        "store" TEXT,
        "productId" TEXT,
        "entitlementId" TEXT DEFAULT 'pro',
        "originalTransactionId" TEXT,
        "plan" TEXT NOT NULL DEFAULT 'PRO',
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "isTrial" BOOLEAN NOT NULL DEFAULT false,
        "environment" TEXT DEFAULT 'PRODUCTION',
        "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expiresAt" TIMESTAMP(3),
        "cancelledAt" TIMESTAMP(3),
        "gracePeriodExpiresAt" TIMESTAMP(3),
        "autoRenewing" BOOLEAN NOT NULL DEFAULT true,
        "metadata" JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId");',
      'CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");',

      // 3. WebhookEvent Table
      `CREATE TABLE IF NOT EXISTS "WebhookEvent" (
        "id" TEXT NOT NULL,
        "eventId" TEXT NOT NULL,
        "provider" TEXT NOT NULL,
        "eventType" TEXT NOT NULL,
        "userId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "errorMessage" TEXT,
        "processingTimeMs" INTEGER,
        "payload" JSONB,
        "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
      );`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId");',
      'CREATE INDEX IF NOT EXISTS "WebhookEvent_provider_idx" ON "WebhookEvent"("provider");',
      'CREATE INDEX IF NOT EXISTS "WebhookEvent_status_idx" ON "WebhookEvent"("status");',

      // 4. VoiceNote Table
      `CREATE TABLE IF NOT EXISTS "VoiceNote" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT 'Voice Memo',
        "audioUrl" TEXT,
        "localPath" TEXT,
        "durationSec" INTEGER NOT NULL DEFAULT 0,
        "transcript" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SAVED',
        "detectedTasks" JSONB,
        "detectedDue" TEXT,
        "deletedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "VoiceNote_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "VoiceNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'CREATE INDEX IF NOT EXISTS "VoiceNote_userId_idx" ON "VoiceNote"("userId");',
      'CREATE INDEX IF NOT EXISTS "VoiceNote_createdAt_idx" ON "VoiceNote"("createdAt");',

      // 5. Notification Enums
      `DO $$ BEGIN
        CREATE TYPE "NotificationCategory" AS ENUM ('REMINDER', 'NOTE_REVIEW', 'TASK_DUE', 'MEETING', 'VOICE_NOTE', 'ANNOUNCEMENT', 'SYSTEM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN
        CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;`,
      `DO $$ BEGIN
        CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'BOTH');
      EXCEPTION WHEN duplicate_object THEN null; END $$;`,

      // 6. Announcement Table & Columns
      `CREATE TABLE IF NOT EXISTS "Announcement" (
        "id" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "message" TEXT NOT NULL,
        "targetTier" TEXT NOT NULL DEFAULT 'ALL',
        "actionUrl" TEXT,
        "actionLabel" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
      );`,
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT \'ANNOUNCEMENT\';',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT \'NORMAL\';',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT \'BOTH\';',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'DRAFT\';',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3);',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "retractedAt" TIMESTAMP(3);',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdByAdminId" TEXT;',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetAudienceJson" JSONB;',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "totalTargeted" INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "deliveredCount" INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;',
      'CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status");',
      'CREATE INDEX IF NOT EXISTS "Announcement_targetTier_idx" ON "Announcement"("targetTier");',
      'CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx" ON "Announcement"("createdAt");',

      // 7. Notification Table & Columns
      `CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "category" "NotificationCategory" NOT NULL DEFAULT \'REMINDER\';',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT \'NORMAL\';',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "channel" "NotificationChannel" NOT NULL DEFAULT \'IN_APP\';',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deepLink" TEXT;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "targetType" TEXT;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "targetId" TEXT;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveryAttempts" INTEGER NOT NULL DEFAULT 0;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT \'PENDING\';',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "lastError" TEXT;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB;',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;',
      'ALTER TABLE "Notification" ALTER COLUMN "type" DROP NOT NULL;',
      'ALTER TABLE "Notification" ALTER COLUMN "type" SET DEFAULT \'SYSTEM\';',
      'CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");',
      'CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");',
      'CREATE INDEX IF NOT EXISTS "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");',
      'CREATE INDEX IF NOT EXISTS "Notification_deliveryStatus_idx" ON "Notification"("deliveryStatus");',
      'CREATE INDEX IF NOT EXISTS "Notification_category_idx" ON "Notification"("category");',

      // 8. NotificationPreference Table & Columns
      `CREATE TABLE IF NOT EXISTS "NotificationPreference" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "taskDueAlerts" BOOLEAN NOT NULL DEFAULT true,
        "meetingAlerts" BOOLEAN NOT NULL DEFAULT true,
        "voiceNoteAlerts" BOOLEAN NOT NULL DEFAULT true,
        "announcements" BOOLEAN NOT NULL DEFAULT true,
        "quietHoursStart" TEXT,
        "quietHoursEnd" TEXT,
        "timezone" TEXT NOT NULL DEFAULT 'UTC',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT true;',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN NOT NULL DEFAULT true;',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "reminderAlerts" BOOLEAN NOT NULL DEFAULT true;',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "noteReviewAlerts" BOOLEAN NOT NULL DEFAULT true;',
      'CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");',

      // 9. UserDevice Table
      `CREATE TABLE IF NOT EXISTS "UserDevice" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "platform" TEXT NOT NULL,
        "deviceModel" TEXT,
        "deviceName" TEXT,
        "appVersion" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "lastSyncAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UserDevice_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "UserDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_token_key" ON "UserDevice"("token");',
      'CREATE INDEX IF NOT EXISTS "UserDevice_userId_idx" ON "UserDevice"("userId");',

      // 10. Reminder Columns
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'PENDING\';',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT \'UTC\';',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3);',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "recurrenceRule" TEXT;',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "lastTriggeredAt" TIMESTAMP(3);',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "notificationId" TEXT;',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "metadata" JSONB;',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "voiceNoteId" TEXT;',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;',
    ];

    for (const sql of ddl) {
      try {
        await this.$executeRawUnsafe(sql);
      } catch (err: any) {
        // Silently skip if already exists or constraint already present
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
