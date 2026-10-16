import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../network/api_client.dart';
import '../providers/app_state_providers.dart';

// Official Google Sample AdMob Test IDs (fallback safety)
const String kGoogleTestBannerAndroid = 'ca-app-pub-3940256099942544/6300978111';
const String kGoogleTestBannerIos = 'ca-app-pub-3940256099942544/2934735716';

/// Service managing dynamic AdMob initialization, public configuration retrieval,
/// and strict subscriber immunity enforcement.
class AdService {
  static final AdService instance = AdService._();
  AdService._();

  bool _isMobileAdsInitialized = false;
  Map<String, dynamic>? _cachedConfig;
  DateTime? _lastFetchedAt;

  Map<String, dynamic>? get currentConfig => _cachedConfig;
  bool get isMobileAdsInitialized => _isMobileAdsInitialized;

  /// Fetch remote public advertising configuration from the backend
  Future<Map<String, dynamic>> fetchPublicConfig({bool force = false}) async {
    final now = DateTime.now();
    final refreshSec = _cachedConfig?['refreshIntervalSec'] as int? ?? 300;

    if (!force &&
        _cachedConfig != null &&
        _lastFetchedAt != null &&
        now.difference(_lastFetchedAt!).inSeconds < refreshSec) {
      return _cachedConfig!;
    }

    try {
      final config = await ApiClient.instance.getAdPublicConfig();
      _cachedConfig = config;
      _lastFetchedAt = now;
      return config;
    } catch (e) {
      debugPrint('AdService fetchPublicConfig error: $e');
      return _cachedConfig ?? {
        'isEnabled': false,
        'testMode': true,
        'defaultBannerUnitId': Platform.isIOS ? kGoogleTestBannerIos : kGoogleTestBannerAndroid,
        'placements': {
          'home_dashboard': {'enabled': false, 'adUnitId': ''},
          'notes_list': {'enabled': false, 'adUnitId': ''},
        },
        'eligiblePlans': ['FREE'],
      };
    }
  }

  /// Initialize MobileAds SDK if user is eligible (FREE plan only) and ads are enabled
  Future<void> initialize({bool isPro = false}) async {
    // Hard guard: Pro subscribers and active trials are 100% immune
    if (isPro) {
      debugPrint('AdService: User is Pro/Trial subscriber. Suppressing MobileAds initialization.');
      _isMobileAdsInitialized = false;
      return;
    }

    final config = await fetchPublicConfig();
    final isEnabled = config['isEnabled'] == true;

    if (!isEnabled) {
      debugPrint('AdService: Ads are globally disabled via admin panel.');
      return;
    }

    if (!_isMobileAdsInitialized) {
      try {
        await MobileAds.instance.initialize();
        _isMobileAdsInitialized = true;
        debugPrint('AdService: MobileAds initialized successfully (testMode: ${config['testMode']})');
      } catch (e) {
        debugPrint('AdService MobileAds.instance.initialize warning: $e');
      }
    }
  }

  /// Check whether a banner placement is enabled and safe to render
  bool isPlacementEnabled(
    String placementKey, {
    required bool isPro,
    required bool isSuppressed,
  }) {
    // Pro users NEVER see ads; suppressed states (editor, recording, AI chat) NEVER see ads
    if (isPro || isSuppressed) return false;

    if (_cachedConfig == null) return false;
    final isGloballyEnabled = _cachedConfig!['isEnabled'] == true;
    if (!isGloballyEnabled) return false;

    final placements = _cachedConfig!['placements'] as Map<String, dynamic>?;
    final placement = placements?[placementKey] as Map<String, dynamic>?;
    return placement?['enabled'] == true;
  }

  /// Resolve the operational banner ad unit ID for a specific placement
  String getPlacementUnitId(String placementKey) {
    final defaultFallback = Platform.isIOS ? kGoogleTestBannerIos : kGoogleTestBannerAndroid;

    if (_cachedConfig == null) return defaultFallback;

    final placements = _cachedConfig!['placements'] as Map<String, dynamic>?;
    final placement = placements?[placementKey] as Map<String, dynamic>?;
    final placementId = placement?['adUnitId'] as String?;

    if (placementId != null && placementId.trim().isNotEmpty) {
      return placementId.trim();
    }

    final defaultUnitId = _cachedConfig!['defaultBannerUnitId'] as String?;
    if (defaultUnitId != null && defaultUnitId.trim().isNotEmpty) {
      return defaultUnitId.trim();
    }

    return defaultFallback;
  }
}

/// Provider exposing the AdService instance
final adServiceProvider = Provider<AdService>((ref) => AdService.instance);

/// FutureProvider that fetches and auto-refreshes ad public config, listening to Pro status
final adPublicConfigProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  final isPro = ref.watch(isProProvider);
  final service = ref.watch(adServiceProvider);

  // Pro users get disabled config immediately without network call
  if (isPro) {
    return {
      'isEnabled': false,
      'testMode': false,
      'eligiblePlans': ['FREE'],
    };
  }

  final config = await service.fetchPublicConfig();
  if (config['isEnabled'] == true) {
    await service.initialize(isPro: false);
  }
  return config;
});
