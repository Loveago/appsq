import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/ai_assistant/presentation/ask_notes_screen.dart';
import 'package:mindora_mobile/features/notes/presentation/ai_extract_sheet.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('AskNotesScreen renders query input and displays grounded answers', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const AskNotesScreen()));
    await tester.pumpAndSettle();

    // Verify header and initial message
    expect(find.text('Neural Query'), findsOneWidget);
    expect(find.text('What did John ask me to do before the next sync?'), findsOneWidget);
    expect(find.text('98.4% GROUNDED'), findsOneWidget);

    // Tap suggested prompt chip
    await tester.tap(find.text('What did John decide on Stripe?'));
    await tester.pump();

    // Verify user query was added
    expect(find.text('What did John decide on Stripe?'), findsWidgets);

    // Fast-forward synthesis timer
    await tester.pump(const Duration(milliseconds: 1100));
    await tester.pumpAndSettle();

    // Verify synthesized response
    expect(find.textContaining('Target delivery for this milestone'), findsOneWidget);
    expect(find.text('99.1% GROUNDED'), findsOneWidget);
  });

  testWidgets('AiExtractSheet renders extracted people, projects, deadlines, and task checkboxes', (WidgetTester tester) async {
    bool applied = false;

    await tester.pumpWidget(buildTestableWidget(
      Scaffold(
        body: AiExtractSheet(
          onApply: () => applied = true,
        ),
      ),
    ));
    await tester.pumpAndSettle();

    expect(find.text('NEURAL THOUGHT EXTRACTION'), findsOneWidget);
    expect(find.text('John Doe'), findsOneWidget);
    expect(find.text('Website'), findsOneWidget);
    expect(find.text('Sep 01'), findsOneWidget);

    // Ensure action items header and button are visible
    expect(find.text('ACTION ITEMS (2 DETECTED)'), findsOneWidget);
    final buttonFinder = find.text('Sync & Commit to Neural Brain');
    await tester.ensureVisible(buttonFinder);
    await tester.pumpAndSettle();

    await tester.tap(buttonFinder);
    await tester.pumpAndSettle();

    expect(applied, isTrue);
  });
}
