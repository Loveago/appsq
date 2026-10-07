import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/notes/presentation/notes_screen.dart';
import 'package:mindora_mobile/features/notes/presentation/note_editor_screen.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('NotesScreen renders notes list and filters by category', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const NotesScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Indexed Notes'), findsOneWidget);
    expect(find.text('Product Architecture & LLM Routing'), findsOneWidget);
    expect(find.text('Meeting with John (Stripe Webhook)'), findsOneWidget);

    // Tap 'Meetings' category filter
    await tester.tap(find.textContaining('Meetings'));
    await tester.pumpAndSettle();

    expect(find.text('Meeting with John (Stripe Webhook)'), findsOneWidget);
    expect(find.text('Product Architecture & LLM Routing'), findsNothing);

    // Switch back to 'All Notes'
    await tester.tap(find.text('All Notes'));
    await tester.pumpAndSettle();

    expect(find.text('Product Architecture & LLM Routing'), findsOneWidget);
  });

  testWidgets('NotesScreen filters notes by search query', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const NotesScreen()));
    await tester.pumpAndSettle();

    final searchField = find.byType(TextField);
    expect(searchField, findsOneWidget);

    await tester.enterText(searchField, 'Screenshots');
    await tester.pumpAndSettle();

    expect(find.text('App Store Screenshots & Value Proposition'), findsOneWidget);
    expect(find.text('Product Architecture & LLM Routing'), findsNothing);
  });

  testWidgets('NotesScreen navigates to NoteEditorScreen on tap', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const NotesScreen()));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Product Architecture & LLM Routing'));
    await tester.pumpAndSettle();

    expect(find.byType(NoteEditorScreen), findsOneWidget);
    expect(find.text('Extract Tasks'), findsOneWidget);
  });
}
