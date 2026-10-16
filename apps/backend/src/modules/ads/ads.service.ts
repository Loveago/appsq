import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  AdMobConfig,
  AdMobSettingsStore,
  AdConfigHistoryEntry,
  AdMobPublicConfig,
  DEFAULT_ADMOB_CONFIG,
  GOOGLE_TEST_APP_ID_ANDROID,
  GOOGLE_TEST_APP_ID_IOS,
  GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
  GOOGLE_TEST_BANNER_UNIT_ID_IOS,
} from './interfaces/ad-config.interface';

const SETTING_KEY = 'admob_config';
const APP_ID_REGEX = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID_REGEX = /^ca-app-pub-\d{16}\/\d{10}$/;

export interface AdValidationResult {
  isValid: boolean;
  errors: string[];
  isProductionSafe: boolean;
  warnings: string[];
}

@Injectable()
export class AdsService {
  private readonly logger = new Logger(AdsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Validates AdMob App ID and Unit IDs
   */
  public validateConfig(config: AdMobConfig): AdValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Format validation if enabled
    if (config.isEnabled) {
      if (config.androidEnabled) {
        if (!config.androidAppId || !APP_ID_REGEX.test(config.androidAppId.trim())) {
          errors.push('Android AdMob App ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX');
        }
        if (!config.androidDefaultBannerUnitId || !UNIT_ID_REGEX.test(config.androidDefaultBannerUnitId.trim())) {
          errors.push('Android Default Banner Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
        if (config.placements?.home_dashboard?.androidUnitId && !UNIT_ID_REGEX.test(config.placements.home_dashboard.androidUnitId.trim())) {
          errors.push('Home Dashboard Android Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
        if (config.placements?.notes_list?.androidUnitId && !UNIT_ID_REGEX.test(config.placements.notes_list.androidUnitId.trim())) {
          errors.push('Notes List Android Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
      }

      if (config.iosEnabled) {
        if (!config.iosAppId || !APP_ID_REGEX.test(config.iosAppId.trim())) {
          errors.push('iOS AdMob App ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX');
        }
        if (!config.iosDefaultBannerUnitId || !UNIT_ID_REGEX.test(config.iosDefaultBannerUnitId.trim())) {
          errors.push('iOS Default Banner Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
        if (config.placements?.home_dashboard?.iosUnitId && !UNIT_ID_REGEX.test(config.placements.home_dashboard.iosUnitId.trim())) {
          errors.push('Home Dashboard iOS Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
        if (config.placements?.notes_list?.iosUnitId && !UNIT_ID_REGEX.test(config.placements.notes_list.iosUnitId.trim())) {
          errors.push('Notes List iOS Unit ID must match format: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX');
        }
      }
    }

    // Production safety warnings
    let isProductionSafe = true;
    if (config.isEnabled && !config.testMode) {
      const isTestAndroid = config.androidAppId === GOOGLE_TEST_APP_ID_ANDROID || config.androidDefaultBannerUnitId === GOOGLE_TEST_BANNER_UNIT_ID_ANDROID;
      const isTestIos = config.iosAppId === GOOGLE_TEST_APP_ID_IOS || config.iosDefaultBannerUnitId === GOOGLE_TEST_BANNER_UNIT_ID_IOS;
      if (isTestAndroid || isTestIos) {
        warnings.push('Production mode is active, but Google test sample IDs are still being used. Live ads will not serve.');
        isProductionSafe = false;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      isProductionSafe,
      warnings,
    };
  }

  /**
   * Computes the operational status of a configuration
   */
  public computeStatus(config: AdMobConfig): 'ENABLED' | 'DISABLED' | 'TEST_MODE' | 'AWAITING_CONFIG' {
    if (!config.isEnabled) return 'DISABLED';
    if (config.testMode) return 'TEST_MODE';
    const validation = this.validateConfig(config);
    if (!validation.isValid) return 'AWAITING_CONFIG';
    return 'ENABLED';
  }

  /**
   * Internal helper to load full store from database
   */
  private async loadStore(): Promise<AdMobSettingsStore> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });

      if (!setting || !setting.value) {
        return {
          published: { ...DEFAULT_ADMOB_CONFIG },
          draft: { ...DEFAULT_ADMOB_CONFIG },
          history: [],
        };
      }

      const raw = setting.value as any;
      const published = { ...DEFAULT_ADMOB_CONFIG, ...(raw.published || {}) };
      const draft = { ...DEFAULT_ADMOB_CONFIG, ...(raw.draft || {}) };
      const history = Array.isArray(raw.history) ? raw.history : [];

      published.status = this.computeStatus(published);
      draft.status = this.computeStatus(draft);

      return { published, draft, history };
    } catch (err) {
      this.logger.error(`Error loading admob_config store: ${err.message}`, err.stack);
      return {
        published: { ...DEFAULT_ADMOB_CONFIG },
        draft: { ...DEFAULT_ADMOB_CONFIG },
        history: [],
      };
    }
  }

  /**
   * Admin: Get full management details including draft, published, and history
   */
  async getAdminConfig() {
    const store = await this.loadStore();
    const validation = this.validateConfig(store.draft);
    return {
      published: store.published,
      draft: store.draft,
      history: store.history,
      validation,
      googleTestConstants: {
        androidAppId: GOOGLE_TEST_APP_ID_ANDROID,
        iosAppId: GOOGLE_TEST_APP_ID_IOS,
        androidBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
        iosBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_IOS,
      },
    };
  }

  /**
   * Admin: Save draft configuration
   */
  async saveDraft(admin: any, draftDto: Partial<AdMobConfig>) {
    const store = await this.loadStore();
    const currentDraft = store.draft;

    const mergedDraft: AdMobConfig = {
      ...currentDraft,
      ...draftDto,
      placements: {
        home_dashboard: {
          ...currentDraft.placements.home_dashboard,
          ...(draftDto.placements?.home_dashboard || {}),
        },
        notes_list: {
          ...currentDraft.placements.notes_list,
          ...(draftDto.placements?.notes_list || {}),
        },
      },
      updatedAt: new Date().toISOString(),
      updatedBy: admin?.email || admin?.id || 'admin',
    };

    mergedDraft.status = this.computeStatus(mergedDraft);
    store.draft = mergedDraft;

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: store as any, description: 'Banner advertising and AdMob administrative configuration' },
      create: { key: SETTING_KEY, value: store as any, description: 'Banner advertising and AdMob administrative configuration' },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId: admin?.id || 'system',
        adminEmail: admin?.email || 'admin@mindora.ai',
        action: 'SAVE_ADMOB_DRAFT',
        targetType: 'SETTING',
        targetId: SETTING_KEY,
        details: { draftVersion: mergedDraft.version, isEnabled: mergedDraft.isEnabled, testMode: mergedDraft.testMode } as any,
      },
    }).catch(() => {});

    return {
      draft: mergedDraft,
      validation: this.validateConfig(mergedDraft),
    };
  }

  /**
   * Admin: Publish the draft configuration to live production/testing
   */
  async publish(admin: any, reason?: string) {
    const store = await this.loadStore();
    const draft = store.draft;

    // Validate before publish if enabled
    const validation = this.validateConfig(draft);
    if (!validation.isValid && draft.isEnabled) {
      throw new BadRequestException(
        `Cannot publish invalid AdMob configuration: ${validation.errors.join('; ')}`
      );
    }

    const previousPublished = store.published;
    const newVersion = (previousPublished.version || 0) + 1;

    const now = new Date().toISOString();
    const publishedBy = admin?.email || admin?.id || 'admin';

    const publishedConfig: AdMobConfig = {
      ...draft,
      version: newVersion,
      publishedAt: now,
      publishedBy,
      updatedAt: now,
      updatedBy: publishedBy,
      status: this.computeStatus(draft),
    };

    // Save previous to history
    const historyEntry: AdConfigHistoryEntry = {
      version: previousPublished.version,
      config: previousPublished,
      publishedAt: previousPublished.publishedAt || now,
      publishedBy: previousPublished.publishedBy || 'system',
      reason: reason || 'Published updated AdMob configuration',
    };

    store.history = [historyEntry, ...store.history.slice(0, 19)]; // Keep last 20
    store.published = publishedConfig;
    store.draft = { ...publishedConfig };

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: store as any, description: 'Banner advertising and AdMob administrative configuration' },
      create: { key: SETTING_KEY, value: store as any, description: 'Banner advertising and AdMob administrative configuration' },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId: admin?.id || 'system',
        adminEmail: publishedBy,
        action: 'PUBLISH_ADMOB_CONFIG',
        targetType: 'SETTING',
        targetId: SETTING_KEY,
        details: {
          version: newVersion,
          isEnabled: publishedConfig.isEnabled,
          testMode: publishedConfig.testMode,
          reason,
        } as any,
      },
    }).catch(() => {});

