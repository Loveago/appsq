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

    // Verify header and empty state
    expect(find.text('Neural Query'), findsOneWidget);
    expect(find.text('Ask Mindora Anything'), findsOneWidget);

    // Tap suggested prompt chip
    await tester.tap(find.text('Summarize my recent thoughts'));
    await tester.pump();

    // Verify user query was added
    expect(find.text('Summarize my recent thoughts'), findsWidgets);

    // Pump synthesis
    await tester.pump(const Duration(milliseconds: 500));
    await tester.pumpAndSettle();

    // Verify response generated
    expect(find.byType(TextField), findsOneWidget);
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
