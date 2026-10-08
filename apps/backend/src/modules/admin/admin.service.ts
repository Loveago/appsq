import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';
import OpenAI from 'openai';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  // ==========================================
  // AUDIT LOG HELPER
  // ==========================================
  async logAdminAction(params: {
    adminId: string;
    adminEmail: string;
    action: string;
    targetType: string;
    targetId?: string;
    targetEmail?: string;
    details?: any;
    ipAddress?: string;
  }) {
    try {
      const isUserTarget = params.targetType === 'USER';
      await this.prisma.auditLog.create({
        data: {
          adminId: params.adminId,
          adminEmail: params.adminEmail,
          action: params.action,
          targetType: params.targetType,
          targetId: isUserTarget ? params.targetId : null,
          targetEmail: params.targetEmail,
          details: {
            ...params.details,
            ifNonUserId: !isUserTarget ? params.targetId : undefined,
          },
          ipAddress: params.ipAddress,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`);
    }
  }

  // ==========================================
  // 1. DASHBOARD & SYSTEM OVERVIEW
  // ==========================================
  async getOverviewMetrics() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalUsers,
        proUsers,
        trialUsers,
        freeUsers,
        activeToday,
        newUsersWeek,
        totalNotes,
        totalMeetings,
        totalTasks,
        totalScans,
        totalAiUsageRecords,
        recentErrors,
        activeAiProviders,
        recentAudits,
      ] = await Promise.all([
        this.prisma.user.count({ where: { deletedAt: null } }),
        this.prisma.user.count({ where: { plan: 'PRO', deletedAt: null } }),
        this.prisma.user.count({ where: { plan: 'TRIAL', deletedAt: null } }),
        this.prisma.user.count({ where: { plan: 'FREE', deletedAt: null } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: oneDayAgo }, deletedAt: null } }),
        this.prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
        this.prisma.note.count(),
        this.prisma.meeting.count(),
        this.prisma.task.count(),
        this.prisma.scannedDocument.count().catch(() => 0),
        this.prisma.usageRecord.count({ where: { createdAt: { gte: monthStart } } }).catch(() => 0),
        this.prisma.systemErrorLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 5,
        }).catch(() => []),
        this.prisma.aiProviderConfig.findMany({
          where: { isEnabled: true },
          orderBy: { priority: 'asc' },
        }).catch(() => []),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 6,
        }).catch(() => []),
      ]);

      const mrr = proUsers * 4.99;
      const arr = mrr * 12;
      const conversionRate = totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) + '%' : '0%';

      return {
        users: {
          total: totalUsers,
          pro: proUsers,
          trial: trialUsers,
          free: freeUsers,
          activeToday,
          newThisWeek: newUsersWeek,
          conversionRate,
        },
        revenue: {
          mrr: Number(mrr.toFixed(2)),
          arr: Number(arr.toFixed(2)),
          proPrice: 4.99,
          currency: 'USD',
        },
        ai: {
          monthlyUsageRecords: totalAiUsageRecords,
          activeProvidersCount: activeAiProviders.length,
          primaryProvider: activeAiProviders[0]?.name || 'OpenAI-Compatible Gateway',
        },
        product: {
          notes: totalNotes,
          meetings: totalMeetings,
          tasks: totalTasks,
          scannedDocuments: totalScans,
        },
        systemStatus: {
          api: 'OPERATIONAL',
          database: 'OPERATIONAL',
          aiGateway: activeAiProviders.length > 0 ? 'OPERATIONAL' : 'FALLBACK_ENV',
          backgroundJobs: 'OPERATIONAL',
          storage: 'OPERATIONAL',
        },
        recentErrors,
        recentAudits,
      };
    } catch (err: any) {
      this.logger.error(`Error calculating overview metrics: ${err.message}`);
      return {
        users: { total: 0, pro: 0, trial: 0, free: 0, activeToday: 0, newThisWeek: 0, conversionRate: '0%' },
        revenue: { mrr: 0, arr: 0, proPrice: 4.99, currency: 'USD' },
        ai: { monthlyUsageRecords: 0, activeProvidersCount: 0, primaryProvider: 'Unreachable' },
        product: { notes: 0, meetings: 0, tasks: 0, scannedDocuments: 0 },
        systemStatus: { api: 'OPERATIONAL', database: 'DEGRADED', aiGateway: 'ERROR', backgroundJobs: 'DEGRADED', storage: 'DEGRADED' },
        recentErrors: [],
        recentAudits: [],
      };
    }
  }

  // ==========================================
  // 2. USER MANAGEMENT
  // ==========================================
  async listUsers(query?: {
    search?: string;
    tier?: string;
    plan?: string;
    role?: string;
    accountStatus?: string;
    isSuspended?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query?.limit) || 30));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query?.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { id: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const planFilter = query?.plan || query?.tier;
    if (planFilter && ['FREE', 'TRIAL', 'PRO'].includes(planFilter.toUpperCase())) {
      where.plan = planFilter.toUpperCase();
    }
    if (query?.role && ['USER', 'ADMIN', 'SUPERADMIN'].includes(query.role.toUpperCase())) {
      where.role = query.role.toUpperCase();
    }
    if (query?.accountStatus && ['ACTIVE', 'SUSPENDED', 'DELETED'].includes(query.accountStatus.toUpperCase())) {
      where.accountStatus = query.accountStatus.toUpperCase();
    } else {
      where.deletedAt = null;
    }
    if (typeof query?.isSuspended === 'boolean') {
      where.isSuspended = query.isSuspended;
    }

    try {
      const [total, users] = await Promise.all([
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            role: true,
            plan: true,
            subscriptionTier: true,
            accountStatus: true,
            isSuspended: true,
            suspendedReason: true,
            trialStartedAt: true,
            trialEndsAt: true,
            subscriptionStartedAt: true,
            subscriptionExpiresAt: true,
            monthlyAiTokensUsed: true,
            lastActiveAt: true,
            lastLoginAt: true,
            createdAt: true,
            _count: {
              select: {
                notes: true,
                tasks: true,
                meetings: true,
                projects: true,
                aiConversations: true,
                scannedDocuments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const now = new Date();
      const enrichedUsers = users.map((u) => {
        let trialDaysRemaining: number | null = null;
        if (u.plan === 'TRIAL' && u.trialEndsAt) {
          const diffMs = u.trialEndsAt.getTime() - now.getTime();
          trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }
        return {
          ...u,
          trialDaysRemaining,
        };
      });

      return {
        users: enrichedUsers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (err: any) {
      this.logger.error(`Error in listUsers: ${err.message}`);
      return {
        users: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 },
      };
    }
  }

  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        plan: true,
        subscriptionTier: true,
        accountStatus: true,
        isSuspended: true,
        suspendedReason: true,
        trialStartedAt: true,
        trialEndsAt: true,
        subscriptionStartedAt: true,
        subscriptionExpiresAt: true,
        monthlyAiTokensUsed: true,
        aiQuotaResetAt: true,
        revenueCatAppUserId: true,
        stripeCustomerId: true,
        lastActiveAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: true,
            tasks: true,
            meetings: true,
            projects: true,
            lists: true,
            reminders: true,
            aiConversations: true,
            scannedDocuments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [usageStats, auditHistory] = await Promise.all([
      this.prisma.usageRecord.groupBy({
        by: ['feature'],
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { quantity: true },
      }).catch(() => []),
      this.prisma.auditLog.findMany({
        where: { targetId: userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }).catch(() => []),
    ]);

    const usageSummary: Record<string, number> = {};
    for (const stat of usageStats) {
      usageSummary[stat.feature] = stat._sum.quantity || 0;
    }

    return {
      user,
      usageSummary,
      auditHistory,
    };
  }

  async suspendUser(
    admin: { id: string; email: string },
    userId: string,
    reason: string,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        accountStatus: 'SUSPENDED',
        suspendedReason: reason || 'Suspended by administrator',
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'SUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
      details: { reason },
    });

    return updated;
  }

  async unsuspendUser(admin: { id: string; email: string }, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        accountStatus: 'ACTIVE',
        suspendedReason: null,
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UNSUSPEND_USER',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
    });

    return updated;
  }

  async overridePlan(
    admin: { id: string; email: string },
    userId: string,
    plan: 'FREE' | 'TRIAL' | 'PRO',
    durationDays?: number,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    if (plan === 'FREE') {
      await this.billingService.downgradeToFree(
        userId,
        'ADMIN',
        `Overridden to Free by admin ${admin.email}`,
      );
    } else if (plan === 'PRO') {
      await this.billingService.activateSubscription({
        userId,
        plan: 'PRO',
        provider: 'ADMIN',
        durationDays: durationDays || 30,
        source: 'ADMIN',
        metadata: { adminEmail: admin.email, durationDays: durationDays || 30 },
      });
    } else if (plan === 'TRIAL') {
      await this.billingService.activateSubscription({
        userId,
        plan: 'TRIAL',
        provider: 'ADMIN',
        durationDays: durationDays || 7,
        source: 'ADMIN',
        metadata: { adminEmail: admin.email, trialDays: durationDays || 7 },
      });
    }

    const updated = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'OVERRIDE_USER_PLAN',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
      details: { previousPlan: target.plan, newPlan: plan, durationDays },
    });

    return updated;
  }

  async extendTrial(
    admin: { id: string; email: string },
    userId: string,
    additionalDays: number,
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const now = new Date();
    const currentEnd = target.trialEndsAt && target.trialEndsAt > now ? target.trialEndsAt : now;
    const newEnd = new Date(currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'TRIAL',
        trialEndsAt: newEnd,
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'EXTEND_TRIAL',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
      details: { previousEnd: target.trialEndsAt, newEnd, additionalDays },
    });

    return updated;
  }

  async getUserUsage(userId: string) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [stats, recentRecords] = await Promise.all([
      this.prisma.usageRecord.groupBy({
        by: ['feature'],
        where: { userId, createdAt: { gte: startOfMonth } },
        _sum: { quantity: true },
      }),
      this.prisma.usageRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 25,
      }),
    ]);

    const breakdown: Record<string, number> = {};
    for (const item of stats) {
      breakdown[item.feature] = item._sum.quantity || 0;
    }

    return {
      breakdown,
      recentRecords,
    };
  }

  async overrideTier(
    admin: { id: string; email: string },
    userId: string,
    tier: 'FREE' | 'PRO',
    durationDays?: number,
  ) {
    return this.overridePlan(admin, userId, tier === 'PRO' ? 'PRO' : 'FREE', durationDays);
  }

  async resetQuota(admin: { id: string; email: string }, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        monthlyAiTokensUsed: 0,
        aiQuotaResetAt: new Date(),
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'RESET_AI_QUOTA',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
      details: { previousUsed: target.monthlyAiTokensUsed },
    });

    return updated;
  }

  async updateUserRole(
    admin: { id: string; email: string },
    userId: string,
    role: 'USER' | 'ADMIN' | 'SUPERADMIN',
  ) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_USER_ROLE',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
      details: { previousRole: target.role, newRole: role },
    });

    return updated;
  }

  async deleteUser(admin: { id: string; email: string }, userId: string) {
    const target = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!target) throw new NotFoundException('User not found');

    await this.prisma.user.delete({ where: { id: userId } });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_USER',
      targetType: 'USER',
      targetId: userId,
      targetEmail: target.email,
    });

    return { success: true, message: `User ${target.email} deleted` };
  }

  // ==========================================
  // 3. AI PROVIDER & ROUTING MANAGEMENT
  // ==========================================
  async getAiProviders() {
    try {
      const providers = await this.prisma.aiProviderConfig.findMany({
        orderBy: { priority: 'asc' },
      });

      // Mask API Keys for security
      return providers.map((p) => ({
        ...p,
        apiKeyEncrypted: p.apiKeyEncrypted ? '••••••••••••••••' : '',
        hasKey: Boolean(p.apiKeyEncrypted),
      }));
    } catch {
      return [];
    }
  }

  async createOrUpdateAiProvider(
    admin: { id: string; email: string },
    dto: {
      id?: string;
      name: string;
      providerType?: string;
      baseUrl: string;
      apiKey?: string;
      chatModel: string;
      reasoningModel?: string;
      transcriptionModel?: string;
      embeddingModel?: string;
      priority?: number;
      isEnabled?: boolean;
      isFallback?: boolean;
    },
  ) {
    if (!dto.name || !dto.baseUrl) {
      throw new BadRequestException('Provider name and baseUrl are required');
    }

    let existing: any = null;
    if (dto.id) {
      existing = await this.prisma.aiProviderConfig.findUnique({ where: { id: dto.id } });
    } else {
      existing = await this.prisma.aiProviderConfig.findUnique({ where: { name: dto.name } });
    }

    const apiKeyEncrypted =
      dto.apiKey && dto.apiKey.trim().length > 0 && !dto.apiKey.startsWith('••••')
        ? dto.apiKey.trim()
        : existing?.apiKeyEncrypted || '';

    const data: any = {
      name: dto.name,
      providerType: dto.providerType || 'OPENAI_COMPATIBLE',
      baseUrl: dto.baseUrl,
      apiKeyEncrypted,
      chatModel: dto.chatModel,
      reasoningModel: dto.reasoningModel,
      transcriptionModel: dto.transcriptionModel,
      embeddingModel: dto.embeddingModel,
      priority: dto.priority ?? (existing?.priority || 1),
      isEnabled: dto.isEnabled ?? (existing?.isEnabled ?? true),
      isFallback: dto.isFallback ?? (existing?.isFallback ?? true),
    };

    let result;
    if (existing) {
      result = await this.prisma.aiProviderConfig.update({
        where: { id: existing.id },
        data,
      });
    } else {
      result = await this.prisma.aiProviderConfig.create({
        data,
      });
    }

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: existing ? 'UPDATE_AI_PROVIDER' : 'CREATE_AI_PROVIDER',
      targetType: 'AI_PROVIDER',
      targetId: result.id,
      details: { name: result.name, baseUrl: result.baseUrl, chatModel: result.chatModel },
    });

    return {
      ...result,
      apiKeyEncrypted: '••••••••••••••••',
      hasKey: Boolean(result.apiKeyEncrypted),
    };
  }

  async testAiProvider(providerId: string) {
    const provider = await this.prisma.aiProviderConfig.findUnique({
      where: { id: providerId },
    });

    if (!provider) {
      throw new NotFoundException('Provider not found');
    }

    const apiKey = provider.apiKeyEncrypted;
    if (!apiKey) {
      throw new BadRequestException('Provider has no API key configured');
    }

    const startTime = Date.now();
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: provider.baseUrl,
        timeout: 10000,
      });

      const completion = await client.chat.completions.create({
        model: provider.chatModel,
        messages: [{ role: 'user', content: 'Say operational test OK' }],
        max_tokens: 15,
      });

      const latencyMs = Date.now() - startTime;
      const reply = completion.choices[0]?.message?.content || 'OK';

      await this.prisma.aiProviderConfig.update({
        where: { id: providerId },
        data: {
          lastTestedAt: new Date(),
          lastLatencyMs: latencyMs,
          lastStatus: 'OPERATIONAL',
          errorMessage: null,
        },
      });

      return {
        success: true,
        latencyMs,
        response: reply.trim(),
        status: 'OPERATIONAL',
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const errorMsg = err.message || 'Connection or authentication failed';

      await this.prisma.aiProviderConfig.update({
        where: { id: providerId },
        data: {
          lastTestedAt: new Date(),
          lastLatencyMs: latencyMs,
          lastStatus: 'FAILED',
          errorMessage: errorMsg,
        },
      });

      // Record system error
      await this.prisma.systemErrorLog.create({
        data: {
          type: 'AI_PROVIDER_HEALTH_CHECK_FAILURE',
          severity: 'WARN',
          message: `Health check failed for ${provider.name}: ${errorMsg}`,
          provider: provider.name,
          details: { latencyMs, error: errorMsg },
        },
      });

      return {
        success: false,
        latencyMs,
        status: 'FAILED',
        error: errorMsg,
      };
    }
  }

  async deleteAiProvider(admin: { id: string; email: string }, providerId: string) {
    const provider = await this.prisma.aiProviderConfig.findUnique({
      where: { id: providerId },
    });
    if (!provider) throw new NotFoundException('Provider not found');

    await this.prisma.aiProviderConfig.delete({ where: { id: providerId } });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_AI_PROVIDER',
      targetType: 'AI_PROVIDER',
      targetId: providerId,
      details: { name: provider.name },
    });

    return { success: true };
  }

  async testAssemblyAi(customKey?: string) {
    let key = customKey?.trim();
    if (!key) {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'assemblyai_api_key' },
      });
      if (setting && setting.value) {
        key = typeof setting.value === 'string' ? setting.value.trim() : (setting.value as any)?.key?.toString()?.trim();
      }
    }
    if (!key) {
      key = process.env.ASSEMBLYAI_API_KEY;
    }
    if (!key) {
      throw new BadRequestException('No AssemblyAI API key configured or provided');
    }

    const startTime = Date.now();
    try {
      const res = await fetch('https://api.assemblyai.com/v2/transcript?limit=1', {
        headers: { Authorization: key },
      });
      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return {
          success: true,
          latencyMs,
          message: `AssemblyAI Universal-3.5 Pro verified operational (${latencyMs}ms)`,
        };
      } else {
        const text = await res.text();
        return {
          success: false,
          latencyMs,
          message: `AssemblyAI rejected key (HTTP ${res.status}): ${text}`,
        };
      }
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: `Failed to connect to AssemblyAI: ${err.message || err}`,
      };
    }
  }

  // ==========================================
  // 4. FEATURE FLAGS & ADS MANAGEMENT
  // ==========================================
  async getFeatureFlags() {
    try {
      const flags = await this.prisma.featureFlag.findMany({
        orderBy: { key: 'asc' },
      });
      if (flags.length === 0) {
        // Seed default production flags
        const defaults = [
          { key: 'ai_chat', name: 'Conversational AI Chat', description: 'Enable general AI chat and note actions', isEnabled: true, isProOnly: false },
          { key: 'voice_notes', name: 'Voice Notes & STT', description: 'Enable audio recording and Whisper transcription', isEnabled: true, isProOnly: false },
          { key: 'meeting_mode', name: 'Executive Meeting Mode', description: 'Multi-speaker meeting transcription and action extraction', isEnabled: true, isProOnly: false },
          { key: 'daily_briefing', name: 'Daily Briefing AI', description: 'Morning synthesis of upcoming tasks and reminders', isEnabled: true, isProOnly: false },
          { key: 'ads_enabled', name: 'Global Advertisements', description: 'Show non-intrusive ads to free users (suppressed for Pro)', isEnabled: true, isProOnly: false },
          { key: 'knowledge_graph', name: 'Knowledge Graph Visualization', description: 'Neural memory relationship graph view', isEnabled: true, isProOnly: true },
          { key: 'ocr_scanner', name: 'Document & OCR Scanner', description: 'Vision text extraction for notes', isEnabled: true, isProOnly: false },
        ];
        for (const item of defaults) {
          await this.prisma.featureFlag.upsert({
            where: { key: item.key },
            update: {},
            create: item,
          });
        }
        return await this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
      }
      return flags;
    } catch {
      return [];
    }
  }

  async updateFeatureFlag(
    admin: { id: string; email: string },
    key: string,
    dto: { isEnabled?: boolean; isProOnly?: boolean; rolloutPct?: number },
  ) {
    const existing = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!existing) throw new NotFoundException(`Flag '${key}' not found`);

    const updated = await this.prisma.featureFlag.update({
      where: { key },
      data: {
        ...(dto.isEnabled !== undefined ? { isEnabled: dto.isEnabled } : {}),
        ...(dto.isProOnly !== undefined ? { isProOnly: dto.isProOnly } : {}),
        ...(dto.rolloutPct !== undefined ? { rolloutPct: dto.rolloutPct } : {}),
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_FEATURE_FLAG',
      targetType: 'FEATURE_FLAG',
      targetId: key,
      details: dto,
    });

    return updated;
  }

  // ==========================================
  // 5. SYSTEM SETTINGS & AD CONTROLS
  // ==========================================
  async getSettings() {
    try {
      const settings = await this.prisma.systemSetting.findMany();
      const settingsMap: Record<string, any> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }
      return settingsMap;
    } catch {
      return {};
    }
  }

  async updateSetting(
    admin: { id: string; email: string },
    key: string,
    value: any,
    description?: string,
  ) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'UPDATE_SYSTEM_SETTING',
      targetType: 'SETTING',
      targetId: key,
      details: { value },
    });

    return setting;
  }

  // ==========================================
  // 6. ANNOUNCEMENTS
  // ==========================================
  async listAnnouncements() {
    try {
      return await this.prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch {
      return [];
    }
  }

  async createAnnouncement(
    admin: { id: string; email: string },
    dto: {
      title: string;
      message: string;
      targetTier?: string;
      actionUrl?: string;
      actionLabel?: string;
      expiresAt?: string;
    },
  ) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        message: dto.message,
        targetTier: dto.targetTier || 'ALL',
        actionUrl: dto.actionUrl,
        actionLabel: dto.actionLabel,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: announcement.id,
      details: { title: dto.title, targetTier: dto.targetTier },
    });

    return announcement;
  }

  async deleteAnnouncement(admin: { id: string; email: string }, id: string) {
    await this.prisma.announcement.delete({ where: { id } });

    await this.logAdminAction({
      adminId: admin.id,
      adminEmail: admin.email,
      action: 'DELETE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: id,
    });

    return { success: true };
  }

  // ==========================================
  // 7. AUDIT LOGS & SYSTEM ERRORS
  // ==========================================
  async getAuditLogs(page: number = 1, limit: number = 50) {
    const skip = (Math.max(1, page) - 1) * limit;
    try {
      const [total, logs] = await Promise.all([
        this.prisma.auditLog.count(),
        this.prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);
      return { logs, total, page, limit };
    } catch {
      return { logs: [], total: 0, page: 1, limit };
    }
  }

  async getErrorLogs(limit: number = 50) {
    try {
      return await this.prisma.systemErrorLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch {
      return [];
    }
  }
}
