import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/services/ad_service.dart';
import '../../../../core/theme/app_colors.dart';
import 'native_ad_card.dart';

/// Banner Ad Widget connected authoritatively to backend AdMob configuration
/// and Riverpod subscription status. Pro users and suppressed contexts NEVER
/// render ads or trigger ad network calls.
class AdBannerWidget extends ConsumerStatefulWidget {
  final String placement;
  final EdgeInsetsGeometry margin;

  const AdBannerWidget({
    super.key,
    required this.placement,
    this.margin = const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
  });

  @override
  ConsumerState<AdBannerWidget> createState() => _AdBannerWidgetState();
}

class _AdBannerWidgetState extends ConsumerState<AdBannerWidget> {
  BannerAd? _bannerAd;
  bool _isLoaded = false;
  String? _loadedUnitId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndLoadAd();
    });
  }

  void _checkAndLoadAd() {
    final isPro = ref.read(isProProvider);
    final isSuppressed = ref.read(adSuppressionProvider);

    if (isPro || isSuppressed) {
      _disposeCurrentAd();
      return;
    }

    final adService = ref.read(adServiceProvider);
    final isEnabled = adService.isPlacementEnabled(
      widget.placement,
      isPro: isPro,
      isSuppressed: isSuppressed,
    );

    if (!isEnabled) {
      _disposeCurrentAd();
      return;
    }

    final unitId = adService.getPlacementUnitId(widget.placement);
    if (_bannerAd != null && _loadedUnitId == unitId) {
      return; // Already loaded with same unit ID
    }

    _disposeCurrentAd();
    _loadedUnitId = unitId;

    try {
      _bannerAd = BannerAd(
        adUnitId: unitId,
        size: AdSize.banner,
        request: const AdRequest(),
        listener: BannerAdListener(
          onAdLoaded: (ad) {
            if (mounted) {
              setState(() {
                _isLoaded = true;
              });
            }
          },
          onAdFailedToLoad: (ad, error) {
            debugPrint('AdBannerWidget failed to load ($unitId): $error');
            ad.dispose();
            if (mounted) {
              setState(() {
                _bannerAd = null;
                _isLoaded = false;
              });
            }
          },
        ),
      );

      _bannerAd!.load();
    } catch (e) {
      debugPrint('AdBannerWidget exception: $e');
    }
  }

  void _disposeCurrentAd() {
    _bannerAd?.dispose();
    _bannerAd = null;
    _isLoaded = false;
    _loadedUnitId = null;
  }

  @override
  void dispose() {
    _disposeCurrentAd();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isPro = ref.watch(isProProvider);
    final isSuppressed = ref.watch(adSuppressionProvider);

    // Hard Subscriber Immunity: Pro users NEVER see ads; suppressed states never see ads
    if (isPro || isSuppressed) {
      if (_bannerAd != null) {
        _disposeCurrentAd();
      }
      return const SizedBox.shrink();
    }

    // Listen to remote public config state
    final configAsync = ref.watch(adPublicConfigProvider);

    return configAsync.when(
      data: (config) {
        final adService = ref.read(adServiceProvider);
        final isEnabled = adService.isPlacementEnabled(
          widget.placement,
          isPro: isPro,
          isSuppressed: isSuppressed,
        );

        if (!isEnabled) {
          return const SizedBox.shrink();
        }

        // If Google AdMob banner loaded successfully
        if (_isLoaded && _bannerAd != null) {
          final isDark = Theme.of(context).brightness == Brightness.dark;
          return Container(
            margin: widget.margin,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF131720) : const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                width: 0.8,
              ),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                width: _bannerAd!.size.width.toDouble(),
                height: _bannerAd!.size.height.toDouble(),
                child: AdWidget(ad: _bannerAd!),
              ),
            ),
          );
        }

        // If failed or loading, provide native sponsored fallback card
        return NativeAdCard(
          title: widget.placement == 'home_dashboard'
              ? 'Supercharge your notes with VyNotes Pro'
              : 'Organize with seamless AI vector intelligence',
          description: 'Try 7 days of unlimited AI voice memos, instant task extraction, and meeting summaries.',
          ctaText: 'Unlock VyNotes Pro →',
          onCtaTap: () {
            // Can trigger upgrade sheet or pro preview
          },
        );
      },
      loading: () => const SizedBox.shrink(),
      error: (_, __) => const SizedBox.shrink(),
    );
  }
}
