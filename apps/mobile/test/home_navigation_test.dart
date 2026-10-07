import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/main.dart';
import 'package:mindora_mobile/features/home/presentation/home_screen.dart';
import 'package:mindora_mobile/features/notes/presentation/note_editor_screen.dart';
import 'package:mindora_mobile/features/notes/presentation/notes_screen.dart';
import 'package:mindora_mobile/features/tasks/presentation/tasks_screen.dart';
import 'package:mindora_mobile/features/ai_assistant/presentation/ask_notes_screen.dart';

void main() {
  testWidgets('Home screen renders and switches tabs smoothly via floating dock', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MindoraApp()));
    await tester.pumpAndSettle();

    // Verify Home screen content is visible
    expect(find.byType(HomeScreen), findsOneWidget);
    expect(find.text('MINDORA'), findsOneWidget);
    expect(find.text('PULSE METRICS'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget); // Selected label

    // Switch to Notes tab via dock icon
    await tester.tap(find.byIcon(Icons.description_outlined));
    await tester.pumpAndSettle();

    expect(find.byType(NotesScreen), findsOneWidget);
    expect(find.text('Indexed Notes'), findsOneWidget);
    expect(find.text('Notes'), findsOneWidget); // Now selected label in dock

    // Switch to Tasks tab via dock icon
    await tester.tap(find.byIcon(Icons.check_circle_outline_rounded));
    await tester.pumpAndSettle();

    expect(find.byType(TasksScreen), findsOneWidget);
    expect(find.text('Action Items'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget); // Now selected label in dock

    // Switch to AI tab via dock icon
    await tester.tap(find.byIcon(Icons.psychology_rounded).last);
    await tester.pumpAndSettle();

    expect(find.byType(AskNotesScreen), findsOneWidget);
    expect(find.text('Neural Query'), findsOneWidget);
    expect(find.text('AI Chat'), findsOneWidget); // Now selected label in dock

    // Switch back to Home via dock icon
    await tester.tap(find.byIcon(Icons.grid_view_rounded));
    await tester.pumpAndSettle();

    expect(find.text('MINDORA'), findsOneWidget);
    expect(find.text('PULSE METRICS'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
  });

  testWidgets('Quick capture bar Write pill navigates to Note Editor', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MindoraApp()));
    await tester.pumpAndSettle();

    expect(find.text('Write'), findsOneWidget);
    await tester.tap(find.text('Write'));
    await tester.pumpAndSettle();

    expect(find.byType(NoteEditorScreen), findsOneWidget);
    expect(find.text('Extract Tasks'), findsOneWidget);

    // Navigate back
    await tester.tap(find.byIcon(Icons.arrow_back_ios_new_rounded));
    await tester.pumpAndSettle();

    expect(find.text('MINDORA'), findsOneWidget);
  });

  testWidgets('Home screen renders cleanly on standard mobile screen bounds (360x640)', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const ProviderScope(child: MindoraApp()));
    await tester.pumpAndSettle();

    expect(find.text('MINDORA'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Home screen renders cleanly on small screen bounds (320x568) with text scaling', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(
      const ProviderScope(
        child: MediaQuery(
          data: MediaQueryData(textScaler: TextScaler.linear(1.3)),
          child: MindoraApp(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('MINDORA'), findsOneWidget);
    final err = tester.takeException();
    if (err != null) {
      if (err is FlutterError) {
        FlutterError.dumpErrorToConsole(FlutterErrorDetails(exception: err));
      }
    }
    expect(err, isNull);
  });

  testWidgets('Bottom navigation bar renders AI Chat item with Second Brain styling and bottom clearance', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MindoraApp()));
    await tester.pumpAndSettle();

    // Verify center Quick Capture button is present
    expect(find.byIcon(Icons.add_rounded), findsWidgets);

    // Verify AI Chat item is rendered and tap it
    final aiIcon = find.byIcon(Icons.psychology_rounded).last;
    expect(aiIcon, findsOneWidget);
    await tester.tap(aiIcon);
    await tester.pumpAndSettle();

    // Verify AI Chat tab is selected and input field is visible and accessible
    expect(find.byType(AskNotesScreen), findsOneWidget);
    expect(find.text('AI Chat'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
