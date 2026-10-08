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
  usage: PlanLimits;
  remaining: PlanLimits;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // Authoritative base plan limits
  private static readonly PLAN_LIMITS: Record<string, PlanLimits> = {
    FREE: {
      aiMessages: 50,
      documentScans: 10,
      transcriptionMinutes: 15,
    },
    TRIAL: {
      aiMessages: 150,
      documentScans: 30,
      transcriptionMinutes: 60,
    },
    PRO: {
      aiMessages: 5000,
      documentScans: 500,
      transcriptionMinutes: 300,
    },
    EXPIRED: {
      aiMessages: 5,
      documentScans: 2,
      transcriptionMinutes: 2,
    },
    CANCELLED: {
      aiMessages: 10,
      documentScans: 2,
      transcriptionMinutes: 5,
    },
  };

  constructor(private readonly prisma: PrismaService) {}

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
        // Persist expired status to database
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

    // 2. Resolve Plan Limits
    const limits =
      BillingService.PLAN_LIMITS[effectivePlan] ||
      BillingService.PLAN_LIMITS.FREE;

    // 3. Compute Authoritative Usage from UsageRecord
    const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [aiUsageCount, docUsageCount, transcriptionDurationSum] =
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

    const usage: PlanLimits = {
      aiMessages: aiUsageCount,
      documentScans: docUsageCount,
      transcriptionMinutes:
        transcriptionDurationSum?._sum?.quantity || 0,
    };

    const remaining: PlanLimits = {
      aiMessages: Math.max(0, limits.aiMessages - usage.aiMessages),
      documentScans: Math.max(0, limits.documentScans - usage.documentScans),
      transcriptionMinutes: Math.max(
        0,
        limits.transcriptionMinutes - usage.transcriptionMinutes,
      ),
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
      currentRemaining = entitlements.remaining.aiMessages;
      limit = entitlements.limits.aiMessages;
      currentUsage = entitlements.usage.aiMessages;
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
            monthlyAiTokensUsed: { increment: 1000 },
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

    if (user.trialStartedAt) {
      throw new BadRequestException(
        'Free trial has already been utilized on this account.',
      );
    }

    const now = new Date();
    const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'TRIAL',
        trialStartedAt: now,
        trialEndsAt: trialEnds,
      },
    });

    return this.getUserEntitlements(userId);
  }

  /**
   * RevenueCat Webhook Handler
   */
  async handleRevenueCatWebhook(payload: any) {
    const event = payload?.event;
    if (!event) return { received: true };

    const appUserId = event.app_user_id;
    const type = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION

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
      monthlyAiTokensUsed: ent.usage.aiMessages * 1000,
      monthlyAiTokensLimit: ent.limits.aiMessages * 1000,
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
