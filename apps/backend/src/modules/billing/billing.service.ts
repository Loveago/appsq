import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import {
  encryptSecret,
  decryptSecret,
  maskSecret,
  isMaskedValue,
} from '../../common/utils/crypto.util';

export interface SubscriptionProductMapping {
  id: string; // internal id e.g. "pro_monthly", "pro_annual"
  plan: 'PRO' | 'TRIAL';
  displayName: string;
  description: string;
  billingPeriod: 'MONTHLY' | 'ANNUAL' | 'LIFETIME';
  googlePlayProductId: string; // e.g. "mindora_pro_monthly"
  appleProductId: string; // e.g. "mindora_pro_monthly"
  revenueCatPackageId?: string; // e.g. "$rc_monthly"
  entitlementId: string; // e.g. "pro"
  badgeText?: string; // e.g. "Popular", "Save 35%"
  sortOrder: number;
  isEnabled: boolean;
  limits: {
    aiTokens: number;
    transcriptionMinutes: number;
    documentScans: number;
    meetingMode: boolean;
  };
}

export interface SubscriptionDisplayConfig {
  headline: string;
  subheadline: string;
  proFeatures: string[];
  promotionalBannerText?: string;
  trialDisclosureText: string;
  renewalDisclosureText: string;
  termsUrl: string;
  privacyUrl: string;
  maintenanceMode: boolean;
}

export interface SubscriptionTrialConfig {
  enabled: boolean;
  durationDays: number;
  eligiblePlans: string[];
  disclosureText: string;
}

