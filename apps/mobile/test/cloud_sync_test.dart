import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mindora_mobile/core/models/note_model.dart';
import 'package:mindora_mobile/core/providers/app_state_providers.dart';
import 'package:mindora_mobile/core/services/cloud_sync_service.dart';
import 'package:mindora_mobile/features/settings/presentation/cloud_sync_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('CloudSyncService Local Export & Integrity Tests', () {
    test('exportNotesToJson serializes local text notes faithfully', () {
      final sampleNotes = [
        const NoteModel(
          id: 'note-1',
          title: 'Architecture Blueprint',
          content: 'Local-first cloud synchronization architecture for VyNotes.',
          snippet: 'Local-first cloud synchronization...',
          date: 'Oct 16',
          category: 'Work',
          tag: 'Sync',
          tagColor: Color(0xFF6366F1),
          icon: Icons.cloud_done_rounded,
          isPinned: true,
        ),
        const NoteModel(
          id: 'note-2',
          title: 'Grocery List',
          content: '- Milk\n- Apples\n- Sourdough',
          snippet: '- Milk...',
          date: 'Oct 16',
          category: 'Personal',
          tag: 'Shopping',
          tagColor: Color(0xFF10B981),
          icon: Icons.shopping_basket_rounded,
          isPinned: false,
        ),
      ];

      final container = ProviderContainer();
      final syncNotifier = container.read(cloudSyncProvider.notifier);
      final jsonOutput = syncNotifier.serializeNotesToJson(sampleNotes);

      expect(jsonOutput, contains('VyNotes'));
      expect(jsonOutput, contains('Architecture Blueprint'));
      expect(jsonOutput, contains('Local-first cloud synchronization architecture'));
      expect(jsonOutput, contains('Grocery List'));
      expect(jsonOutput, contains('Sourdough'));
      expect(jsonOutput, contains('"notesCount": 2'));
    });

    test('CloudSyncState default values are non-null and safe', () {
      const state = CloudSyncState(
        isSyncing: false,
        cloudSyncEnabled: false,
        lastSyncTime: null,
        pendingCount: 0,
        storageUsedBytes: 0,
        storageQuotaBytes: 26214400,
        errorMessage: null,
      );

      expect(state.isSyncing, isFalse);
      expect(state.cloudSyncEnabled, isFalse);
      expect(state.storageQuotaBytes, equals(26214400)); // 25 MB
      expect(state.pendingCount, equals(0));
    });
  });

  group('CloudSyncScreen UI & Pro Gating Tests', () {
    testWidgets('CloudSyncScreen displays Pro requirement badge for Free users', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => false),
            cloudSyncProvider.overrideWith((ref) => CloudSyncNotifier()),
          ],
          child: const MaterialApp(
            home: CloudSyncScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Cloud Sync & Storage'), findsOneWidget);
      expect(find.text('Automatic Cloud Sync'), findsOneWidget);
      expect(find.text('PRO'), findsWidgets);
      expect(find.text('Requires VyNotes Pro subscription'), findsOneWidget);
      expect(find.textContaining('Text notes only'), findsOneWidget);
      expect(find.text('Text Storage Quota'), findsOneWidget);
      expect(find.text('Cloud Retention & Protection Policy'), findsOneWidget);
      expect(find.text('Export Local Notes (JSON Backup)'), findsOneWidget);
      expect(find.text('Delete Cloud Data'), findsOneWidget);
    });

    testWidgets('CloudSyncScreen displays active sync controls for Pro users', (tester) async {
      tester.view.physicalSize = const Size(1080, 2400);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            isProProvider.overrideWith((ref) => true),
            cloudSyncProvider.overrideWith((ref) => CloudSyncNotifier()),
          ],
          child: const MaterialApp(
            home: CloudSyncScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Cloud Sync & Storage'), findsOneWidget);
      expect(find.text('Sync Now'), findsOneWidget);
      expect(find.text('Devices & Sessions'), findsOneWidget);
      expect(find.text('Text Storage Quota'), findsOneWidget);
    });
  });
}
