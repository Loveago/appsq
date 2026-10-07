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

      await tester.pumpWidget(buildTestableWidget(const SettingsScreen()));
      await tester.pumpAndSettle();

      expect(find.text('Account & Settings'), findsOneWidget);
      expect(find.text('Emmanuel Mensah'), findsOneWidget);
      expect(find.text('emmanuel@mindora.ai'), findsOneWidget);
      expect(find.text('Monthly AI Usage'), findsOneWidget);
      expect(find.text('AI Model Engine'), findsOneWidget);
      expect(find.text('Automatic Task Extraction'), findsOneWidget);
      expect(find.text('Export Second Brain'), findsOneWidget);
    });
  });

  group('Project Detail Screen', () {
    testWidgets('renders project metrics, AI synthesis, and next action items', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const ProjectDetailScreen(projectId: 'proj-delivery')));
      await tester.pumpAndSettle();

      expect(find.text('Delivery App'), findsWidgets);
      expect(find.text('PROJECT OVERVIEW'), findsOneWidget);
      expect(find.text('AI SECOND BRAIN SYNTHESIS'), findsOneWidget);
      expect(find.text('NEXT ACTION ITEMS'), findsOneWidget);
      expect(find.textContaining('Fix payment webhook'), findsOneWidget);
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
      expect(find.text('Good morning, Emmanuel'), findsOneWidget);
      expect(find.text('3 CRITICAL PRIORITIES'), findsOneWidget);
      expect(find.text('SECOND BRAIN CONTEXT INSIGHT'), findsOneWidget);
      expect(find.text('Got It — Start My Day'), findsOneWidget);
    });
  });

  group('Smart Lists View', () {
    testWidgets('renders checklists, toggles items, and accepts AI prompts', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const SmartListsView()));
      await tester.pumpAndSettle();

      expect(find.text('AI SMART LIST GENERATOR'), findsOneWidget);
      expect(find.text('Office Setup Essentials'), findsOneWidget);
      expect(find.text('Product Launch Checklist'), findsOneWidget);

      final itemFinder = find.text('Ergonomic Desk Chair');
      expect(itemFinder, findsOneWidget);
      await tester.tap(itemFinder);
      await tester.pumpAndSettle();
    });
  });

  group('Voice Capture Sheet', () {
    testWidgets('renders listening state, transcript, and stop button', (tester) async {
      await tester.pumpWidget(buildTestableWidget(const VoiceCaptureSheet()));
      await tester.pump(const Duration(milliseconds: 100));

      expect(find.text('Instant Voice Capture'), findsOneWidget);
      expect(find.text('Listening...'), findsOneWidget);
      expect(find.textContaining('I need to finish the payment system'), findsOneWidget);
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
}