export interface RevenueCatAdminConfig {
  enabled: boolean;
  androidPublicApiKey: string;
  iosPublicApiKey: string;
  serverSecretApiKeyEncrypted: string;
  webhookAuthTokenEncrypted: string;
  defaultEntitlementId: string;
  lastValidatedAt: string | null;
  lastValidationStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'NOT_CONFIGURED';
  lastValidationMessage?: string;
  lastWebhookReceivedAt: string | null;
  products: SubscriptionProductMapping[];
  display: SubscriptionDisplayConfig;
  trial: SubscriptionTrialConfig;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_SUBSCRIPTION_CONFIG: RevenueCatAdminConfig = {
  enabled: true,
  androidPublicApiKey: 'goog_mindora_prod_android_key',
  iosPublicApiKey: 'appl_mindora_prod_ios_key',
  serverSecretApiKeyEncrypted: '',
  webhookAuthTokenEncrypted: '',
  defaultEntitlementId: 'pro',
  lastValidatedAt: null,
  lastValidationStatus: 'NOT_CONFIGURED',
  lastWebhookReceivedAt: null,
  products: [
    {
      id: 'pro_monthly',
      plan: 'PRO',
      displayName: 'Mindora Pro Monthly',
      description: 'Monthly unlimited access to your AI Second Brain',
      billingPeriod: 'MONTHLY',
      googlePlayProductId: 'mindora_pro_monthly',
      appleProductId: 'mindora_pro_monthly',
      revenueCatPackageId: '$rc_monthly',
      entitlementId: 'pro',
      badgeText: '',
      sortOrder: 1,
      isEnabled: true,
      limits: {
        aiTokens: 1000000,
        transcriptionMinutes: 300,
        documentScans: 500,
        meetingMode: true,
      },
    },
    {
      id: 'pro_annual',
      plan: 'PRO',
      displayName: 'Mindora Pro Annual',
      description: 'Annual membership with continuous sync & 35% discount',
      billingPeriod: 'ANNUAL',
      googlePlayProductId: 'mindora_pro_annual',
      appleProductId: 'mindora_pro_annual',
      revenueCatPackageId: '$rc_annual',
      entitlementId: 'pro',
      badgeText: 'Save 35%',
      sortOrder: 2,
      isEnabled: true,
      limits: {
        aiTokens: 1000000,
        transcriptionMinutes: 300,
        documentScans: 500,
        meetingMode: true,
      },
    },
  ],
  display: {
    headline: 'Unlimited Second Brain.',
    subheadline:
      'Unlock continuous audio recording, neural RAG indexing, and automatic synthesis.',
    proFeatures: [
      'Unlimited continuous voice & meeting capture',
      'Advanced speech-to-text with AssemblyAI',
      'Neural graph semantic search & grounding',
      'Full Second Brain AI Chat & Reasoning',
      'High-capacity monthly token budget (1,000,000 tokens)',
      'Cross-platform synchronization (iOS & Android)',
    ],
    promotionalBannerText: '✦ SPECIAL LAUNCH: 7-DAY EVALUATION AVAILABLE',
    trialDisclosureText:
      'Try 7 days free. Cancel anytime before trial ends without being charged.',
    renewalDisclosureText:
      'Subscriptions automatically renew unless cancelled at least 24 hours before the end of the current period.',
    termsUrl: 'https://appsquare.app/terms',
    privacyUrl: 'https://appsquare.app/privacy',
    maintenanceMode: false,
  },
  trial: {
    enabled: true,
    durationDays: 7,
    eligiblePlans: ['pro_monthly', 'pro_annual'],
    disclosureText: '7-day evaluation with full Second Brain capabilities.',
  },
};

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
  isPro: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  subscriptionDaysRemaining: number;
  daysRemaining: number;
  expiresAt: string | null;
  trial: {
    active: boolean;
    startedAt: Date | null;
    endsAt: Date | null;
    daysRemaining: number;
  };
  subscription: {
    id?: string | null;
    startedAt: Date | null;
    expiresAt: Date | null;
    provider: string | null;
    cancelledAt: Date | null;
    autoRenewing?: boolean;
    daysRemaining: number;
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Structured server-side logging for subscription lifecycle transitions.
   * Format: USER: ... | OLD PLAN: ... | NEW PLAN: ... | EVENT: ...
   */
  public logSubscriptionTransition(params: {
    userId: string;
    oldPlan: string;
    newPlan: string;
    event: string;
    paymentRef?: string;
    subscriptionId?: string;
    source:
      | 'WEBHOOK'
      | 'PAYMENT_VERIFICATION'
      | 'ADMIN'
      | 'MANUAL_UPGRADE'
      | 'SYSTEM_RECONCILIATION'
      | 'USER_CANCELLATION';
    metadata?: any;
  }) {
    const timestamp = new Date().toISOString();
    this.logger.log(
      `[SUBSCRIPTION_TRANSITION] USER: ${params.userId} | OLD PLAN: ${params.oldPlan} | NEW PLAN: ${params.newPlan} | EVENT: ${params.event} | PAYMENT REF: ${params.paymentRef || 'N/A'} | SUBSCRIPTION ID: ${params.subscriptionId || 'N/A'} | SOURCE: ${params.source} | TIMESTAMP: ${timestamp}`,
    );
  }

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

  // ==========================================
  // CONFIGURATION MANAGEMENT & REVENUECAT KEYS
  // ==========================================
  private cachedSubscriptionConfig: RevenueCatAdminConfig | null = null;
  private subscriptionConfigExpiry = 0;

  async getRawSubscriptionConfig(): Promise<RevenueCatAdminConfig> {
    const now = Date.now();
    if (this.cachedSubscriptionConfig && this.subscriptionConfigExpiry > now) {
      return this.cachedSubscriptionConfig;
    }

    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'subscription_config' },
      });
      if (setting && setting.value && typeof setting.value === 'object') {
        const val = setting.value as Partial<RevenueCatAdminConfig>;
        const merged: RevenueCatAdminConfig = {
          ...DEFAULT_SUBSCRIPTION_CONFIG,
          ...val,
          products:
            Array.isArray(val.products) && val.products.length > 0
              ? val.products
              : DEFAULT_SUBSCRIPTION_CONFIG.products,
          display: { ...DEFAULT_SUBSCRIPTION_CONFIG.display, ...(val.display || {}) },
          trial: { ...DEFAULT_SUBSCRIPTION_CONFIG.trial, ...(val.trial || {}) },
        };
        this.cachedSubscriptionConfig = merged;
        this.subscriptionConfigExpiry = now + 30000;
        return merged;
      }
    } catch (_) {}

    return DEFAULT_SUBSCRIPTION_CONFIG;
  }

  async getAdminSubscriptionConfig() {
    const raw = await this.getRawSubscriptionConfig();
    const lastWebhook = await this.prisma.webhookEvent.findFirst({
      where: { provider: 'REVENUECAT' },
      orderBy: { processedAt: 'desc' },
    });
    const totalWebhooks = await this.prisma.webhookEvent.count({
      where: { provider: 'REVENUECAT' },
    });

    return {
      enabled: raw.enabled,
      androidPublicApiKey: raw.androidPublicApiKey,
      iosPublicApiKey: raw.iosPublicApiKey,
      serverSecretApiKey: maskSecret(raw.serverSecretApiKeyEncrypted),
      hasServerSecret: Boolean(raw.serverSecretApiKeyEncrypted),
      webhookAuthToken: maskSecret(raw.webhookAuthTokenEncrypted),
      hasWebhookSecret: Boolean(raw.webhookAuthTokenEncrypted),
      defaultEntitlementId: raw.defaultEntitlementId || 'pro',
      lastValidatedAt: raw.lastValidatedAt,
      lastValidationStatus: raw.lastValidationStatus,
      lastValidationMessage: raw.lastValidationMessage,
      lastWebhookReceivedAt: lastWebhook
        ? lastWebhook.processedAt.toISOString()
        : raw.lastWebhookReceivedAt,
      totalWebhookEvents: totalWebhooks,
      products: raw.products,
      display: raw.display,
      trial: raw.trial,
      updatedAt: raw.updatedAt,
      updatedBy: raw.updatedBy,
    };
  }

  async updateAdminSubscriptionConfig(
    admin: { id: string; email: string },
    dto: Partial<RevenueCatAdminConfig> & {
      serverSecretApiKey?: string;
      webhookAuthToken?: string;
    },
  ) {
    const current = await this.getRawSubscriptionConfig();

    let serverSecretApiKeyEncrypted = current.serverSecretApiKeyEncrypted;
    if (dto.serverSecretApiKey && !isMaskedValue(dto.serverSecretApiKey)) {
      serverSecretApiKeyEncrypted = encryptSecret(dto.serverSecretApiKey.trim());
    }

    let webhookAuthTokenEncrypted = current.webhookAuthTokenEncrypted;
    if (dto.webhookAuthToken && !isMaskedValue(dto.webhookAuthToken)) {
      webhookAuthTokenEncrypted = encryptSecret(dto.webhookAuthToken.trim());
    }

    const updatedConfig: RevenueCatAdminConfig = {
      ...current,
      enabled: dto.enabled !== undefined ? Boolean(dto.enabled) : current.enabled,
      androidPublicApiKey: (dto.androidPublicApiKey ?? current.androidPublicApiKey ?? '').trim(),
      iosPublicApiKey: (dto.iosPublicApiKey ?? current.iosPublicApiKey ?? '').trim(),
      serverSecretApiKeyEncrypted,
      webhookAuthTokenEncrypted,
      defaultEntitlementId: (
        dto.defaultEntitlementId ??
        current.defaultEntitlementId ??
        'pro'
      ).trim(),
      products: Array.isArray(dto.products) ? dto.products : current.products,
      display: {
        ...current.display,
        ...(dto.display || {}),
        maintenanceMode:
          dto.display?.maintenanceMode !== undefined
            ? Boolean(dto.display.maintenanceMode)
            : current.display.maintenanceMode,
      },
      trial: {
        ...current.trial,
        ...(dto.trial || {}),
        enabled:
          dto.trial?.enabled !== undefined
            ? Boolean(dto.trial.enabled)
            : current.trial.enabled,
        durationDays: Number(dto.trial?.durationDays) || current.trial.durationDays,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin.email,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: 'subscription_config' },
      update: {
        value: updatedConfig as any,
        description: 'RevenueCat subscription and billing configuration',
      },
      create: {
        key: 'subscription_config',
        value: updatedConfig as any,
        description: 'RevenueCat subscription and billing configuration',
      },
    });

    // Invalidate cache immediately
    this.cachedSubscriptionConfig = null;
    this.subscriptionConfigExpiry = 0;

    // Log in AuditLog
    await this.prisma.auditLog
      .create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'UPDATE_SUBSCRIPTION_CONFIG',
          targetType: 'SETTING',
          targetId: 'subscription_config',
          details: {
            enabled: updatedConfig.enabled,
            androidKeyConfigured: Boolean(updatedConfig.androidPublicApiKey),
            iosKeyConfigured: Boolean(updatedConfig.iosPublicApiKey),
            serverSecretConfigured: Boolean(serverSecretApiKeyEncrypted),
            webhookSecretConfigured: Boolean(webhookAuthTokenEncrypted),
            productCount: updatedConfig.products.length,
          } as any,
        },
      })
      .catch(() => {});

    return this.getAdminSubscriptionConfig();
  }

  async getPublicSubscriptionConfig(platform?: string) {
    const raw = await this.getRawSubscriptionConfig();
    const plat = (platform || '').toLowerCase();
    const isIos = plat === 'ios';

    return {
      revenueCatEnabled: raw.enabled,
      apiKey: isIos ? raw.iosPublicApiKey : raw.androidPublicApiKey,
      androidApiKey: raw.androidPublicApiKey,
      iosApiKey: raw.iosPublicApiKey,
      entitlementId: raw.defaultEntitlementId || 'pro',
      products: raw.products
        .filter((p) => p.isEnabled)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      display: raw.display,
      trial: raw.trial,
      maintenanceMode: raw.display.maintenanceMode,
    };
  }

  async validateRevenueCatConnection(secretKeyOverride?: string) {
    const raw = await this.getRawSubscriptionConfig();
    const secretKey =
      secretKeyOverride && !isMaskedValue(secretKeyOverride)
        ? secretKeyOverride.trim()
        : decryptSecret(raw.serverSecretApiKeyEncrypted) ||
          this.configService.get<string>('REVENUECAT_SECRET_KEY') ||
          '';

    if (!secretKey) {
      return {
        success: false,
        message:
          'RevenueCat Secret API Key is not configured. Please enter your secret key (sk_...) to test the connection.',
      };
    }

    try {
      const res = await fetch(
        'https://api.revenuecat.com/v1/subscribers/test_connection_ping',
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        },
      );

      const isSuccess = res.status === 200 || res.status === 404;
      const statusText = isSuccess ? 'SUCCESS' : 'FAILED';
      const message = isSuccess
        ? 'RevenueCat API credentials verified successfully (connected to RevenueCat v1 REST API).'
        : `RevenueCat API returned status ${res.status}: Invalid or unauthorized secret key.`;

      await this.prisma.systemSetting
        .upsert({
          where: { key: 'subscription_config' },
          update: {
            value: {
              ...raw,
              lastValidatedAt: new Date().toISOString(),
              lastValidationStatus: statusText,
              lastValidationMessage: message,
            } as any,
          },
          create: {
            key: 'subscription_config',
            value: {
              ...raw,
              lastValidatedAt: new Date().toISOString(),
              lastValidationStatus: statusText,
              lastValidationMessage: message,
            } as any,
          },
        })
        .catch(() => {});

      this.cachedSubscriptionConfig = null;
      return { success: isSuccess, message };
    } catch (err: any) {
      return {
        success: false,
        message: `Could not reach RevenueCat server: ${err.message}`,
      };
    }
  }

  async getRecentWebhookEvents(limit = 30) {
    return this.prisma.webhookEvent.findMany({
      where: { provider: 'REVENUECAT' },
      take: Math.min(limit, 100),
      orderBy: { processedAt: 'desc' },
    });
  }

  async manualSubscriptionOverride(
    admin: { id: string; email: string },
    targetUserId: string,
    dto: {
      plan: 'PRO' | 'FREE' | 'TRIAL';
      durationDays?: number;
      reason: string;
    },
  ) {
    if (!dto.reason || dto.reason.trim().length < 3) {
      throw new BadRequestException(
        'A valid reason is required for manual subscription overrides.',
      );
    }

    let result: EntitlementsResponse;
    if (dto.plan === 'PRO' || dto.plan === 'TRIAL') {
      result = await this.activateSubscription({
        userId: targetUserId,
        plan: dto.plan,
        provider: 'ADMIN',
        durationDays: dto.durationDays || 30,
        source: 'ADMIN',
        metadata: {
          manualOverride: true,
          reason: dto.reason.trim(),
          authorizedBy: admin.email,
        },
      });
    } else {
      result = await this.downgradeToFree(targetUserId, 'ADMIN', dto.reason.trim());
    }

    await this.prisma.auditLog
      .create({
        data: {
          adminId: admin.id,
          adminEmail: admin.email,
          action: 'MANUAL_SUBSCRIPTION_OVERRIDE',
          targetType: 'USER',
          targetId: targetUserId,
          details: {
            plan: dto.plan,
            durationDays: dto.durationDays,
            reason: dto.reason.trim(),
          } as any,
        },
      })
      .catch(() => {});

    return result;
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

    // 1. Check for authoritative active subscription in Subscription table
    let activeSub: any = null;
    try {
      activeSub = await (this.prisma as any).subscription.findFirst({
        where: { userId, status: 'ACTIVE' },
        orderBy: { startedAt: 'desc' },
      });
    } catch {}

    let effectivePlan: 'FREE' | 'TRIAL' | 'PRO' | 'EXPIRED' | 'CANCELLED' = 'FREE';
    let subscriptionStatus: 'FREE' | 'TRIALING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' = 'FREE';
    let trialActive = false;
    let trialDaysRemaining = 0;
    let subStartedAt = user.subscriptionStartedAt;
    let subExpiresAt = user.subscriptionExpiresAt;
    let subCancelledAt = user.cancelledAt;
    let activeProvider = user.stripeCustomerId
      ? 'Stripe'
      : user.revenueCatAppUserId
      ? 'RevenueCat'
      : null;
    let activeSubId: string | null = null;
    let autoRenewing = true;

    if (activeSub) {
      activeSubId = activeSub.id;
      activeProvider = activeSub.provider;
      subStartedAt = activeSub.startedAt;
      subExpiresAt = activeSub.expiresAt;
      subCancelledAt = activeSub.cancelledAt;
      autoRenewing = activeSub.autoRenewing;

      // Check if this active subscription has reached its expiration date
      if (activeSub.expiresAt && activeSub.expiresAt.getTime() <= now.getTime()) {
        await (this.prisma as any).subscription
          .update({
            where: { id: activeSub.id },
            data: { status: 'EXPIRED' },
          })
          .catch(() => {});

        effectivePlan = 'EXPIRED';
        subscriptionStatus = 'EXPIRED';

        await this.prisma.user
          .update({
            where: { id: user.id },
            data: { plan: 'EXPIRED', subscriptionTier: 'FREE' },
          })
          .catch(() => {});
      } else {
        effectivePlan = activeSub.plan === 'TRIAL' ? 'TRIAL' : 'PRO';
        subscriptionStatus = activeSub.plan === 'TRIAL' ? 'TRIALING' : 'ACTIVE';

        // Keep User table in sync with authoritative active subscription
        if (
          user.plan !== effectivePlan ||
          user.subscriptionTier !== (effectivePlan === 'PRO' ? 'PRO' : 'FREE') ||
          user.cancelledAt !== null
        ) {
          await this.prisma.user
            .update({
              where: { id: user.id },
              data: {
                plan: effectivePlan,
                subscriptionTier: effectivePlan === 'PRO' ? 'PRO' : 'FREE',
                subscriptionStartedAt: activeSub.startedAt,
                subscriptionExpiresAt: activeSub.expiresAt,
                cancelledAt: activeSub.cancelledAt,
              },
            })
            .catch(() => {});
        }
      }
    } else {
      // No active Subscription table record: resolve directly from User table
      const userPlan = (user.plan as any) || 'FREE';

      if (userPlan === 'TRIAL') {
        if (user.trialEndsAt && user.trialEndsAt.getTime() <= now.getTime()) {
          effectivePlan = 'EXPIRED';
          subscriptionStatus = 'EXPIRED';
          await this.prisma.user
            .update({
              where: { id: user.id },
              data: { plan: 'EXPIRED', subscriptionTier: 'FREE' },
            })
            .catch(() => {});
        } else {
          effectivePlan = 'TRIAL';
          subscriptionStatus = 'TRIALING';
          trialActive = true;
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
      } else if (userPlan === 'PRO' || user.subscriptionTier === 'PRO') {
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
      } else if (userPlan === 'CANCELLED') {
        effectivePlan = 'CANCELLED';
        subscriptionStatus = 'CANCELLED';
      } else {
        effectivePlan = 'FREE';
        subscriptionStatus = 'FREE';
      }
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

    // Authoritative calculation of days remaining (clamped to non-negative integers)
    let subscriptionDaysRemaining = 0;
    if (effectivePlan === 'TRIAL') {
      trialActive = true;
      const tEnd = user.trialEndsAt || subExpiresAt;
      if (tEnd && tEnd.getTime() > now.getTime()) {
        trialDaysRemaining = Math.max(0, Math.ceil((tEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else {
        trialDaysRemaining = 0;
      }
    } else if (effectivePlan === 'PRO') {
      const pEnd = subExpiresAt || user.subscriptionExpiresAt;
      if (pEnd && pEnd.getTime() > now.getTime()) {
        subscriptionDaysRemaining = Math.max(0, Math.ceil((pEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      } else if (pEnd) {
        subscriptionDaysRemaining = 0;
      } else {
        subscriptionDaysRemaining = 30;
      }
    }

    const overallDaysRemaining = trialActive
      ? trialDaysRemaining
      : (effectivePlan === 'PRO' ? subscriptionDaysRemaining : 0);

    const expiresAt = trialActive
      ? (user.trialEndsAt || subExpiresAt)?.toISOString() || null
      : (effectivePlan === 'PRO' ? (subExpiresAt || user.subscriptionExpiresAt)?.toISOString() || null : null);

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
      isPro: effectivePlan === 'PRO' || effectivePlan === 'TRIAL',
      isTrialActive: trialActive,
      trialDaysRemaining,
      subscriptionDaysRemaining,
      daysRemaining: overallDaysRemaining,
      expiresAt,
      trial: {
        active: trialActive,
        startedAt: user.trialStartedAt,
        endsAt: user.trialEndsAt,
        daysRemaining: trialDaysRemaining,
      },
      subscription: {
        id: activeSubId,
        startedAt: subStartedAt,
        expiresAt: subExpiresAt,
        provider: activeProvider,
        cancelledAt: subCancelledAt,
        autoRenewing,
        daysRemaining: subscriptionDaysRemaining,
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
   * Authoritatively activates or renews a Pro/Trial subscription.
   * Closes prior active subscriptions, generates a new Subscription record,
   * clears any stale cancelledAt flags, updates user table, and records audit transition.
   */
  async activateSubscription(params: {
    userId: string;
    plan: 'PRO' | 'TRIAL';
    provider: 'REVENUECAT' | 'STRIPE' | 'IN_APP' | 'ADMIN' | 'PLAY_STORE' | 'APP_STORE';
    providerSubscriptionId?: string;
    paymentRef?: string;
    durationDays?: number;
    expiresAt?: Date | null;
    source: 'WEBHOOK' | 'PAYMENT_VERIFICATION' | 'ADMIN' | 'MANUAL_UPGRADE' | 'SYSTEM_RECONCILIATION';
    metadata?: any;
  }): Promise<EntitlementsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: params.userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    const calculatedExpiresAt =
      params.expiresAt !== undefined
        ? params.expiresAt
        : params.durationDays
        ? new Date(now.getTime() + params.durationDays * 24 * 60 * 60 * 1000)
        : null;

    // 1. Mark existing active subscriptions as SUPERSEDED / CANCELLED so there is only 1 active subscription
    await (this.prisma as any).subscription
      .updateMany({
        where: { userId: params.userId, status: 'ACTIVE' },
        data: { status: 'CANCELLED', cancelledAt: now },
      })
      .catch(() => {});

    // 2. Create authoritative Subscription record
    let newSubscription: any = null;
    try {
      newSubscription = await (this.prisma as any).subscription.create({
        data: {
          userId: params.userId,
          provider: params.provider,
          providerSubscriptionId: params.providerSubscriptionId || params.paymentRef || null,
          plan: params.plan,
          status: 'ACTIVE',
          startedAt: now,
          expiresAt: calculatedExpiresAt,
          cancelledAt: null,
          autoRenewing: true,
          metadata: params.metadata || {},
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not create Subscription record: ${e.message}`);
    }

    // 3. Update User table authoritatively:
    // IMPORTANT: Clear stale cancelledAt and set fresh subscriptionStartedAt & subscriptionExpiresAt!
    await this.prisma.user.update({
      where: { id: params.userId },
      data: {
        plan: params.plan,
        subscriptionTier: params.plan === 'PRO' ? 'PRO' : 'FREE',
        subscriptionStartedAt: now,
        subscriptionExpiresAt: calculatedExpiresAt,
        cancelledAt: null, // Clear any past cancellation flag!
      },
    });

    // 4. Log the subscription transition with full context
    this.logSubscriptionTransition({
      userId: params.userId,
      oldPlan: user.plan,
      newPlan: params.plan,
      event: 'ACTIVATE_SUBSCRIPTION',
      paymentRef: params.paymentRef,
      subscriptionId: newSubscription?.id || params.providerSubscriptionId,
      source: params.source,
      metadata: params.metadata,
    });

    return this.getUserEntitlements(params.userId);
  }

  /**
   * Authoritatively downgrades a user to Free tier.
   * Revokes active subscriptions in the Subscription table and clears expiry dates.
   */
  async downgradeToFree(
    userId: string,
    source: 'ADMIN' | 'SYSTEM_RECONCILIATION' | 'USER_CANCELLATION' | 'WEBHOOK' = 'ADMIN',
    reason?: string,
  ): Promise<EntitlementsResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();

    // Revoke all active subscriptions in Subscription table
    await (this.prisma as any).subscription
      .updateMany({
        where: { userId, status: 'ACTIVE' },
        data: { status: 'REVOKED', cancelledAt: now },
      })
      .catch(() => {});

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        plan: 'FREE',
        subscriptionTier: 'FREE',
        subscriptionExpiresAt: null,
        trialEndsAt: null,
      },
    });

    this.logSubscriptionTransition({
      userId,
      oldPlan: user.plan,
      newPlan: 'FREE',
      event: 'DOWNGRADE_TO_FREE',
      source,
      metadata: { reason },
    });

    return this.getUserEntitlements(userId);
  }

  /**
   * RevenueCat Webhook Handler with idempotency & out-of-order event protection.
   */
  async handleRevenueCatWebhook(payload: any, authHeader?: string) {
    const startTime = Date.now();
    const rawConfig = await this.getRawSubscriptionConfig();
    const decryptedSecret = decryptSecret(rawConfig.webhookAuthTokenEncrypted);
    const expectedSecret =
      decryptedSecret ||
      this.configService.get<string>('REVENUECAT_WEBHOOK_AUTH_TOKEN') ||
      '';

    if (expectedSecret && authHeader) {
      const cleanAuth = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : authHeader;
      if (cleanAuth !== expectedSecret) {
        this.logger.warn('Unauthorized RevenueCat webhook attempt');
        throw new UnauthorizedException('Invalid webhook authorization token');
      }
    }

    const event = payload?.event;
    if (!event) return { received: true };

    const eventId = event.id;
    const appUserId = event.app_user_id;
    const type = event.type;
    const eventTimeMs = event.event_timestamp_ms
      ? Number(event.event_timestamp_ms)
      : Date.now();

    // 1. Idempotency Check: if event was already processed, skip duplicate
    if (eventId) {
      try {
        const existingEvent = await (this.prisma as any).webhookEvent.findUnique({
          where: { eventId },
        });
        if (existingEvent) {
          this.logger.log(`Skipping duplicate RevenueCat webhook event: ${eventId}`);
          return { received: true, duplicate: true };
        }

        await (this.prisma as any).webhookEvent.create({
          data: {
            eventId,
            provider: 'REVENUECAT',
            eventType: type,
            userId: appUserId,
            status: 'PROCESSING',
            payload: event,
          },
        });
      } catch (err: any) {
        // Ignore duplicate key collision
      }
    }

    // 2. Locate User by id, email, or revenueCatAppUserId
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { id: appUserId },
          { revenueCatAppUserId: appUserId },
          { email: appUserId },
        ],
      },
    });

    if (!user) {
      this.logger.warn(`RevenueCat webhook user not found: ${appUserId}`);
      if (eventId) {
        await (this.prisma as any).webhookEvent
          .update({
            where: { eventId },
            data: {
              status: 'IGNORED',
              errorMessage: `User not found: ${appUserId}`,
              processingTimeMs: Date.now() - startTime,
            },
          })
          .catch(() => {});
      }
      return { received: true, userFound: false };
    }

    // 3. Out-of-order event check:
    // If user's current subscription was started AFTER this webhook event's timestamp,
    // and this event is a downgrade (EXPIRATION or CANCELLATION), ignore it!
    if (user.subscriptionStartedAt && user.subscriptionStartedAt.getTime() > eventTimeMs) {
      if (type === 'EXPIRATION' || type === 'CANCELLATION' || type === 'BILLING_ISSUE') {
        this.logger.warn(
          `Ignoring out-of-order RevenueCat event ${type} (${new Date(eventTimeMs).toISOString()}) because user has newer subscription started at ${user.subscriptionStartedAt.toISOString()}`,
        );
        if (eventId && (this.prisma as any).webhookEvent?.update) {
          await (this.prisma as any).webhookEvent
            .update({
              where: { eventId },
              data: {
                status: 'IGNORED',
                errorMessage: 'Out of order event suppressed',
                processingTimeMs: Date.now() - startTime,
              },
            })
            .catch(() => {});
        }
        return { received: true, ignored: 'out_of_order' };
      }
    }

    const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
    const originalTransactionId = event.original_transaction_id || event.transaction_id || eventId;
    const store = event.store || (event.product_id?.includes('ios') ? 'APP_STORE' : 'PLAY_STORE');

    if (
      type === 'INITIAL_PURCHASE' ||
      type === 'RENEWAL' ||
      type === 'PRODUCT_CHANGE' ||
      type === 'UNCANCELLATION' ||
      type === 'NON_RENEWING_PURCHASE' ||
      type === 'SUBSCRIPTION_EXTENDED'
    ) {
      await this.activateSubscription({
        userId: user.id,
        plan: 'PRO',
        provider: 'REVENUECAT',
        providerSubscriptionId: originalTransactionId,
        paymentRef: event.transaction_id,
        expiresAt,
        source: 'WEBHOOK',
        metadata: {
          store,
          productId: event.product_id,
          entitlementId: event.entitlement_id || event.entitlement_ids?.[0] || 'pro',
          currency: event.currency,
          price: event.price_in_purchased_currency,
          environment: event.environment || 'PRODUCTION',
        },
      });
    } else if (type === 'CANCELLATION') {
      // In RevenueCat, CANCELLATION means auto-renew is off, but Pro remains until expiresAt!
      await (this.prisma as any).subscription
        .updateMany({
          where: { userId: user.id, status: 'ACTIVE' },
          data: { autoRenewing: false, cancelledAt: new Date() },
        })
        .catch(() => {});

      await this.prisma.user
        .update({
          where: { id: user.id },
          data: { cancelledAt: new Date() },
        })
        .catch(() => {});

      this.logSubscriptionTransition({
        userId: user.id,
        oldPlan: user.plan,
        newPlan: user.plan,
        event: 'REVENUECAT_CANCELLATION',
        paymentRef: originalTransactionId,
        source: 'WEBHOOK',
        metadata: { reason: event.cancel_reason },
      });
    } else if (type === 'EXPIRATION' || type === 'REVOCATION') {
      await this.downgradeToFree(
        user.id,
        'WEBHOOK',
        type === 'REVOCATION' ? 'Subscription revoked/refunded in store' : 'Subscription expired in RevenueCat',
      );
    } else if (type === 'BILLING_ISSUE') {
      const gracePeriodExpiresAt = event.grace_period_expiration_at_ms
        ? new Date(event.grace_period_expiration_at_ms)
        : null;

      await (this.prisma as any).subscription
        .updateMany({
          where: { userId: user.id, status: 'ACTIVE' },
          data: { status: 'BILLING_ISSUE', gracePeriodExpiresAt },
        })
        .catch(() => {});

      this.logSubscriptionTransition({
        userId: user.id,
        oldPlan: user.plan,
        newPlan: user.plan,
        event: 'REVENUECAT_BILLING_ISSUE',
        paymentRef: originalTransactionId,
        source: 'WEBHOOK',
        metadata: { gracePeriodExpiresAt },
      });
    }

    if (eventId && (this.prisma as any).webhookEvent?.update) {
      await (this.prisma as any).webhookEvent
        .update({
          where: { eventId },
          data: {
            status: 'SUCCESS',
            processingTimeMs: Date.now() - startTime,
          },
        })
        .catch(() => {});
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
    if (tier === 'PRO') {
      return this.activateSubscription({
        userId,
        plan: 'PRO',
        provider: 'IN_APP',
        source: 'MANUAL_UPGRADE',
      });
    } else {
      return this.downgradeToFree(userId, 'ADMIN');
    }
  }
}
