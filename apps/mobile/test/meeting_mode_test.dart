import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/meeting/presentation/meeting_mode_screen.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('MeetingModeScreen renders recording controls and triggers synthesis modal', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const MeetingModeScreen()));
    await tester.pumpAndSettle();

    // Verify recording status and speakers
    expect(find.text('STUDIO RECORDING'), findsOneWidget);
    expect(find.text('SPEAKER DIARIZATION (3)'), findsOneWidget);
    expect(find.text('Alex (You)'), findsOneWidget);
    expect(find.text('John'), findsOneWidget);

    // Verify pause/resume toggle
    expect(find.text('Pause'), findsOneWidget);
    await tester.tap(find.text('Pause'));
    await tester.pumpAndSettle();

    expect(find.text('Resume'), findsOneWidget);

    // Tap End & Synthesize
    expect(find.text('End & Synthesize'), findsOneWidget);
    await tester.tap(find.text('End & Synthesize'));
    await tester.pumpAndSettle();

    // Verify synthesis modal appears with decisions and action items
    expect(find.text('MEETING SYNTHESIS & ACTIONS'), findsOneWidget);
    expect(find.text('EXECUTIVE DECISIONS'), findsOneWidget);
    expect(find.text('SYNTHESIZED ACTION ITEMS'), findsOneWidget);
    expect(find.text('Sync with Neural Brain'), findsOneWidget);

    // Tap Sync button
    await tester.tap(find.text('Sync with Neural Brain'));
    await tester.pumpAndSettle();

    // Modal dismissed
    expect(find.text('MEETING SYNTHESIS & ACTIONS'), findsNothing);
  });

  testWidgets('MeetingModeScreen handles mobile screen bounds without overflow', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(buildTestableWidget(const MeetingModeScreen()));
    await tester.pumpAndSettle();

    expect(find.text('STUDIO RECORDING'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('MeetingModeScreen handles small device bounds (320x568) and high text scale', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(MaterialApp(
      theme: ThemeData.dark(),
      home: const MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(1.4)),
        child: MeetingModeScreen(),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('STUDIO RECORDING'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
