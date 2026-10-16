export interface AdPlacementConfig {
  enabled: boolean;
  androidUnitId?: string;
  iosUnitId?: string;
  description?: string;
}

export interface AdMobConfig {
  isEnabled: boolean;
  androidEnabled: boolean;
  iosEnabled: boolean;
  testMode: boolean;
  eligiblePlans: string[];
  androidAppId: string;
  iosAppId: string;
  androidDefaultBannerUnitId: string;
  iosDefaultBannerUnitId: string;
  placements: {
    home_dashboard: AdPlacementConfig;
    notes_list: AdPlacementConfig;
  };
  refreshIntervalSec: number;
  version: number;
  publishedAt: string | null;
  publishedBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
  status?: 'ENABLED' | 'DISABLED' | 'TEST_MODE' | 'AWAITING_CONFIG';
}

export interface AdConfigHistoryEntry {
  version: number;
  config: AdMobConfig;
  publishedAt: string;
  publishedBy: string;
  reason?: string;
}

export interface AdMobSettingsStore {
  published: AdMobConfig;
  draft: AdMobConfig;
  history: AdConfigHistoryEntry[];
}

export interface AdMobPublicConfig {
  isEnabled: boolean;
  testMode: boolean;
  appId: string;
  defaultBannerUnitId: string;
  placements: {
    home_dashboard: {
      enabled: boolean;
      adUnitId: string;
    };
    notes_list: {
      enabled: boolean;
      adUnitId: string;
    };
  };
  eligiblePlans: string[];
  version: number;
  refreshIntervalSec: number;
  timestamp: string;
}

export const GOOGLE_TEST_APP_ID_ANDROID = 'ca-app-pub-3940256099942544~3347511713';
export const GOOGLE_TEST_APP_ID_IOS = 'ca-app-pub-3940256099942544~1458002511';
export const GOOGLE_TEST_BANNER_UNIT_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
export const GOOGLE_TEST_BANNER_UNIT_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';

export const DEFAULT_ADMOB_CONFIG: AdMobConfig = {
  isEnabled: false,
  androidEnabled: true,
  iosEnabled: true,
  testMode: true,
  eligiblePlans: ['FREE'],
  androidAppId: GOOGLE_TEST_APP_ID_ANDROID,
  iosAppId: GOOGLE_TEST_APP_ID_IOS,
  androidDefaultBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_ANDROID,
  iosDefaultBannerUnitId: GOOGLE_TEST_BANNER_UNIT_ID_IOS,
  placements: {
    home_dashboard: {
      enabled: true,
      description: 'Home / Dashboard screen banner card below quick metrics',
    },
    notes_list: {
      enabled: true,
      description: 'Notes directory screen bottom banner',
    },
  },
  refreshIntervalSec: 300,
  version: 1,
  publishedAt: null,
  publishedBy: null,
  updatedAt: new Date().toISOString(),
  updatedBy: 'system',
  status: 'DISABLED',
};
