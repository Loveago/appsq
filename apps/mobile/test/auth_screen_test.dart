import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/auth/presentation/auth_screen.dart';

void main() {
  testWidgets('AuthScreen renders Sign In form and switches to Sign Up', (WidgetTester tester) async {
    bool authed = false;

    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(onAuthSuccess: () => authed = true),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('MINDORA'), findsOneWidget);
    expect(find.text('Sign In'), findsNWidgets(2)); // switcher tab + submit button
    expect(find.text('Sign Up'), findsOneWidget);

    // Switch to Sign Up
    await tester.tap(find.text('Sign Up'));
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.byType(TextField), findsNWidgets(3)); // Name, Email, Password

    // Guest / Offline bypass
    await tester.tap(find.text('Continue as Guest / Offline Demo →'));
    await tester.pumpAndSettle();

    expect(authed, isTrue);
  });
}
