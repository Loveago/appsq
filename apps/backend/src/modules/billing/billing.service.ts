import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface PlanLimits {
  aiMessages: number;
  aiTokens: number;
  documentScans: number;
  transcriptionMinutes: number;
  meetingMode: boolean;
}

export interface PlanUsage {
  aiMessages: number;
  aiTokens: number;
  documentScans: number;
  transcriptionMinutes: number;
}

export interface EntitlementsResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    role: string;
    accountStatus: string;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  plan: 'FREE' | 'TRIAL' | 'PRO' | 'EXPIRED' | 'CANCELLED';
  subscriptionStatus: 'FREE' | 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  trial: {
    active: boolean;
    startedAt: Date | null;
    endsAt: Date | null;
    daysRemaining: number;
  };
  subscription: {
    startedAt: Date | null;
    expiresAt: Date | null;
    provider: string | null;
    cancelledAt: Date | null;
  };
  limits: PlanLimits;
  usage: PlanUsage;
  remaining: PlanLimits;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // Authoritative default base plan limits
  public static readonly DEFAULT_PLAN_LIMITS: Record<string, PlanLimits> = {
    FREE: {
      aiMessages: 50,
      aiTokens: 100000,
      documentScans: 10,
      transcriptionMinutes: 30,
      meetingMode: false,
    },
    TRIAL: {
      aiMessages: 150,
      aiTokens: 50000,
      documentScans: 30,
      transcriptionMinutes: 60,
      meetingMode: true,
    },
    PRO: {
      aiMessages: 5000,
      aiTokens: 1000000,
      documentScans: 500,
      transcriptionMinutes: 300,
      meetingMode: true,
    },
    EXPIRED: {
      aiMessages: 5,
      aiTokens: 1000,
      documentScans: 2,
      transcriptionMinutes: 2,
      meetingMode: false,
    },
    CANCELLED: {
      aiMessages: 10,
      aiTokens: 2000,
      documentScans: 2,
      transcriptionMinutes: 5,
      meetingMode: false,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves dynamic plan limits configured by Admin in SystemSetting
   */
  async getEffectivePlanLimits(): Promise<Record<string, PlanLimits>> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'plan_limits' },
      });
      if (setting && setting.value && typeof setting.value === 'object') {
        const val = setting.value as Record<string, any>;
        return {
          FREE: {
            aiMessages: Number(val.FREE?.aiMessages ?? 50),
            aiTokens: Number(val.FREE?.aiTokens ?? 100000),
            documentScans: Number(val.FREE?.documentScans ?? 10),
            transcriptionMinutes: Number(val.FREE?.transcriptionMinutes ?? 30),
            meetingMode: Boolean(val.FREE?.meetingMode ?? false),
          },
          TRIAL: {
            aiMessages: Number(val.TRIAL?.aiMessages ?? 150),
            aiTokens: Number(val.TRIAL?.aiTokens ?? 50000),
            documentScans: Number(val.TRIAL?.documentScans ?? 30),
            transcriptionMinutes: Number(val.TRIAL?.transcriptionMinutes ?? 60),
            meetingMode: Boolean(val.TRIAL?.meetingMode ?? true),
          },
          PRO: {
            aiMessages: Number(val.PRO?.aiMessages ?? 5000),
            aiTokens: Number(val.PRO?.aiTokens ?? 1000000),
            documentScans: Number(val.PRO?.documentScans ?? 500),
            transcriptionMinutes: Number(val.PRO?.transcriptionMinutes ?? 300),
            meetingMode: Boolean(val.PRO?.meetingMode ?? true),
          },
          EXPIRED: BillingService.DEFAULT_PLAN_LIMITS.EXPIRED,
          CANCELLED: BillingService.DEFAULT_PLAN_LIMITS.CANCELLED,
        };
      }
    } catch (_) {}

    return BillingService.DEFAULT_PLAN_LIMITS;
  }

  /**
   * Admin updates plan limits with input validation and audit logging
   */
  async updatePlanLimitsConfig(
    admin: { id: string; email: string },
    newLimits: Record<string, Partial<PlanLimits>>,
  ) {
    const current = await this.getEffectivePlanLimits();

    // Validate non-negative numbers
    for (const [planKey, pLimits] of Object.entries(newLimits)) {
      if (pLimits) {
        if (pLimits.aiTokens !== undefined && (isNaN(pLimits.aiTokens) || pLimits.aiTokens < 0)) {
          throw new BadRequestException(`Invalid aiTokens for ${planKey}: must be >= 0`);
        }
        if (pLimits.transcriptionMinutes !== undefined && (isNaN(pLimits.transcriptionMinutes) || pLimits.transcriptionMinutes < 0)) {
          throw new BadRequestException(`Invalid transcriptionMinutes for ${planKey}: must be >= 0`);
        }
        if (pLimits.documentScans !== undefined && (isNaN(pLimits.documentScans) || pLimits.documentScans < 0)) {
          throw new BadRequestException(`Invalid documentScans for ${planKey}: must be >= 0`);
        }
      }
    }

    const merged = {
      FREE: { ...current.FREE, ...(newLimits.FREE || {}) },
      TRIAL: { ...current.TRIAL, ...(newLimits.TRIAL || {}) },
      PRO: { ...current.PRO, ...(newLimits.PRO || {}) },
    };

    const setting = await this.prisma.systemSetting.upsert({
      where: { key: 'plan_limits' },
      update: { value: merged as any, description: 'Configurable tier quotas and limits' },
      create: { key: 'plan_limits', value: merged as any, description: 'Configurable tier quotas and limits' },
    });

    // Record in AuditLog
    await this.prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminEmail: admin.email,
        action: 'UPDATE_PLAN_LIMITS',
        targetType: 'SETTING',
        targetId: 'plan_limits',
        details: { previous: current, updated: merged } as any,
      },
    }).catch(() => {});

    return setting.value;
  }

  /**
   * Evaluates authoritative user plan, trial, and usage entitlements.
   * Server is the sole source of truth.
   */
  async getUserEntitlements(userId: string): Promise<EntitlementsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isSuspended || user.accountStatus === 'SUSPENDED') {
      throw new ForbiddenException(
        `Account suspended: ${user.suspendedReason || 'Contact support'}`,
      );
    }

    const now = new Date();
    let effectivePlan: 'FREE' | 'TRIAL' | 'PRO' | 'EXPIRED' | 'CANCELLED' =
      (user.plan as any) || 'FREE';
    let subscriptionStatus: 'FREE' | 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' =
      'FREE';

    // 1. Evaluate Trial Expiration
    let trialActive = false;
    let trialDaysRemaining = 0;
    if (effectivePlan === 'TRIAL') {
      if (user.trialEndsAt && user.trialEndsAt.getTime() <= now.getTime()) {
        effectivePlan = 'EXPIRED';
        subscriptionStatus = 'EXPIRED';
        await this.prisma.user
          .update({
            where: { id: user.id },
            data: { plan: 'EXPIRED' },
          })
          .catch(() => {});
      } else {
        trialActive = true;
        subscriptionStatus = 'TRIALING';
        if (user.trialEndsAt) {
          trialDaysRemaining = Math.max(
            0,
            Math.ceil(
              (user.trialEndsAt.getTime() - now.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          );
        }
      }
    } else if (
      effectivePlan === 'PRO' ||
      user.subscriptionTier === 'PRO'
    ) {
      if (
        user.subscriptionExpiresAt &&
        user.subscriptionExpiresAt.getTime() <= now.getTime()
      ) {
        effectivePlan = 'EXPIRED';
        subscriptionStatus = 'EXPIRED';
        await this.prisma.user
          .update({
            where: { id: user.id },
            data: { plan: 'EXPIRED', subscriptionTier: 'FREE' },
          })
          .catch(() => {});
      } else {
        effectivePlan = 'PRO';
        subscriptionStatus = 'ACTIVE';
      }
    } else if (user.cancelledAt) {
      effectivePlan = 'CANCELLED';
      subscriptionStatus = 'CANCELLED';
    } else {
      effectivePlan = 'FREE';
      subscriptionStatus = 'FREE';
    }

    // 2. Resolve Dynamic Plan Limits
    const allLimits = await this.getEffectivePlanLimits();
    const limits = allLimits[effectivePlan] || allLimits.FREE;

    // 3. Compute Authoritative Usage from UsageRecord for Current Month
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [aiUsageCount, aiTokensSum, docUsageCount, transcriptionDurationSum] =
      await Promise.all([
        this.prisma.usageRecord
          .count({
            where: {
              userId,
              feature: 'AI_CHAT',
              createdAt: { gte: cycleStart },
            },
          })
          .catch(() => 0),
        this.prisma.usageRecord
          .aggregate({
            where: {
              userId,
              feature: { in: ['AI_CHAT', 'AI_TOKENS'] },
              createdAt: { gte: cycleStart },
            },
            _sum: { quantity: true },
          })
          .catch(() => ({ _sum: { quantity: 0 } })),
        this.prisma.usageRecord
          .count({
            where: {
              userId,
              feature: 'DOCUMENT_SCAN',
              createdAt: { gte: cycleStart },
            },
          })
          .catch(() => 0),
        this.prisma.usageRecord
          .aggregate({
            where: {
              userId,
              feature: { in: ['TRANSCRIPTION', 'MEETING_TRANSCRIPTION'] },
              createdAt: { gte: cycleStart },
            },
            _sum: { quantity: true },
          })
          .catch(() => ({ _sum: { quantity: 0 } })),
      ]);

    const actualAiTokensUsed = Math.max(
      user.monthlyAiTokensUsed || 0,
      aiTokensSum?._sum?.quantity || 0,
    );

    const usage: PlanUsage = {
      aiMessages: aiUsageCount,
      aiTokens: actualAiTokensUsed,
      documentScans: docUsageCount,
      transcriptionMinutes: transcriptionDurationSum?._sum?.quantity || 0,
    };

    const remaining: PlanLimits = {
      aiMessages: Math.max(0, limits.aiMessages - usage.aiMessages),
      aiTokens: Math.max(0, limits.aiTokens - usage.aiTokens),
      documentScans: Math.max(0, limits.documentScans - usage.documentScans),
      transcriptionMinutes: Math.max(
        0,
        limits.transcriptionMinutes - usage.transcriptionMinutes,
      ),
      meetingMode: limits.meetingMode,
    };

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        accountStatus: user.accountStatus || 'ACTIVE',
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
      },
      plan: effectivePlan,
      subscriptionStatus,
      trial: {
        active: trialActive,
        startedAt: user.trialStartedAt,
        endsAt: user.trialEndsAt,
        daysRemaining: trialDaysRemaining,
      },
      subscription: {
        startedAt: user.subscriptionStartedAt,
        expiresAt: user.subscriptionExpiresAt,
        provider: user.stripeCustomerId
          ? 'Stripe'
          : user.revenueCatAppUserId
          ? 'RevenueCat'
          : null,
        cancelledAt: user.cancelledAt,
      },
      limits,
      usage,
      remaining,
    };
  }

  // ==========================================
  // CENTRAL ENTITLEMENT DETERMINATION API
  // ==========================================

  async getUserPlan(userId: string): Promise<string> {
    const ent = await this.getUserEntitlements(userId);
    return ent.plan;
  }

  async isTrialActive(userId: string): Promise<boolean> {
    const ent = await this.getUserEntitlements(userId);
    return ent.trial.active;
  }

  /**
   * Voice Note Recording, Playback, and Saving is ALWAYS permitted for all users.
   */
  async canUseVoiceNotes(userId: string): Promise<{ allowed: boolean }> {
    await this.getUserEntitlements(userId);
    return { allowed: true };
  }

  /**
   * Meeting Mode is strictly Pro-Only (PRO or active TRIAL).
   */
  async canUseMeetingMode(userId: string): Promise<boolean> {
    const ent = await this.getUserEntitlements(userId);
    return ent.limits.meetingMode;
  }

  /**
   * Checks transcription allowance based on audio duration (in seconds).
   * Separate from voice note creation.
   */
  async canTranscribe(
    userId: string,
    audioDurationSec: number = 60,
  ): Promise<{
    allowed: boolean;
    remainingMinutes: number;
    limitMinutes: number;
    usedMinutes: number;
  }> {
    const ent = await this.getUserEntitlements(userId);
    const requestedMinutes = Math.max(1, Math.ceil(audioDurationSec / 60));

    const remaining = ent.remaining.transcriptionMinutes;
    return {
      allowed: remaining >= requestedMinutes,
      remainingMinutes: remaining,
      limitMinutes: ent.limits.transcriptionMinutes,
      usedMinutes: ent.usage.transcriptionMinutes,
    };
  }

  /**
   * Check AI Token availability before making LLM calls.
   */
  async canUseAiTokens(
    userId: string,
    requestedTokens: number = 500,
  ): Promise<{
    allowed: boolean;
    remainingTokens: number;
    limitTokens: number;
    usedTokens: number;
  }> {
    const ent = await this.getUserEntitlements(userId);
    const remaining = ent.remaining.aiTokens;
    return {
      allowed: remaining >= requestedTokens,
      remainingTokens: remaining,
      limitTokens: ent.limits.aiTokens,
      usedTokens: ent.usage.aiTokens,
    };
  }

  /**
   * Record actual token consumption in atomic UsageRecord
   */
  async recordAiTokenUsage(
    userId: string,
    tokens: number,
    metadata?: any,
  ) {
    const safeTokens = Math.max(1, tokens);
    try {
      await this.prisma.usageRecord.create({
        data: {
          userId,
          feature: 'AI_TOKENS',
          quantity: safeTokens,
          metadata: metadata || {},
        },
      });

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          monthlyAiTokensUsed: { increment: safeTokens },
        },
      }).catch(() => {});
    } catch (err: any) {
      this.logger.warn(`Could not record AI token usage: ${err.message}`);
    }
  }

  /**
   * Record actual audio transcription duration
   */
  async recordTranscriptionUsage(
    userId: string,
    durationSec: number,
    feature: 'TRANSCRIPTION' | 'MEETING_TRANSCRIPTION' = 'TRANSCRIPTION',
    metadata?: any,
  ) {
    const durationMinutes = Math.max(1, Math.ceil(durationSec / 60));
    try {
      await this.prisma.usageRecord.create({
        data: {
          userId,
          feature,
          quantity: durationMinutes,
          metadata: {
            durationSec,
            durationMs: durationSec * 1000,
            ...(metadata || {}),
          },
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not record transcription usage: ${err.message}`);
    }
  }

  /**
   * Check whether a user is entitled to perform an action, and records usage.
   * Throws structured LIMIT_REACHED error if quota is exhausted.
   */
  async checkAndRecordUsage(
    userId: string,
    feature: 'AI_CHAT' | 'DOCUMENT_SCAN' | 'TRANSCRIPTION' | 'MEETING_TRANSCRIPTION',
    quantity: number = 1,
    metadata?: any,
  ): Promise<{ allowed: boolean; remaining: number }> {
    const entitlements = await this.getUserEntitlements(userId);

    let currentRemaining = 0;
    let limit = 0;
    let currentUsage = 0;

    if (feature === 'AI_CHAT') {
      currentRemaining = entitlements.remaining.aiTokens;
      limit = entitlements.limits.aiTokens;
      currentUsage = entitlements.usage.aiTokens;
    } else if (feature === 'DOCUMENT_SCAN') {
      currentRemaining = entitlements.remaining.documentScans;
      limit = entitlements.limits.documentScans;
      currentUsage = entitlements.usage.documentScans;
    } else if (
      feature === 'TRANSCRIPTION' ||
      feature === 'MEETING_TRANSCRIPTION'
    ) {
      currentRemaining = entitlements.remaining.transcriptionMinutes;
      limit = entitlements.limits.transcriptionMinutes;
      currentUsage = entitlements.usage.transcriptionMinutes;
    }

    if (currentRemaining < quantity) {
      throw new BadRequestException({
        statusCode: 403,
        error: 'LIMIT_REACHED',
        message: `Monthly quota reached for ${feature}. Upgrade to Mindora Pro for elevated limits.`,
        feature,
        currentUsage,
        limit,
        remaining: currentRemaining,
        requiredPlan: 'PRO',
      });
    }

    // Atomic usage insertion
    try {
      await this.prisma.usageRecord.create({
        data: {
          userId,
          feature,
          quantity,
          metadata: metadata || {},
        },
      });

      if (feature === 'AI_CHAT') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            monthlyAiTokensUsed: { increment: quantity },
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      this.logger.warn(`Could not create usage record: ${err.message}`);
    }

    return {
      allowed: true,
      remaining: Math.max(0, currentRemaining - quantity),
    };
  }

  /**
   * Activate Free Trial (7 Days)
   */
  async startFreeTrial(userId: string): Promise<EntitlementsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.plan === 'PRO') {
      throw new BadRequestException('You already have an active Pro subscription.');
    }

    const now = new Date();
    // If trial is already active, return current entitlements immediately
    if (user.plan === 'TRIAL' && user.trialEndsAt && user.trialEndsAt.getTime() > now.getTime()) {
      return this.getUserEntitlements(userId);
    }

    const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'TRIAL',
        subscriptionTier: 'PRO',
        trialStartedAt: user.trialStartedAt || now,
        trialEndsAt: trialEnds,
      },
    });

    this.logger.log(`Activated 7-day free trial for user: ${userId}`);
    return this.getUserEntitlements(userId);
  }

  /**
   * RevenueCat Webhook Handler
   */
  async handleRevenueCatWebhook(payload: any) {
    const event = payload?.event;
    if (!event) return { received: true };

    const appUserId = event.app_user_id;
    const type = event.type;

    this.logger.log(`RevenueCat event: ${type} for user: ${appUserId}`);

    try {
      if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
        await this.prisma.user.updateMany({
          where: {
            OR: [{ id: appUserId }, { revenueCatAppUserId: appUserId }],
          },
          data: {
            plan: 'PRO',
            subscriptionTier: 'PRO',
            subscriptionStartedAt: new Date(),
            subscriptionExpiresAt: event.expiration_at_ms
              ? new Date(event.expiration_at_ms)
              : null,
            cancelledAt: null,
          },
        });
      } else if (type === 'EXPIRATION') {
        await this.prisma.user.updateMany({
          where: {
            OR: [{ id: appUserId }, { revenueCatAppUserId: appUserId }],
          },
          data: {
            plan: 'EXPIRED',
            subscriptionTier: 'FREE',
          },
        });
      } else if (type === 'CANCELLATION') {
        await this.prisma.user.updateMany({
          where: {
            OR: [{ id: appUserId }, { revenueCatAppUserId: appUserId }],
          },
          data: {
            cancelledAt: new Date(),
          },
        });
      }
    } catch (err: any) {
      this.logger.error(`Error updating subscription from webhook: ${err.message}`);
    }

    return { success: true };
  }

  async getBillingStatus(userId: string) {
    const ent = await this.getUserEntitlements(userId);
    return {
      subscriptionTier: ent.plan,
      isPro: ent.plan === 'PRO' || ent.plan === 'TRIAL',
      monthlyAiTokensUsed: ent.usage.aiTokens,
      monthlyAiTokensLimit: ent.limits.aiTokens,
      expiresAt: ent.subscription.expiresAt || ent.trial.endsAt,
      entitlements: ent,
    };
  }

  async setTier(userId: string, tier: 'FREE' | 'PRO') {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: tier,
        subscriptionTier: tier,
        subscriptionStartedAt: tier === 'PRO' ? new Date() : null,
      },
    });
  }
}
