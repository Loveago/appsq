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
      `CREATE TABLE IF NOT EXISTS "Notification" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "body" TEXT NOT NULL,
        "data" JSONB,
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        "readAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );`,
      'CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");',
      'CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");',
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
      'CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId");',
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
