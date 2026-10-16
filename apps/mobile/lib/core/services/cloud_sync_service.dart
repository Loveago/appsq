import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';
import '../models/note_model.dart';
import '../network/api_client.dart';
import '../storage/local_storage_service.dart';
import '../providers/app_state_providers.dart';

class CloudSyncState {
  final bool isSyncing;
  final bool cloudSyncEnabled;
  final String? lastSyncTime;
  final int pendingCount;
  final String? errorMessage;
  final int storageUsedBytes;
  final int storageQuotaBytes;
  final List<Map<String, dynamic>> conflicts;

  const CloudSyncState({
    this.isSyncing = false,
    this.cloudSyncEnabled = false,
    this.lastSyncTime,
    this.pendingCount = 0,
    this.errorMessage,
    this.storageUsedBytes = 0,
    this.storageQuotaBytes = 26214400, // 25 MB default
    this.conflicts = const [],
  });

  CloudSyncState copyWith({
    bool? isSyncing,
    bool? cloudSyncEnabled,
    String? lastSyncTime,
    int? pendingCount,
    String? errorMessage,
    int? storageUsedBytes,
    int? storageQuotaBytes,
    List<Map<String, dynamic>>? conflicts,
  }) {
    return CloudSyncState(
      isSyncing: isSyncing ?? this.isSyncing,
      cloudSyncEnabled: cloudSyncEnabled ?? this.cloudSyncEnabled,
      lastSyncTime: lastSyncTime ?? this.lastSyncTime,
      pendingCount: pendingCount ?? this.pendingCount,
      errorMessage: errorMessage,
      storageUsedBytes: storageUsedBytes ?? this.storageUsedBytes,
      storageQuotaBytes: storageQuotaBytes ?? this.storageQuotaBytes,
      conflicts: conflicts ?? this.conflicts,
    );
  }
}

class CloudSyncNotifier extends StateNotifier<CloudSyncState> {
  Timer? _debounceTimer;

  CloudSyncNotifier() : super(const CloudSyncState()) {
    _initialize();
  }

  Future<void> _initialize() async {
    final enabled = await LocalStorageService.instance.loadCloudSyncEnabled();
    final lastTime = await LocalStorageService.instance.loadLastCloudSyncTime();
    final queue = await LocalStorageService.instance.loadCloudSyncQueue();

    state = state.copyWith(
      cloudSyncEnabled: enabled,
      lastSyncTime: lastTime,
      pendingCount: queue.length,
    );
  }

  /// Refreshes server status, storage usage, and retention deadlines
  Future<void> refreshStatus() async {
    try {
      final status = await ApiClient.instance.getCloudSyncStatus();
      final queue = await LocalStorageService.instance.loadCloudSyncQueue();

      state = state.copyWith(
        cloudSyncEnabled: status['cloudSyncEnabled'] as bool? ?? state.cloudSyncEnabled,
        storageUsedBytes: (status['cloudStorageBytes'] as num?)?.toInt() ?? state.storageUsedBytes,
        storageQuotaBytes: (status['cloudStorageQuotaBytes'] as num?)?.toInt() ?? state.storageQuotaBytes,
        pendingCount: queue.length,
      );
    } catch (_) {}
  }

  /// Turns cloud sync ON
  Future<bool> enableSync({required WidgetRef ref}) async {
    await LocalStorageService.instance.saveCloudSyncEnabled(true);
    state = state.copyWith(cloudSyncEnabled: true, isSyncing: true, errorMessage: null);
    try {
      final res = await ApiClient.instance.enableCloudSync();
      if (res['success'] == true) {
        await syncNow(ref: ref);
        return true;
      }
    } catch (e) {
      debugPrint('CloudSync enable notice: $e');
    } finally {
      state = state.copyWith(isSyncing: false);
    }
    await syncNow(ref: ref);
    return true;
  }

  /// Turns cloud sync OFF (Preserves local notes, sets 90-day retention on cloud copies)
  Future<bool> disableSync() async {
    state = state.copyWith(isSyncing: true, errorMessage: null);
    try {
      final res = await ApiClient.instance.disableCloudSync();
      if (res['success'] == true) {
        await LocalStorageService.instance.saveCloudSyncEnabled(false);
        state = state.copyWith(
          cloudSyncEnabled: false,
          isSyncing: false,
        );
        return true;
      }
    } catch (e) {
      state = state.copyWith(isSyncing: false, errorMessage: 'Failed to disable cloud sync.');
    }
    state = state.copyWith(isSyncing: false);
    return false;
  }

  /// Permanently deletes all cloud copies on the server.
  /// Local notes on this device remain completely intact!
  Future<bool> deleteCloudData() async {
    state = state.copyWith(isSyncing: true, errorMessage: null);
    try {
      final res = await ApiClient.instance.deleteCloudData();
      if (res['success'] == true) {
        await LocalStorageService.instance.saveCloudSyncEnabled(false);
        await LocalStorageService.instance.saveLastCloudSyncTime('');
        state = state.copyWith(
          cloudSyncEnabled: false,
          lastSyncTime: null,
          storageUsedBytes: 0,
          isSyncing: false,
        );
        return true;
      }
    } catch (e) {
      state = state.copyWith(isSyncing: false, errorMessage: 'Failed to delete cloud notes.');
    }
    state = state.copyWith(isSyncing: false);
    return false;
  }

