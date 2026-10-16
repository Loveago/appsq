import { Controller, Get, Post, Optional } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { SCHEMA_SQL } from './database/schema-ddl';
import * as bcrypt from 'bcryptjs';
import { AiService } from './modules/ai/ai.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly aiService?: AiService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Backend Health Check and System Status' })
  @ApiResponse({ status: 200, description: 'Mindora API is running healthy' })
  getHealth() {
    return {
      status: 'ok',
      service: 'Mindora AI Second Brain API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
    };
  }

  @Get('health/db')
  @ApiOperation({ summary: 'Database Connectivity & Diagnostics' })
  async getDbHealth() {
    const rawUrl = process.env.DATABASE_URL || '';
    const hasDbUrl = Boolean(rawUrl);
    const masked = rawUrl.replace(/:([^:@]+)@/, ':***@');
    try {
      const tables: any = await this.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
      let userCount = -1;
      let userError: string | null = null;
      let admins: any = [];
      try {
        userCount = await this.prisma.user.count();
        admins = await this.prisma.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
          select: { id: true, email: true, role: true },
        });
      } catch (e: any) {
        userError = e.message || String(e);
      }

      return {
        status: 'CONNECTED',
        hasDbUrl,
        dbUrl: masked,
        tables,
        userCount,
        userError,
        admins,
      };
    } catch (err: any) {
      return {
        status: 'DISCONNECTED',
        hasDbUrl,
        dbUrl: masked,
        error: err.message || String(err),
      };
    }
  }

  @Get('health/ai')
  @ApiOperation({ summary: 'AI Gateway Connectivity and Diagnostic Health' })
  async getAiHealth() {
    if (!this.aiService) {
      return { status: 'DEGRADED', error: 'AiService not available' };
    }
    const testResult = await this.aiService.testActiveConfiguration();
    let dbProviders: any[] = [];
    try {
      const providers = await this.prisma.aiProviderConfig.findMany({
        orderBy: { priority: 'asc' },
      });
      dbProviders = providers.map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        chatModel: p.chatModel,
        reasoningModel: p.reasoningModel,
        priority: p.priority,
        isEnabled: p.isEnabled,
        hasKey: Boolean(p.apiKeyEncrypted),
        keyMasked: p.apiKeyEncrypted
          ? p.apiKeyEncrypted.length > 8
            ? `${p.apiKeyEncrypted.slice(0, 4)}••••${p.apiKeyEncrypted.slice(-4)}`
            : '••••••••'
          : 'NONE',
        lastTestedAt: p.lastTestedAt,
        lastLatencyMs: p.lastLatencyMs,
        lastStatus: p.lastStatus,
      }));
    } catch (_) {}

    const env = this.aiService.getDynamicEnvConfig();
    return {
      status: testResult.success ? 'HEALTHY' : 'DEGRADED',
      activeSource: testResult.source,
      activeProvider: testResult.providerName,
      activeModel: testResult.model,
      activeBaseUrl: testResult.baseUrl,
      hasApiKey: testResult.hasApiKey,
      keyMasked: testResult.keyMasked,
      testPing: {
        success: testResult.success,
        latencyMs: testResult.latencyMs,
        sampleResponse: testResult.response || null,
        error: testResult.error || null,
      },
      dbProviders,
      environmentConfig: {
        hasApiKey: Boolean(env.apiKey),
        keyMasked: env.apiKey
          ? env.apiKey.length > 8
            ? `${env.apiKey.slice(0, 4)}••••${env.apiKey.slice(-4)}`
            : '••••••••'
          : 'NONE',
        baseUrl: env.baseURL,
        model: env.model,
      },
    };
  }

  @Get('health/migrate')
  @Post('health/migrate')
  @ApiOperation({ summary: 'Execute Schema Migration DDL and Seed Defaults' })
  async migrateDb() {
    const results: Array<{ step: string; status: string; error?: string }> = [];

    const extraStatements = [
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudSyncEnabled" BOOLEAN NOT NULL DEFAULT false',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudSyncDisabledAt" TIMESTAMP(3)',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudStorageBytes" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "cloudStorageQuotaBytes" INTEGER NOT NULL DEFAULT 26214400',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "serverRevision" INTEGER NOT NULL DEFAULT 1',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "clientModifiedAt" TIMESTAMP(3)',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "pendingExpirationAt" TIMESTAMP(3)',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "expirationReason" TEXT',
      'ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
      'ALTER TABLE "Meeting" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3)',
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
      )`,
      'CREATE INDEX IF NOT EXISTS "VoiceNote_userId_idx" ON "VoiceNote"("userId")',
      'CREATE INDEX IF NOT EXISTS "VoiceNote_createdAt_idx" ON "VoiceNote"("createdAt")',

      // Subscription
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
      )`,
      'CREATE INDEX IF NOT EXISTS "Subscription_userId_idx" ON "Subscription"("userId")',
      'CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status")',

      // WebhookEvent
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
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_eventId_key" ON "WebhookEvent"("eventId")',

      // Enums
      `DO $$ BEGIN
        CREATE TYPE "NotificationCategory" AS ENUM ('REMINDER', 'NOTE_REVIEW', 'TASK_DUE', 'MEETING', 'VOICE_NOTE', 'ANNOUNCEMENT', 'SYSTEM');
      EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
      EXCEPTION WHEN duplicate_object THEN null; END $$`,
      `DO $$ BEGIN
        CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'BOTH');
      EXCEPTION WHEN duplicate_object THEN null; END $$`,

      // Announcement Table & Columns
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
      )`,
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT \'ANNOUNCEMENT\'',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT \'NORMAL\'',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT \'BOTH\'',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'DRAFT\'',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3)',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3)',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "retractedAt" TIMESTAMP(3)',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "createdByAdminId" TEXT',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "targetAudienceJson" JSONB',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "totalTargeted" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "deliveredCount" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "failedCount" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT',
      'CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status")',
      'CREATE INDEX IF NOT EXISTS "Announcement_targetTier_idx" ON "Announcement"("targetTier")',
      'CREATE INDEX IF NOT EXISTS "Announcement_createdAt_idx" ON "Announcement"("createdAt")',

      // Notification Table & Columns
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
      )`,
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "category" "NotificationCategory" NOT NULL DEFAULT \'REMINDER\'',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "priority" "NotificationPriority" NOT NULL DEFAULT \'NORMAL\'',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "channel" "NotificationChannel" NOT NULL DEFAULT \'IN_APP\'',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deepLink" TEXT',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "targetType" TEXT',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "targetId" TEXT',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3)',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3)',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveryAttempts" INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT \'PENDING\'',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "lastError" TEXT',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "metadata" JSONB',
      'ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
      'ALTER TABLE "Notification" ALTER COLUMN "type" DROP NOT NULL',
      'ALTER TABLE "Notification" ALTER COLUMN "type" SET DEFAULT \'SYSTEM\'',
      'CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId")',
      'CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead")',
      'CREATE INDEX IF NOT EXISTS "Notification_scheduledFor_idx" ON "Notification"("scheduledFor")',
      'CREATE INDEX IF NOT EXISTS "Notification_deliveryStatus_idx" ON "Notification"("deliveryStatus")',
      'CREATE INDEX IF NOT EXISTS "Notification_category_idx" ON "Notification"("category")',

      // NotificationPreference Table & Columns
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
      )`,
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "pushEnabled" BOOLEAN NOT NULL DEFAULT true',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "inAppEnabled" BOOLEAN NOT NULL DEFAULT true',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "reminderAlerts" BOOLEAN NOT NULL DEFAULT true',
      'ALTER TABLE "NotificationPreference" ADD COLUMN IF NOT EXISTS "noteReviewAlerts" BOOLEAN NOT NULL DEFAULT true',
      'CREATE UNIQUE INDEX IF NOT EXISTS "NotificationPreference_userId_key" ON "NotificationPreference"("userId")',

      // UserDevice Table
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
      )`,
      'CREATE UNIQUE INDEX IF NOT EXISTS "UserDevice_token_key" ON "UserDevice"("token")',
      'CREATE INDEX IF NOT EXISTS "UserDevice_userId_idx" ON "UserDevice"("userId")',

      // Reminder Columns
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT \'PENDING\'',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "timezone" TEXT NOT NULL DEFAULT \'UTC\'',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "snoozedUntil" TIMESTAMP(3)',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "recurrenceRule" TEXT',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "lastTriggeredAt" TIMESTAMP(3)',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "notificationId" TEXT',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "metadata" JSONB',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "voiceNoteId" TEXT',
      'ALTER TABLE "Reminder" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP',
    ];

    const rawStatements = [
      ...SCHEMA_SQL
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
      ...extraStatements,
    ];

    for (let i = 0; i < rawStatements.length; i++) {
      let stmt = rawStatements[i];
      try {
        await this.prisma.$executeRawUnsafe(stmt);
        results.push({ step: `stmt_${i + 1}`, status: 'OK' });
      } catch (err: any) {
        // If vector extension fails or vector type fails, retry with text embedding
        if (stmt.includes('vector(1536)')) {
          try {
            const fallbackStmt = stmt.replace('"embedding" vector(1536)', '"embedding" TEXT');
            await this.prisma.$executeRawUnsafe(fallbackStmt);
            results.push({ step: `stmt_${i + 1}`, status: 'OK_FALLBACK' });
            continue;
          } catch (inner: any) {
            results.push({ step: `stmt_${i + 1}`, status: 'ERROR', error: inner.message });
            continue;
          }
        }
        // If already exists, ignore
        if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
          results.push({ step: `stmt_${i + 1}`, status: 'SKIPPED_EXISTS' });
        } else {
          results.push({ step: `stmt_${i + 1}`, status: 'WARN', error: err.message });
        }
      }
    }

    // Seed default Admin User if none exists
    let adminCreated = false;
    try {
      const existingAdmin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
        await this.prisma.user.create({
          data: {
            email: 'admin@mindora.ai',
            fullName: 'Executive Administrator',
            passwordHash,
            role: 'ADMIN',
            plan: 'PRO',
            subscriptionTier: 'PRO',
            accountStatus: 'ACTIVE',
            emailVerified: true,
          },
        });
        adminCreated = true;
      }
    } catch (e: any) {
      results.push({ step: 'seed_admin', status: 'ERROR', error: e.message });
    }

    // Verify created tables
    let currentTables: any = [];
    try {
      currentTables = await this.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
    } catch (_) {}

    return {
      status: 'MIGRATION_COMPLETED',
      adminCreated,
      totalStatements: rawStatements.length,
      currentTables,
      summary: results.filter((r) => r.status === 'ERROR' || r.status === 'WARN').slice(0, 5),
    };
  }
}
