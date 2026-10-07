import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/features/tasks/presentation/tasks_screen.dart';

void main() {
  Widget buildTestableWidget(Widget child, {bool isDark = true}) {
    return MaterialApp(
      theme: isDark ? ThemeData.dark() : ThemeData.light(),
      home: child,
    );
  }

  testWidgets('TasksScreen renders task list and supports checking items', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const TasksScreen()));
    await tester.pumpAndSettle();

    // Check title and filter chips
    expect(find.text('Action Items'), findsOneWidget);
    expect(find.textContaining('All'), findsOneWidget);
    expect(find.textContaining('Urgent'), findsOneWidget);
    expect(find.textContaining('AI Extracted'), findsWidgets);
    expect(find.text('Completed'), findsOneWidget);

    // Initial task presence
    expect(find.text('Finish Stripe payment webhook integration'), findsOneWidget);

    // Tap task item to toggle completion
    await tester.tap(find.text('Finish Stripe payment webhook integration'));
    await tester.pumpAndSettle();

    // Verify task is completed by switching to 'Completed' filter
    await tester.tap(find.text('Completed'));
    await tester.pumpAndSettle();

    expect(find.text('Finish Stripe payment webhook integration'), findsOneWidget);
  });

  testWidgets('TasksScreen supports adding a new task', (WidgetTester tester) async {
    await tester.pumpWidget(buildTestableWidget(const TasksScreen()));
    await tester.pumpAndSettle();

    // Enter a new task
    final inputFinder = find.byType(TextField);
    expect(inputFinder, findsOneWidget);

    await tester.enterText(inputFinder, 'Review flutter animation specs');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();

    expect(find.text('Review flutter animation specs'), findsOneWidget);
  });
}