  /// Enqueue note change (Strict text-only isolation).
  /// Excludes audioPath, imagePaths, and media attachments.
  Future<void> enqueueNoteChange(NoteModel note, {bool isDeleted = false, WidgetRef? ref}) async {
    final item = {
      'id': note.id,
      'title': note.title,
      'content': note.content,
      'isPinned': note.isPinned,
      'category': note.category,
      'tags': [note.tag],
      'clientRevision': 1,
      'clientModifiedAt': DateTime.now().toIso8601String(),
      'isDeleted': isDeleted,
      // NOTE: audioPath and imagePaths are strictly omitted!
    };

    await LocalStorageService.instance.enqueueCloudSyncItem(item);
    final queue = await LocalStorageService.instance.loadCloudSyncQueue();
    state = state.copyWith(pendingCount: queue.length);

    // If sync enabled and ref provided, trigger debounced sync
    if (state.cloudSyncEnabled && ref != null) {
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(seconds: 3), () {
        syncNow(ref: ref);
      });
    }
  }

  /// Executes full bidirectional incremental synchronization
  Future<void> syncNow({required dynamic ref}) async {
    if (state.isSyncing) return;

    if (!state.cloudSyncEnabled) {
      return;
    }

    state = state.copyWith(isSyncing: true, errorMessage: null);

    try {
      // Step 1: PUSH pending changes
      final queue = await LocalStorageService.instance.loadCloudSyncQueue();
      if (queue.isNotEmpty) {
        final pushRes = await ApiClient.instance.pushCloudNotes(items: queue);
        if (pushRes['success'] == true) {
          final conflicts = pushRes['conflicts'] as List<dynamic>? ?? [];
          await LocalStorageService.instance.clearCloudSyncQueue();
          state = state.copyWith(
            pendingCount: 0,
            conflicts: conflicts.map((c) => Map<String, dynamic>.from(c as Map)).toList(),
          );
        }
      }

      // Step 2: PULL remote changes
      final pullRes = await ApiClient.instance.pullCloudNotes(
        lastSyncTimestamp: state.lastSyncTime,
      );

      final remoteNotes = pullRes['notes'] as List<dynamic>? ?? [];
      final serverTimestamp = pullRes['serverTimestamp'] as String?;
      final storageBytes = (pullRes['cloudStorageBytes'] as num?)?.toInt();
      final storageQuota = (pullRes['cloudStorageQuotaBytes'] as num?)?.toInt();

      if (remoteNotes.isNotEmpty) {
        final currentNotes = ref.read(notesProvider) as List<NoteModel>;
        final updatedList = List<NoteModel>.from(currentNotes);

        for (final raw in remoteNotes) {
          final noteMap = Map<String, dynamic>.from(raw as Map);
          final noteId = noteMap['id'] as String;
          final isDeleted = noteMap['isDeleted'] as bool? ?? false;

          if (isDeleted) {
            updatedList.removeWhere((n) => n.id == noteId);
          } else {
            final existingIndex = updatedList.indexWhere((n) => n.id == noteId);
            if (existingIndex >= 0) {
              final existing = updatedList[existingIndex];
              // Update text content while preserving any local-only media on this device
              updatedList[existingIndex] = existing.copyWith(
                title: noteMap['title'] as String? ?? existing.title,
                content: noteMap['content'] as String? ?? existing.content,
                isPinned: noteMap['isPinned'] as bool? ?? existing.isPinned,
              );
            } else {
              // Create local note from cloud text note
              final title = noteMap['title'] as String? ?? 'Untitled Note';
              final content = noteMap['content'] as String? ?? '';
              final snippet = content.length > 90 ? '${content.substring(0, 90)}...' : content;
              final newNote = NoteModel(
                id: noteId,
                title: title,
                content: content,
                snippet: snippet,
                date: 'Cloud Synced',
                category: 'General',
                tag: 'Cloud',
                tagColor: const Color(0xFF6366F1),
                icon: NoteModel.iconForCategory('General'),
                isPinned: noteMap['isPinned'] as bool? ?? false,
              );
              updatedList.add(newNote);
            }
          }
        }

        // Apply reconciled notes to local state and SQLite/local storage
        ref.read(notesProvider.notifier).setNotesQuietly(updatedList);
      }

      final syncTime = serverTimestamp ?? DateTime.now().toIso8601String();
      await LocalStorageService.instance.saveLastCloudSyncTime(syncTime);

      state = state.copyWith(
        isSyncing: false,
        lastSyncTime: syncTime,
        storageUsedBytes: storageBytes ?? state.storageUsedBytes,
        storageQuotaBytes: storageQuota ?? state.storageQuotaBytes,
        errorMessage: null,
      );
    } catch (e) {
      debugPrint('CloudSync error: $e');
      state = state.copyWith(
        isSyncing: false,
        errorMessage: 'Sync paused. Changes are saved locally and will sync when reconnected.',
      );
    }
  }

  /// Serialize notes to JSON string for backup and export
  String serializeNotesToJson(List<NoteModel> notes) {
    final exportData = {
      'exportedAt': DateTime.now().toIso8601String(),
      'appName': 'VyNotes',
      'version': '1.0.0',
      'notesCount': notes.length,
      'notes': notes.map((n) => {
        'id': n.id,
        'title': n.title,
        'content': n.content,
        'category': n.category,
        'tag': n.tag,
        'date': n.date,
        'isPinned': n.isPinned,
      }).toList(),
    };
    return const JsonEncoder.withIndent('  ').convert(exportData);
  }

  /// Export local notes for Free users (Data Sovereignty & Local Backup)
  Future<void> exportNotes(List<NoteModel> notes) async {
    final jsonStr = serializeNotesToJson(notes);
    await Share.share(
      jsonStr,
      subject: 'VyNotes_Backup_${DateTime.now().millisecondsSinceEpoch}.json',
    );
  }
}

final cloudSyncProvider = StateNotifierProvider<CloudSyncNotifier, CloudSyncState>((ref) {
  return CloudSyncNotifier();
});
