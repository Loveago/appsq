import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/core/network/api_client.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Mobile General-Purpose Task Extraction Engine', () {
    test('extracts procedural cooking steps from Banku recipe note with sequence and quantities', () async {
      const bankuNote = '''How to prepare Banku:
1. Mix 2 cups fermented corn dough and 1 cup cassava dough with warm water in a pot until smooth.
2. Add a pinch of salt to the mixture.
3. Heat the mixture over medium flame, stirring continuously with a wooden spatula.
4. Knead firmly against the pot sides as the mixture thickens into a smooth, stiff dough.
5. Shape into smooth balls and wrap in cling film.''';

      final res = await ApiClient.instance.extractContext(bankuNote);
      final tasks = (res['tasks'] as List<dynamic>?) ?? [];

      expect(tasks.length, greaterThanOrEqualTo(4));
      expect(res['projects'], contains('Cooking'));

      // Check step numbers
      final stepNumbers = tasks.map((t) => (t as Map)['stepNumber']).toList();
      expect(stepNumbers, equals([1, 2, 3, 4, 5]));

      // Check culinary verbs
      final titles = tasks.map((t) => (t as Map)['title'].toString().toLowerCase()).toList();
      expect(titles.any((t) => t.contains('mix')), isTrue);
      expect(titles.any((t) => t.contains('heat') || t.contains('stir')), isTrue);
      expect(titles.any((t) => t.contains('knead')), isTrue);
    });

    test('extracts technical deployment runbook with proper step order', () async {
      const runbookNote = '''Server Deployment:
1. Install Docker and Docker Compose on Ubuntu server.
2. Run database migrations using npx prisma migrate deploy.
3. Configure environment variables in .env production file.
4. Deploy container with docker compose up -d.''';

      final res = await ApiClient.instance.extractContext(runbookNote);
      final tasks = (res['tasks'] as List<dynamic>?) ?? [];

      expect(tasks.length, equals(4));
      expect(res['projects'], contains('Technical'));
      expect(tasks.first['stepNumber'], equals(1));
      expect(tasks.last['stepNumber'], equals(4));
    });

    test('extracts shopping errands and marks them as PURCHASE', () async {
      const shoppingNote = '''Travel preparation:
- Buy international power adapter
- Order Japanese eSIM online
- Confirm hotel reservation''';

      final res = await ApiClient.instance.extractContext(shoppingNote);
      final tasks = (res['tasks'] as List<dynamic>?) ?? [];

      expect(tasks.length, equals(3));
      final buyTask = tasks.firstWhere(
        (t) => (t as Map)['title'].toString().toLowerCase().contains('buy international power adapter'),
      );
      expect((buyTask as Map)['taskType'], equals('PURCHASE'));
    });

    test('does NOT hallucinate tasks from purely descriptive poetic notes', () async {
      const poeticNote = '''The sunset over the hills was a magnificent shade of amber and lavender.
The evening breeze was cool, and crickets chirped softly in the grass.
It was a peaceful and quiet moment.''';

      final res = await ApiClient.instance.extractContext(poeticNote);
      final tasks = (res['tasks'] as List<dynamic>?) ?? [];

      // Must be empty - zero hallucinations
      expect(tasks, isEmpty);
    });
  });

  group('TasksNotifier Persistence & Deduplication', () {
    test('deduplicates identical tasks and preserves rich metadata', () {
      final notifier = TasksNotifier();

      final initialTasks = [
        {
          'title': 'Knead fermented dough firmly',
          'description': 'Knead continuously for 15 minutes over heat',
          'priority': 'HIGH',
          'category': 'Cooking',
          'stepNumber': 4,
          'taskType': 'PROCEDURAL',
        },
        {
          'title': 'Buy cassava dough from market',
          'priority': 'MEDIUM',
          'category': 'Shopping',
          'taskType': 'PURCHASE',
        },
      ];

      notifier.addExtractedTasks(initialTasks, project: 'Banku Preparation');
      expect(notifier.state.length, equals(2));
      expect(notifier.state.first.stepNumber, equals(4));
      expect(notifier.state.first.category, equals('Cooking'));
      expect(notifier.state.first.description, equals('Knead continuously for 15 minutes over heat'));

      // Re-add the same tasks (duplicate attempt)
      notifier.addExtractedTasks(initialTasks, project: 'Banku Preparation');
      // State length should still be 2 (no duplicates!)
      expect(notifier.state.length, equals(2));

      // Add a third distinct task
      notifier.addExtractedTasks([
        {'title': 'Serve with hot pepper and fried fish', 'priority': 'LOW', 'stepNumber': 5}
      ], project: 'Banku Preparation');
      expect(notifier.state.length, equals(3));
    });
  });
}
