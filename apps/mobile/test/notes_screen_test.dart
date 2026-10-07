import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/core/models/note_model.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';
import 'package:mindora_mobile/features/notes/presentation/notes_screen.dart';
import 'package:mindora_mobile/features/notes/presentation/note_editor_screen.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('NotesScreen renders clean empty state when no notes exist', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const NotesScreen()));
    await tester.pumpAndSettle();

    expect(find.text('Indexed Notes'), findsOneWidget);
    expect(find.text('No notes found'), findsOneWidget);
    expect(find.text('All Notes'), findsOneWidget);
  });

  testWidgets('NotesScreen filters notes by search query and category when notes exist', (WidgetTester tester) async {
    final sampleNotes = [
      const NoteModel(
        id: '1',
        title: 'Project Roadmap',
        snippet: 'Roadmap deliverables for Q4',
        content: 'Deliverables and milestones',
        tag: 'DOC',
        tagColor: Colors.blue,
        icon: Icons.description_rounded,
        date: 'Today',
        category: 'architecture',
      ),
      const NoteModel(
        id: '2',
        title: 'Team Sync Meeting',
        snippet: 'Discussed timeline and budget',
        content: 'All team members aligned',
        tag: 'AUDIO',
        tagColor: Colors.green,
        icon: Icons.mic_rounded,
        date: 'Yesterday',
        category: 'meetings',
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesProvider.overrideWith((ref) => NotesNotifier()..setNotes(sampleNotes)),
        ],
        child: buildTestableWidget(const NotesScreen()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Project Roadmap'), findsOneWidget);
    expect(find.text('Team Sync Meeting'), findsOneWidget);

    // Filter by Meetings
    await tester.tap(find.textContaining('Meetings'));
    await tester.pumpAndSettle();

    expect(find.text('Team Sync Meeting'), findsOneWidget);
    expect(find.text('Project Roadmap'), findsNothing);

    // Search query
    final searchField = find.byType(TextField);
    await tester.enterText(searchField, 'Sync');
    await tester.pumpAndSettle();
    expect(find.text('Team Sync Meeting'), findsOneWidget);
  });

  testWidgets('NotesScreen navigates to NoteEditorScreen on tap when notes exist', (WidgetTester tester) async {
    final sampleNotes = [
      const NoteModel(
        id: '1',
        title: 'Project Roadmap',
        snippet: 'Roadmap deliverables for Q4',
        content: 'Deliverables and milestones',
        tag: 'DOC',
        tagColor: Colors.blue,
        icon: Icons.description_rounded,
        date: 'Today',
        category: 'architecture',
      ),
    ];

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          notesProvider.overrideWith((ref) => NotesNotifier()..setNotes(sampleNotes)),
        ],
        child: buildTestableWidget(const NotesScreen()),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('Project Roadmap'));
    await tester.pumpAndSettle();

    expect(find.byType(NoteEditorScreen), findsOneWidget);
    expect(find.text('Extract Tasks'), findsOneWidget);
  });
}