    this.logger.log(`AdMob config v${newVersion} successfully published by ${publishedBy}`);

    return {
      published: publishedConfig,
      history: store.history,
    };
  }

  /**
   * Admin: Revert to a previous version from history
   */
  async revert(admin: any, targetVersion?: number) {
    const store = await this.loadStore();
    if (!store.history || store.history.length === 0) {
      throw new BadRequestException('No previous published version found in history to revert to.');
    }

    let targetEntry: AdConfigHistoryEntry | undefined;
    if (targetVersion) {
      targetEntry = store.history.find((h) => h.version === targetVersion);
      if (!targetEntry) {
        throw new NotFoundException(`AdMob version ${targetVersion} not found in history`);
      }
    } else {
      targetEntry = store.history[0];
    }

    const now = new Date().toISOString();
    const adminUser = admin?.email || admin?.id || 'admin';
    const restoredVersion = store.published.version + 1;

    const restoredConfig: AdMobConfig = {
      ...targetEntry.config,
      version: restoredVersion,
      publishedAt: now,
      publishedBy: adminUser,
      updatedAt: now,
      updatedBy: adminUser,
      status: this.computeStatus(targetEntry.config),
    };

    // Archive current published before reverting
    store.history = [
      {
        version: store.published.version,
        config: store.published,
        publishedAt: store.published.publishedAt || now,
        publishedBy: store.published.publishedBy || 'system',
        reason: `Replaced by revert to v${targetEntry.version}`,
      },
      ...store.history.filter((h) => h.version !== targetEntry!.version).slice(0, 18),
    ];

    store.published = restoredConfig;
    store.draft = { ...restoredConfig };

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: store as any },
      create: { key: SETTING_KEY, value: store as any },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId: admin?.id || 'system',
        adminEmail: adminUser,
        action: 'REVERT_ADMOB_CONFIG',
        targetType: 'SETTING',
        targetId: SETTING_KEY,
        details: {
          revertedToVersion: targetEntry.version,
          newPublishedVersion: restoredVersion,
        } as any,
      },
    }).catch(() => {});

    return {
      published: restoredConfig,
      revertedFrom: targetEntry.version,
      history: store.history,
    };
  }

  /**
   * Public Mobile Endpoint: Returns sanitized operational banner ad configuration
   * Only returns FREE tier in eligiblePlans to guarantee Pro subscribers NEVER see ads.
   */
  async getPublicConfig(platform?: string): Promise<AdMobPublicConfig> {
    const store = await this.loadStore();
    const pub = store.published;

    const isIos = platform?.toLowerCase() === 'ios';
    const platformEnabled = isIos ? pub.iosEnabled : pub.androidEnabled;
    const isGloballyEnabled = pub.isEnabled && platformEnabled;

    const appId = isIos ? (pub.iosAppId || GOOGLE_TEST_APP_ID_IOS) : (pub.androidAppId || GOOGLE_TEST_APP_ID_ANDROID);
    const defaultBannerUnitId = isIos
      ? (pub.iosDefaultBannerUnitId || GOOGLE_TEST_BANNER_UNIT_ID_IOS)
      : (pub.androidDefaultBannerUnitId || GOOGLE_TEST_BANNER_UNIT_ID_ANDROID);

    const homeUnitId = isIos
      ? (pub.placements.home_dashboard.iosUnitId || defaultBannerUnitId)
      : (pub.placements.home_dashboard.androidUnitId || defaultBannerUnitId);

    const notesUnitId = isIos
      ? (pub.placements.notes_list.iosUnitId || defaultBannerUnitId)
      : (pub.placements.notes_list.androidUnitId || defaultBannerUnitId);

    return {
      isEnabled: isGloballyEnabled,
      testMode: pub.testMode,
      appId,
      defaultBannerUnitId,
      placements: {
        home_dashboard: {
          enabled: isGloballyEnabled && pub.placements.home_dashboard.enabled,
          adUnitId: homeUnitId,
        },
        notes_list: {
          enabled: isGloballyEnabled && pub.placements.notes_list.enabled,
          adUnitId: notesUnitId,
        },
      },
      eligiblePlans: ['FREE'], // Strictly FREE tier; Pro and Trial are never eligible
      version: pub.version,
      refreshIntervalSec: pub.refreshIntervalSec || 300,
      timestamp: new Date().toISOString(),
    };
  }
}
