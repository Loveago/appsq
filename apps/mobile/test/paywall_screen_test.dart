import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/paywall/presentation/paywall_screen.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('PaywallScreen renders pricing and toggles between annual and monthly', (WidgetTester tester) async {
    bool proSelected = false;
    bool freeSelected = false;

    await tester.pumpWidget(buildTestableWidget(PaywallScreen(
      onSelectPro: () => proSelected = true,
      onSelectFree: () => freeSelected = true,
    )));
    await tester.pumpAndSettle();

    // Verify header and features
    expect(find.text('✦ MINDORA PRO MEMBERSHIP'), findsOneWidget);
    expect(find.text('Unlimited Second Brain.'), findsOneWidget);
    expect(find.text('PRO ACCESS'), findsOneWidget);
    expect(find.text('7-DAY FREE TRIAL'), findsOneWidget);

    // Initial state is Annual ($3.29)
    expect(find.text('\$3.29'), findsOneWidget);

    // Tap Monthly toggle
    await tester.tap(find.text('Monthly'));
    await tester.pumpAndSettle();

    // Verify price updates to $4.99
    expect(find.text('\$4.99'), findsOneWidget);

    // Ensure button is visible before tapping
    final proButtonFinder = find.text('Start 7-Day Free Trial');
    await tester.ensureVisible(proButtonFinder);
    await tester.pumpAndSettle();

    // Tap Start Free Trial button
    await tester.tap(proButtonFinder);
    await tester.pumpAndSettle();

    expect(proSelected, isTrue);

    // Ensure free tier button is visible and tap
    final freeButtonFinder = find.text('Continue with Free Tier (Limited features)');
    await tester.ensureVisible(freeButtonFinder);
    await tester.pumpAndSettle();

    await tester.tap(freeButtonFinder);
    await tester.pumpAndSettle();

    expect(freeSelected, isTrue);
  });
}
