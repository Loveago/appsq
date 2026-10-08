import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { PrismaService } from '../../database/prisma.service';

describe('BillingService - Subscription Synchronization & Lifecycle Audit', () => {
  let service: BillingService;

  let mockUser: any;
  let mockSubscriptions: any[];
  let mockWebhookEvents: any[];
  let mockUsageRecords: any[];

  const resetDb = () => {
    mockUser = {
      id: 'test-user-123',
      email: 'alex@mindora.ai',
      fullName: 'Alex Executive',
      plan: 'FREE',
      subscriptionTier: 'FREE',
      accountStatus: 'ACTIVE',
      isSuspended: false,
      trialStartedAt: null,
      trialEndsAt: null,
      subscriptionStartedAt: null,
      subscriptionExpiresAt: null,
      cancelledAt: null,
      stripeCustomerId: null,
      revenueCatAppUserId: 'rc_user_123',
      createdAt: new Date('2026-01-01'),
      lastLoginAt: new Date(),
      monthlyAiTokensUsed: 0,
    };
    mockSubscriptions = [];
    mockWebhookEvents = [];
    mockUsageRecords = [];
  };

  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
        if (where.id === mockUser.id) return { ...mockUser };
        return null;
      }),
      findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
        const or = where.OR || [];
        for (const cond of or) {
          if (cond.id === mockUser.id) return { ...mockUser };
          if (cond.revenueCatAppUserId === mockUser.revenueCatAppUserId) return { ...mockUser };
          if (cond.email === mockUser.email) return { ...mockUser };
        }
        return null;
      }),
      update: jest.fn().mockImplementation(async ({ data }: any) => {
        mockUser = { ...mockUser, ...data };
        return { ...mockUser };
      }),
      updateMany: jest.fn().mockImplementation(async ({ data }: any) => {
        mockUser = { ...mockUser, ...data };
        return { count: 1 };
      }),
    },
    subscription: {
      findFirst: jest.fn().mockImplementation(async ({ where }: any) => {
        const matching = mockSubscriptions.filter(
          (s) => s.userId === where.userId && (where.status ? s.status === where.status : true),
        );
        return matching.length > 0 ? { ...matching[matching.length - 1] } : null;
      }),
      create: jest.fn().mockImplementation(async ({ data }: any) => {
        const record = { id: `sub_${Date.now()}_${Math.random()}`, ...data };
        mockSubscriptions.push(record);
        return { ...record };
      }),
      update: jest.fn().mockImplementation(async ({ where, data }: any) => {
        const idx = mockSubscriptions.findIndex((s) => s.id === where.id);
        if (idx >= 0) {
          mockSubscriptions[idx] = { ...mockSubscriptions[idx], ...data };
          return { ...mockSubscriptions[idx] };
        }
        return null;
      }),
      updateMany: jest.fn().mockImplementation(async ({ where, data }: any) => {
        let count = 0;
        for (let i = 0; i < mockSubscriptions.length; i++) {
          if (
            mockSubscriptions[i].userId === where.userId &&
            (where.status ? mockSubscriptions[i].status === where.status : true)
          ) {
            mockSubscriptions[i] = { ...mockSubscriptions[i], ...data };
            count++;
          }
        }
        return { count };
      }),
    },
    webhookEvent: {
      findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
        return mockWebhookEvents.find((e) => e.eventId === where.eventId) || null;
      }),
      create: jest.fn().mockImplementation(async ({ data }: any) => {
        mockWebhookEvents.push({ ...data });
        return { ...data };
      }),
    },
    systemSetting: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    usageRecord: {
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 0 } }),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      if (key === 'REVENUECAT_WEBHOOK_AUTH_TOKEN') return 'secret_test_token';
      return null;
    }),
  };

  beforeEach(async () => {
    resetDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  // ========================================================
  // TEST 1: Free → Pro
  // ========================================================
  it('TEST 1: Upgrades Free user to Pro with active subscription record and entitlements', async () => {
    expect(mockUser.plan).toBe('FREE');
    const entBefore = await service.getUserEntitlements(mockUser.id);
    expect(entBefore.plan).toBe('FREE');
    expect(entBefore.subscriptionStatus).toBe('FREE');

    const entAfter = await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      providerSubscriptionId: 'tx_apple_1001',
      source: 'PAYMENT_VERIFICATION',
    });

    expect(entAfter.plan).toBe('PRO');
    expect(entAfter.subscriptionStatus).toBe('ACTIVE');
    expect(mockUser.plan).toBe('PRO');
    expect(mockUser.subscriptionTier).toBe('PRO');
    expect(mockSubscriptions.length).toBe(1);
    expect(mockSubscriptions[0].status).toBe('ACTIVE');
  });

  // ========================================================
  // TEST 2: Pro → Free by admin → Pro again by user
  // ========================================================
  it('TEST 2: Re-subscribing after admin downgrade does NOT stay Free; cleanly transitions back to Pro', async () => {
    // 1. Initial Pro
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      providerSubscriptionId: 'first_sub_100',
      durationDays: 30,
      source: 'PAYMENT_VERIFICATION',
    });
    expect(mockUser.plan).toBe('PRO');

    // 2. Admin reverts to Free
    await service.downgradeToFree(mockUser.id, 'ADMIN', 'Manual revert test');
    const adminFreeEnt = await service.getUserEntitlements(mockUser.id);
    expect(adminFreeEnt.plan).toBe('FREE');
    expect(adminFreeEnt.subscriptionStatus).toBe('FREE');
    expect(mockUser.plan).toBe('FREE');
    expect(mockSubscriptions[0].status).toBe('REVOKED');

    // 3. User subscribes to Pro again
    const reSubEnt = await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      providerSubscriptionId: 'second_sub_200',
      durationDays: 30,
      source: 'PAYMENT_VERIFICATION',
    });

    expect(reSubEnt.plan).toBe('PRO');
    expect(reSubEnt.subscriptionStatus).toBe('ACTIVE');
    expect(mockUser.plan).toBe('PRO');
    expect(mockUser.subscriptionExpiresAt).not.toBeNull();
    // Expiration must be in the future, not holding old date
    expect(mockUser.subscriptionExpiresAt!.getTime()).toBeGreaterThan(Date.now());
  });

  // ========================================================
  // TEST 3: Pro → Free → logout/login → Pro
  // ========================================================
  it('TEST 3: Session re-authentication yields accurate authoritative state', async () => {
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'STRIPE',
      source: 'PAYMENT_VERIFICATION',
    });
    await service.downgradeToFree(mockUser.id, 'ADMIN');

    // Simulate session reload
    const sessionEnt = await service.getUserEntitlements(mockUser.id);
    expect(sessionEnt.plan).toBe('FREE');

    // Re-subscribe
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'STRIPE',
      source: 'PAYMENT_VERIFICATION',
    });

    // Simulate login session recovery
    const loggedInEnt = await service.getUserEntitlements(mockUser.id);
    expect(loggedInEnt.plan).toBe('PRO');
    expect(loggedInEnt.subscriptionStatus).toBe('ACTIVE');
  });

  // ========================================================
  // TEST 4: Pro → admin Free → app reload → Free
  // ========================================================
  it('TEST 4: Admin Free immediately invalidates Pro across app reload', async () => {
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      source: 'PAYMENT_VERIFICATION',
    });
    expect((await service.getUserEntitlements(mockUser.id)).plan).toBe('PRO');

    await service.downgradeToFree(mockUser.id, 'ADMIN');

    // App reload simulation
    const freshFetch = await service.getUserEntitlements(mockUser.id);
    expect(freshFetch.plan).toBe('FREE');
    expect(freshFetch.subscriptionStatus).toBe('FREE');
  });

  // ========================================================
  // TEST 5: Pro → cancel → resubscribe → Pro
  // ========================================================
  it('TEST 5: Cancellation preserves Pro until expiry, and resubscribe clears cancelledAt flag', async () => {
    const futureExpiry = new Date(Date.now() + 15 * 86400000);
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'REVENUECAT',
      providerSubscriptionId: 'rc_sub_initial',
      expiresAt: futureExpiry,
      source: 'WEBHOOK',
    });

    // Webhook sends cancellation (auto-renew off)
    await service.handleRevenueCatWebhook({
      event: {
        id: 'evt_cancel_1',
        app_user_id: mockUser.revenueCatAppUserId,
        type: 'CANCELLATION',
        event_timestamp_ms: Date.now(),
        expiration_at_ms: futureExpiry.getTime(),
        cancel_reason: 'UNSUBSCRIBE',
      },
    });

    // Active subscription remains Pro until expiry
    const cancelledEnt = await service.getUserEntitlements(mockUser.id);
    expect(cancelledEnt.plan).toBe('PRO');
    expect(mockUser.cancelledAt).not.toBeNull();

    // User resubscribes before or after expiry
    const resubEnt = await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'REVENUECAT',
      providerSubscriptionId: 'rc_sub_new_order',
      source: 'PAYMENT_VERIFICATION',
    });

    expect(resubEnt.plan).toBe('PRO');
    expect(mockUser.cancelledAt).toBeNull(); // Stale cancelled flag cleared!
  });

  // ========================================================
  // TEST 6: Payment succeeds but webhook is delayed
  // ========================================================
  it('TEST 6: Immediate client verification succeeds before webhook arrives', async () => {
    // Client verifies purchase directly with backend
    const clientVerifyEnt = await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'PLAY_STORE',
      providerSubscriptionId: 'GPA.1234-5678',
      source: 'PAYMENT_VERIFICATION',
    });
    expect(clientVerifyEnt.plan).toBe('PRO');

    // Delayed webhook arrives later
    const webhookRes = await service.handleRevenueCatWebhook({
      event: {
        id: 'evt_delayed_webhook_1',
        app_user_id: mockUser.revenueCatAppUserId,
        type: 'INITIAL_PURCHASE',
        event_timestamp_ms: Date.now() + 5000,
        transaction_id: 'GPA.1234-5678',
      },
    });
    expect(webhookRes.success).toBe(true);

    const finalEnt = await service.getUserEntitlements(mockUser.id);
    expect(finalEnt.plan).toBe('PRO');
  });

  // ========================================================
  // TEST 7: Webhook arrives more than once (Idempotency)
  // ========================================================
  it('TEST 7: Duplicate webhook events are deduplicated idempotently', async () => {
    const payload = {
      event: {
        id: 'evt_duplicate_test_1',
        app_user_id: mockUser.revenueCatAppUserId,
        type: 'INITIAL_PURCHASE',
        event_timestamp_ms: Date.now(),
      },
    };

    const first = await service.handleRevenueCatWebhook(payload);
    expect(first.success).toBe(true);

    const second = await service.handleRevenueCatWebhook(payload);
    expect(second.duplicate).toBe(true);
  });

  // ========================================================
  // TEST 8: Old webhook arrives after a newer subscription event
  // ========================================================
  it('TEST 8: Stale/out-of-order webhook does NOT downgrade newer active subscription', async () => {
    const now = Date.now();

    // User is on active Pro subscription started NOW
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      source: 'PAYMENT_VERIFICATION',
    });

    // Old EXPIRATION event from 2 days ago arrives late
    const lateWebhookRes = await service.handleRevenueCatWebhook({
      event: {
        id: 'evt_stale_expiration',
        app_user_id: mockUser.revenueCatAppUserId,
        type: 'EXPIRATION',
        event_timestamp_ms: now - 2 * 86400000, // 2 days in the past
      },
    });

    expect(lateWebhookRes.ignored).toBe('out_of_order');
    const ent = await service.getUserEntitlements(mockUser.id);
    expect(ent.plan).toBe('PRO'); // NOT downgraded!
  });

  // ========================================================
  // TEST 9: Payment completes then app closes/reopens
  // ========================================================
  it('TEST 9: App closing and reopening reliably reflects server database truth', async () => {
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'APP_STORE',
      providerSubscriptionId: 'tx_app_store_99',
      source: 'PAYMENT_VERIFICATION',
    });

    // Simulate fresh launch without local cache
    const freshAppLaunchEnt = await service.getUserEntitlements(mockUser.id);
    expect(freshAppLaunchEnt.plan).toBe('PRO');
    expect(freshAppLaunchEnt.limits.meetingMode).toBe(true);
    expect(freshAppLaunchEnt.limits.aiMessages).toBeGreaterThan(50);
  });

  // ========================================================
  // TEST 10: Admin changes subscription while user is active in app
  // ========================================================
  it('TEST 10: Live admin plan change propagates to next entitlement check immediately', async () => {
    await service.activateSubscription({
      userId: mockUser.id,
      plan: 'PRO',
      provider: 'IN_APP',
      source: 'PAYMENT_VERIFICATION',
    });

    // User is chatting/using app -> Admin switches them to FREE
    await service.downgradeToFree(mockUser.id, 'ADMIN');

    // Next polling or feature call receives FREE authoritatively
    const nextPoll = await service.getUserEntitlements(mockUser.id);
    expect(nextPoll.plan).toBe('FREE');
    expect(nextPoll.subscriptionStatus).toBe('FREE');
    expect(nextPoll.limits.meetingMode).toBe(false);
  });
});
