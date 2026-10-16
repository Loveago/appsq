import { Test, TestingModule } from '@nestjs/testing';
import { AdsService } from './ads.service';
import { PrismaService } from '../../database/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  DEFAULT_ADMOB_CONFIG,
  GOOGLE_TEST_APP_ID_ANDROID,
  GOOGLE_TEST_APP_ID_IOS,
  GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
  GOOGLE_TEST_BANNER_UNIT_ID_IOS,
} from './interfaces/ad-config.interface';

describe('AdsService - AdMob Monetization & Governance', () => {
  let service: AdsService;
  let mockStore: any;
  let mockAuditLogs: any[];

  beforeEach(async () => {
    mockStore = null;
    mockAuditLogs = [];

    const mockPrisma = {
      systemSetting: {
        findUnique: jest.fn().mockImplementation(async ({ where }: any) => {
          if (where.key === 'admob_config') {
            return mockStore ? { key: 'admob_config', value: mockStore } : null;
          }
          return null;
        }),
        upsert: jest.fn().mockImplementation(async ({ create, update }: any) => {
          mockStore = update ? update.value : create.value;
          return { key: 'admob_config', value: mockStore };
        }),
      },
      auditLog: {
        create: jest.fn().mockImplementation(async ({ data }: any) => {
          mockAuditLogs.push(data);
          return data;
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdsService>(AdsService);
  });

  describe('Validation & Safety Checks', () => {
    it('should validate valid Google test IDs', () => {
      const config = {
        ...DEFAULT_ADMOB_CONFIG,
        isEnabled: true,
      };
      const result = service.validateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should catch invalid App IDs and Banner Unit IDs', () => {
      const config = {
        ...DEFAULT_ADMOB_CONFIG,
        isEnabled: true,
        androidAppId: 'invalid-app-id',
        androidDefaultBannerUnitId: 'ca-app-pub-invalid',
      };
      const result = service.validateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes('Android AdMob App ID'))).toBe(true);
      expect(result.errors.some((e) => e.includes('Android Default Banner Unit ID'))).toBe(true);
    });

    it('should warn when production mode is active with test IDs', () => {
      const config = {
        ...DEFAULT_ADMOB_CONFIG,
        isEnabled: true,
        testMode: false, // Production mode
        androidAppId: GOOGLE_TEST_APP_ID_ANDROID,
        androidDefaultBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
      };
      const result = service.validateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.isProductionSafe).toBe(false);
      expect(result.warnings.some((w) => w.includes('Google test sample IDs'))).toBe(true);
    });
  });

  describe('Draft & Publish Workflow', () => {
    const mockAdmin = { id: 'admin-1', email: 'admin@mindora.ai' };

    it('should return default config when uninitialized', async () => {
      const adminConfig = await service.getAdminConfig();
      expect(adminConfig.published.version).toBe(1);
      expect(adminConfig.published.isEnabled).toBe(false);
      expect(adminConfig.draft.isEnabled).toBe(false);
      expect(adminConfig.history).toHaveLength(0);
    });

    it('should save draft without immediately altering published configuration', async () => {
      await service.saveDraft(mockAdmin, {
        isEnabled: true,
        testMode: true,
      });

      const config = await service.getAdminConfig();
      expect(config.draft.isEnabled).toBe(true);
      expect(config.published.isEnabled).toBe(false); // Published unchanged
      expect(mockAuditLogs.some((l) => l.action === 'SAVE_ADMOB_DRAFT')).toBe(true);
    });

    it('should reject publishing if draft has invalid IDs when enabled', async () => {
      await service.saveDraft(mockAdmin, {
        isEnabled: true,
        androidAppId: 'invalid_app_id',
      });

      await expect(service.publish(mockAdmin, 'Testing publish')).rejects.toThrow(BadRequestException);
    });

    it('should publish draft, increment version, and record history and audit log', async () => {
      await service.saveDraft(mockAdmin, {
        isEnabled: true,
        testMode: true,
      });

      const publishResult = await service.publish(mockAdmin, 'Enabled banner test ads');
      expect(publishResult.published.version).toBe(2);
      expect(publishResult.published.isEnabled).toBe(true);
      expect(publishResult.history).toHaveLength(1);
      expect(publishResult.history[0].version).toBe(1);
      expect(mockAuditLogs.some((l) => l.action === 'PUBLISH_ADMOB_CONFIG')).toBe(true);
    });

    it('should revert published configuration to a prior version', async () => {
      // 1. Publish v2 (enabled)
      await service.saveDraft(mockAdmin, { isEnabled: true });
      await service.publish(mockAdmin, 'Release v2');

      // 2. Publish v3 (disabled)
      await service.saveDraft(mockAdmin, { isEnabled: false });
      await service.publish(mockAdmin, 'Release v3');

      // Verify v3 is published and disabled
      let cfg = await service.getAdminConfig();
      expect(cfg.published.version).toBe(3);
      expect(cfg.published.isEnabled).toBe(false);

      // 3. Revert to v2
      const revertResult = await service.revert(mockAdmin, 2);
      expect(revertResult.published.version).toBe(4);
      expect(revertResult.published.isEnabled).toBe(true);
      expect(revertResult.revertedFrom).toBe(2);
      expect(mockAuditLogs.some((l) => l.action === 'REVERT_ADMOB_CONFIG')).toBe(true);
    });
  });

  describe('Public Client Endpoint & Pro Immunity Guarantee', () => {
    const mockAdmin = { id: 'admin-1', email: 'admin@mindora.ai' };

    it('should strictly limit eligiblePlans to FREE to guarantee Pro subscribers receive no ads', async () => {
      await service.saveDraft(mockAdmin, { isEnabled: true });
      await service.publish(mockAdmin);

      const publicConfig = await service.getPublicConfig('android');
      expect(publicConfig.eligiblePlans).toEqual(['FREE']);
      expect(publicConfig.eligiblePlans).not.toContain('PRO');
      expect(publicConfig.eligiblePlans).not.toContain('TRIAL');
    });

    it('should return platform-specific banner IDs for Android and iOS', async () => {
      await service.saveDraft(mockAdmin, {
        isEnabled: true,
        androidEnabled: true,
        iosEnabled: true,
        androidAppId: GOOGLE_TEST_APP_ID_ANDROID,
        iosAppId: GOOGLE_TEST_APP_ID_IOS,
        androidDefaultBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
        iosDefaultBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_IOS,
      });
      await service.publish(mockAdmin);

      const androidConfig = await service.getPublicConfig('android');
      expect(androidConfig.appId).toBe(GOOGLE_TEST_APP_ID_ANDROID);
      expect(androidConfig.defaultBannerUnitId).toBe(GOOGLE_TEST_BANNER_UNIT_ID_ANDROID);

      const iosConfig = await service.getPublicConfig('ios');
      expect(iosConfig.appId).toBe(GOOGLE_TEST_APP_ID_IOS);
      expect(iosConfig.defaultBannerUnitId).toBe(GOOGLE_TEST_BANNER_UNIT_ID_IOS);
    });

    it('should report isEnabled: false when platform-specific toggle is turned off', async () => {
      await service.saveDraft(mockAdmin, {
        isEnabled: true,
        androidEnabled: true,
        iosEnabled: false, // iOS disabled
      });
      await service.publish(mockAdmin);

      const androidConfig = await service.getPublicConfig('android');
      expect(androidConfig.isEnabled).toBe(true);

      const iosConfig = await service.getPublicConfig('ios');
      expect(iosConfig.isEnabled).toBe(false);
    });
  });
});
