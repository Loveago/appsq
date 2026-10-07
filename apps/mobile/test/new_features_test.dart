import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/features/settings/presentation/settings_screen.dart';
import 'package:mindora_mobile/features/projects/presentation/project_detail_screen.dart';
import 'package:mindora_mobile/features/graph/presentation/knowledge_graph_screen.dart';
import 'package:mindora_mobile/features/briefing/presentation/daily_briefing_dialog.dart';
import 'package:mindora_mobile/features/voice/presentation/voice_capture_sheet.dart';
import 'package:mindora_mobile/features/tasks/presentation/widgets/smart_lists_view.dart';
import 'package:mindora_mobile/features/ads/presentation/native_ad_card.dart';
import 'package:mindora_mobile/features/notes/presentation/note_editor_screen.dart';
import 'package:mindora_mobile/core/models/project_model.dart';
import 'package:mindora_mobile/core/models/note_model.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';

void main() {
  Widget buildTestableWidget(Widget child, {List<Override> overrides = const []}) {
    return ProviderScope(
      overrides: overrides,
      child: MaterialApp(
        theme: ThemeData.dark(),
        home: Scaffold(body: child),
      ),
    );
  }

  group('Settings & Profile Screen', () {
    testWidgets('renders account details, token usage, and AI model controls', (tester) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        buildTestableWidget(
          const SettingsScreen(),
          overrides: [
            userProfileProvider.overrideWith((ref) => UserProfileNotifier()
              ..setUser(
                email: 'test@mindora.ai',
                fullName: 'Test User',
              )),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Account & Settings'), findsOneWidget);
      expect(find.text('Test User'), findsOneWidget);
      expect(find.text('test@mindora.ai'), findsOneWidget);
      expect(find.text('Monthly AI Usage'), findsOneWidget);
      expect(find.text('AI Model Engine'), findsOneWidget);
      expect(find.text('Automatic Task Extraction'), findsOneWidget);
      expect(find.text('Export Second Brain'), findsOneWidget);
    });
  });

  group('Project Detail Screen', () {
    testWidgets('renders project metrics, AI synthesis, and next action items', (tester) async {
      const sampleProj = ProjectModel(
        id: 'proj-delivery',
        name: 'Delivery App',
        description: 'Logistics and delivery',
        colorHex: '#6366F1',
        icon: 'local_shipping_rounded',
        aiSummary: 'Rider app build',
        noteCount: 5,
        taskCount: 3,
        meetingCount: 1,
      );

      await tester.pumpWidget(
        buildTestableWidget(
          const ProjectDetailScreen(projectId: 'proj-delivery'),
          overrides: [
            projectsProvider.overrideWith((ref) => ProjectsNotifier()..setProjects([sampleProj])),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Delivery App'), findsWidgets);
      expect(find.text('PROJECT OVERVIEW'), findsOneWidget);
      expect(find.text('AI SECOND BRAIN SYNTHESIS'), findsOneWidget);
      expect(find.text('NEXT ACTION ITEMS'), findsOneWidget);
    });
  });

  group('Knowledge Graph Screen', () {
    testWidgets('renders graph title, Pro badge, filter pills, and custom canvas', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const KnowledgeGraphScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Knowledge Graph'), findsOneWidget);
      expect(find.text('✦ PRO'), findsOneWidget);
      expect(find.text('All Nodes'), findsOneWidget);
      expect(find.text('People'), findsOneWidget);
      expect(find.text('Projects'), findsOneWidget);
      expect(find.byType(CustomPaint), findsWidgets);
    });
  });

  group('Daily Briefing Dialog', () {
    testWidgets('renders morning greeting, critical priorities, and context insight', (tester) async {
      tester.view.physicalSize = const Size(800, 1600);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(buildTestableWidget(const DailyBriefingDialog()));
      await tester.pumpAndSettle();

      expect(find.text('Daily AI Briefing'), findsOneWidget);
      expect(find.text('Good morning!'), findsOneWidget);
      expect(find.text('NO CRITICAL PRIORITIES'), findsOneWidget);
      expect(find.text('SECOND BRAIN CONTEXT INSIGHT'), findsOneWidget);
      expect(find.text('Got It — Start My Day'), findsOneWidget);
    });
  });

  group('Smart Lists View', () {
    testWidgets('renders checklists, toggles items, and accepts AI prompts', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const SmartListsView()));
      await tester.pumpAndSettle();

      expect(find.text('AI SMART LIST GENERATOR'), findsOneWidget);
      expect(find.text('No smart lists yet. Use the prompt above to generate your first checklist.'), findsOneWidget);

      final promptField = find.byType(TextField);
      await tester.enterText(promptField, 'Office setup');
      await tester.tap(find.text('Generate'));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 1000));
      await tester.pumpAndSettle();

      expect(find.text('Office Setup Checklist'), findsOneWidget);
      expect(find.text('Ergonomic Monitor Arm'), findsOneWidget);
    });
  });

  group('Voice Capture Sheet', () {
    testWidgets('renders listening state, transcript, and stop button', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const VoiceCaptureSheet()));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Instant Voice Capture'), findsOneWidget);
      expect(find.text('Listening...'), findsOneWidget);
      expect(find.textContaining('Speak naturally'), findsOneWidget);
      expect(find.text('Stop Recording'), findsOneWidget);

      // Tap stop recording
      await tester.tap(find.text('Stop Recording'));
      await tester.pump(const Duration(milliseconds: 1000));

      expect(find.text('AI DETECTED ACTION ITEMS'), findsOneWidget);
      expect(find.text('Save Everything'), findsOneWidget);
    });
  });

  group('Native Ad Card & Guardrails', () {
    testWidgets('renders for Free tier users', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const NativeAdCard()));
      await tester.pumpAndSettle();

      expect(find.text('Sponsored'), findsOneWidget);
      expect(find.text('Supercharge your workflows with Linear'), findsOneWidget);
    });

    testWidgets('is suppressed when Pro', (tester) async {
      await tester.pumpWidget(
        buildTestableWidget(
          const NativeAdCard(),
          overrides: [
            isProProvider.overrideWithValue(true),
          ],
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Sponsored'), findsNothing);
    });
  });

  group('Session & Note Image Attachment Tests', () {
    testWidgets('NoteEditorScreen displays Add Image button and loads initialImagePaths', (tester) async {
      tester.view.physicalSize = const Size(800, 1800);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        buildTestableWidget(
          const NoteEditorScreen(
            noteId: 'test-note-1',
            initialTitle: 'Test Note with Media',
            initialContent: 'Testing media attachment.',
            initialImagePaths: ['/tmp/sample_photo.jpg'],
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('Add Image'), findsOneWidget);
      expect(find.text('Take Photo'), findsOneWidget);
      expect(find.text('Quick Tasks Board'), findsOneWidget);
    });

    test('NoteModel serializes and deserializes imagePaths properly', () {
      const note = NoteModel(
        id: '123',
        title: 'Image Note',
        content: 'Content',
        snippet: 'Snippet',
        date: 'Today',
        category: 'Ideas',
        tag: 'NOTE',
        tagColor: Colors.blue,
        icon: Icons.notes_rounded,
        imagePaths: ['/path/to/img1.png', '/path/to/img2.jpg'],
      );

      final json = note.toJson();
      expect(json['imagePaths'], ['/path/to/img1.png', '/path/to/img2.jpg']);

      final restored = NoteModel.fromJson(json);
      expect(restored.imagePaths.length, 2);
      expect(restored.imagePaths.first, '/path/to/img1.png');
    });

    test('NoteModel serializes and deserializes audioPath properly', () {
      const note = NoteModel(
        id: 'voice-1',
        title: 'Voice Note',
        content: 'Transcribed text',
        snippet: 'Transcribed text snippet',
        date: 'Today',
        category: 'Meetings',
        tag: 'AUDIO',
        tagColor: Colors.purple,
        icon: Icons.mic_rounded,
        audioPath: '/data/user/0/app/rec_123.m4a',
      );

      final json = note.toJson();
      expect(json['audioPath'], '/data/user/0/app/rec_123.m4a');

      final restored = NoteModel.fromJson(json);
      expect(restored.audioPath, '/data/user/0/app/rec_123.m4a');
    });
  });
}
