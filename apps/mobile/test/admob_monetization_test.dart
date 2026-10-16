import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';
import 'package:mindora_mobile/core/services/ad_service.dart';
import 'package:mindora_mobile/features/ads/presentation/ad_banner_widget.dart';
import 'package:mindora_mobile/features/ads/presentation/native_ad_card.dart';

void main() {
  group('AdService & AdMob Governance Tests', () {
    test('isPlacementEnabled returns false when isPro is true', () {
      final service = AdService.instance;
      final enabled = service.isPlacementEnabled(
        'home_dashboard',
        isPro: true,
        isSuppressed: false,
      );
      expect(enabled, isFalse);
    });

    test('isPlacementEnabled returns false when isSuppressed is true', () {
      final service = AdService.instance;
      final enabled = service.isPlacementEnabled(
        'home_dashboard',
        isPro: false,
        isSuppressed: true,
      );
      expect(enabled, isFalse);
    });

    test('getPlacementUnitId returns valid fallback unit ID when unconfigured', () {
      final service = AdService.instance;
      final unitId = service.getPlacementUnitId('home_dashboard');
      expect(unitId, isNotEmpty);
      expect(unitId.startsWith('ca-app-pub-'), isTrue);
    });
  });

  group('AdBannerWidget & Subscriber Immunity UI Tests', () {
    testWidgets('AdBannerWidget renders SizedBox.shrink when user is Pro subscriber', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => true),
            adSuppressionProvider.overrideWith((ref) => false),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: AdBannerWidget(placement: 'home_dashboard'),
            ),
          ),
        ),
      );

      await tester.pump();
      // Should not render any visible banner card or native ad
      expect(find.byType(NativeAdCard), findsNothing);
      expect(find.byType(SizedBox), findsWidgets);
    });

    testWidgets('AdBannerWidget renders SizedBox.shrink when ads are suppressed in context', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => false),
            adSuppressionProvider.overrideWith((ref) => true), // e.g. recording / note editor
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: AdBannerWidget(placement: 'home_dashboard'),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.byType(NativeAdCard), findsNothing);
    });

    testWidgets('NativeAdCard is suppressed when user is Pro', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => true),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: NativeAdCard(),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.text('Sponsored'), findsNothing);
    });

    testWidgets('NativeAdCard renders sponsored badge and copy for Free users', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => false),
            adSuppressionProvider.overrideWith((ref) => false),
          ],
          child: const MaterialApp(
            home: Scaffold(
              body: NativeAdCard(
                title: 'Test Sponsored Item',
                description: 'Test description text',
              ),
            ),
          ),
        ),
      );

      await tester.pump();
      expect(find.text('Sponsored'), findsOneWidget);
      expect(find.text('Test Sponsored Item'), findsOneWidget);
      expect(find.text('Test description text'), findsOneWidget);
    });
  });
}
