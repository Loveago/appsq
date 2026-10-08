import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/features/settings/presentation/account_profile_screen.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';

void main() {
  testWidgets('AccountProfileScreen renders user details, quotas, and actions', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1600);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final container = ProviderContainer();
    container.read(userProfileProvider.notifier).setUser(
      email: 'test@mindora.ai',
      fullName: 'Alex Mindora',
      isPro: false,
    );

    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: const MaterialApp(
          home: AccountProfileScreen(),
        ),
      ),
    );

    // Initial render
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Account & Profile'), findsOneWidget);
    expect(find.text('AUTHORITATIVE USAGE & QUOTAS'), findsOneWidget);
    expect(find.text('SECURITY & DATA'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);
    expect(find.text('Sign Out'), findsOneWidget);
    expect(find.text('Delete Account'), findsOneWidget);
  });
}
