import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/note_model.dart';
import '../models/task_model.dart';
import '../models/project_model.dart';
import '../models/smart_list_model.dart';
import '../models/notification_model.dart';
import '../models/reminder_model.dart';
import '../storage/local_storage_service.dart';
import '../network/api_client.dart';

// User Profile & Subscription State
class UserProfileState {
  final String fullName;
  final String email;
  final bool isPro;
  final int monthlyAiTokensUsed;
  final int monthlyAiTokensLimit;
  final String selectedAiModel; // 'gpt-4o-mini' or 'claude-3-5-sonnet'
  final String responseStyle; // 'Concise' or 'Comprehensive'
  final bool autoTaskDetection;
  final bool autoContextExtraction;
  final bool dailyBriefingNotification;
  final bool taskDueNotification;

  const UserProfileState({
    this.fullName = '',
    this.email = '',
    this.isPro = false,
    this.monthlyAiTokensUsed = 0,
    this.monthlyAiTokensLimit = 100000,
    this.selectedAiModel = 'gpt-4o-mini',
    this.responseStyle = 'Concise',
    this.autoTaskDetection = true,
    this.autoContextExtraction = true,
    this.dailyBriefingNotification = true,
    this.taskDueNotification = true,
  });

  UserProfileState copyWith({
    String? fullName,
    String? email,
    bool? isPro,
    int? monthlyAiTokensUsed,
    int? monthlyAiTokensLimit,
    String? selectedAiModel,
    String? responseStyle,
    bool? autoTaskDetection,
    bool? autoContextExtraction,
    bool? dailyBriefingNotification,
    bool? taskDueNotification,
  }) {
    return UserProfileState(
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      isPro: isPro ?? this.isPro,
      monthlyAiTokensUsed: monthlyAiTokensUsed ?? this.monthlyAiTokensUsed,
      monthlyAiTokensLimit: monthlyAiTokensLimit ?? this.monthlyAiTokensLimit,
      selectedAiModel: selectedAiModel ?? this.selectedAiModel,
      responseStyle: responseStyle ?? this.responseStyle,
      autoTaskDetection: autoTaskDetection ?? this.autoTaskDetection,
      autoContextExtraction: autoContextExtraction ?? this.autoContextExtraction,
      dailyBriefingNotification: dailyBriefingNotification ?? this.dailyBriefingNotification,
      taskDueNotification: taskDueNotification ?? this.taskDueNotification,
    );
  }
}

class UserProfileNotifier extends StateNotifier<UserProfileState> {
  UserProfileNotifier() : super(const UserProfileState());

  void setUser({
    required String email,
    String? fullName,
    bool isPro = false,
    int monthlyAiTokensUsed = 0,
    int monthlyAiTokensLimit = 100000,
  }) {
    state = state.copyWith(
      email: email,
      fullName: fullName ?? (email.contains('@') ? email.split('@')[0] : email),
      isPro: isPro,
      monthlyAiTokensUsed: monthlyAiTokensUsed,
      monthlyAiTokensLimit: monthlyAiTokensLimit,
    );
    LocalStorageService.instance.saveUserProfile(state);
  }

  void syncFromEntitlements(Map<String, dynamic> data) {
    try {
      final plan = data['plan']?.toString().toUpperCase() ?? '';
      final isPro = plan == 'PRO' || plan == 'TRIAL';

      final limits = data['limits'];
      final usage = data['usage'];

      int limitTokens = state.monthlyAiTokensLimit;
      if (limits is Map && limits['aiTokens'] != null) {
        limitTokens = (limits['aiTokens'] is num)
            ? (limits['aiTokens'] as num).toInt()
            : int.tryParse(limits['aiTokens'].toString()) ?? limitTokens;
      }

      int usedTokens = state.monthlyAiTokensUsed;
      if (usage is Map && usage['aiTokens'] != null) {
        usedTokens = (usage['aiTokens'] is num)
            ? (usage['aiTokens'] as num).toInt()
            : int.tryParse(usage['aiTokens'].toString()) ?? usedTokens;
      }

      final userObj = data['user'];
      String? name;
      String? email;
      if (userObj is Map) {
        name = userObj['fullName']?.toString();
        email = userObj['email']?.toString();
      }

      state = state.copyWith(
        isPro: isPro,
        monthlyAiTokensLimit: limitTokens,
        monthlyAiTokensUsed: usedTokens,
        fullName: (name != null && name.isNotEmpty) ? name : state.fullName,
        email: (email != null && email.isNotEmpty) ? email : state.email,
        selectedAiModel: isPro ? 'claude-3-5-sonnet' : 'gpt-4o-mini',
      );
      LocalStorageService.instance.saveUserProfile(state);
    } catch (_) {}
  }

  void updateName(String name) {
    state = state.copyWith(fullName: name);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void updateEmail(String email) {
    state = state.copyWith(email: email);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void resetProfile() {
    state = const UserProfileState();
    LocalStorageService.instance.saveUserProfile(state);
  }

  void setPro(bool isPro) {
    state = state.copyWith(
      isPro: isPro,
      monthlyAiTokensLimit: isPro ? 1000000 : 100000,
      selectedAiModel: isPro ? 'claude-3-5-sonnet' : 'gpt-4o-mini',
    );
    LocalStorageService.instance.saveUserProfile(state);
  }

  void consumeTokens(int count) {
    state = state.copyWith(
      monthlyAiTokensUsed: state.monthlyAiTokensUsed + count,
    );
    LocalStorageService.instance.saveUserProfile(state);
  }

  void setAiModel(String model) {
    state = state.copyWith(selectedAiModel: model);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void setResponseStyle(String style) {
    state = state.copyWith(responseStyle: style);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void toggleAutoTaskDetection(bool val) {
    state = state.copyWith(autoTaskDetection: val);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void toggleAutoContext(bool val) {
    state = state.copyWith(autoContextExtraction: val);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void toggleDailyBriefing(bool val) {
    state = state.copyWith(dailyBriefingNotification: val);
    LocalStorageService.instance.saveUserProfile(state);
  }

  void toggleTaskDue(bool val) {
    state = state.copyWith(taskDueNotification: val);
    LocalStorageService.instance.saveUserProfile(state);
  }
}

final userProfileProvider = StateNotifierProvider<UserProfileNotifier, UserProfileState>((ref) {
  return UserProfileNotifier();
});

final isProProvider = Provider<bool>((ref) {
  return ref.watch(userProfileProvider).isPro;
});

// Ad suppression flag (true when editor is open or recording audio)
final adSuppressionProvider = StateProvider<bool>((ref) => false);

// Notes State Notifier with Local-First Persistence & Cloud Sync Queue
class NotesNotifier extends StateNotifier<List<NoteModel>> {
  NotesNotifier() : super([]);

  void setNotesQuietly(List<NoteModel> notes) {
    state = notes;
    LocalStorageService.instance.saveNotes(state);
  }

  void setNotes(List<NoteModel> notes) {
    state = notes;
    LocalStorageService.instance.saveNotes(state);
    for (final note in notes) {
      LocalStorageService.instance.enqueueCloudSyncItem({
        'id': note.id,
        'title': note.title,
        'content': note.content,
        'isPinned': note.isPinned,
        'clientRevision': 1,
        'clientModifiedAt': DateTime.now().toIso8601String(),
        'isDeleted': false,
      });
    }
  }

  void addNote(NoteModel note) {
    state = [note, ...state];
    LocalStorageService.instance.saveNotes(state);
    // Enqueue strictly text metadata into persistent local sync queue
    LocalStorageService.instance.enqueueCloudSyncItem({
      'id': note.id,
      'title': note.title,
      'content': note.content,
      'isPinned': note.isPinned,
      'clientRevision': 1,
      'clientModifiedAt': DateTime.now().toIso8601String(),
      'isDeleted': false,
    });
  }

  void updateNote(NoteModel updatedNote) {
    state = [
      for (final n in state)
        if (n.id == updatedNote.id) updatedNote else n,
    ];
    LocalStorageService.instance.saveNotes(state);
    // Enqueue strictly text metadata into persistent local sync queue
    LocalStorageService.instance.enqueueCloudSyncItem({
      'id': updatedNote.id,
      'title': updatedNote.title,
      'content': updatedNote.content,
      'isPinned': updatedNote.isPinned,
      'clientRevision': 1,
      'clientModifiedAt': DateTime.now().toIso8601String(),
      'isDeleted': false,
    });
  }

  void deleteNote(String id) {
    state = state.where((n) => n.id != id).toList();
    LocalStorageService.instance.saveNotes(state);
    // Enqueue tombstone into persistent local sync queue
    LocalStorageService.instance.enqueueCloudSyncItem({
      'id': id,
      'title': '',
      'content': '',
      'isPinned': false,
      'clientRevision': 1,
      'clientModifiedAt': DateTime.now().toIso8601String(),
      'isDeleted': true,
    });
  }

  void togglePin(String id) {
    state = [
      for (final n in state)
        if (n.id == id) n.copyWith(isPinned: !n.isPinned) else n,
    ];
    LocalStorageService.instance.saveNotes(state);
    final target = state.where((n) => n.id == id).firstOrNull;
    if (target != null) {
      LocalStorageService.instance.enqueueCloudSyncItem({
        'id': target.id,
        'title': target.title,
        'content': target.content,
        'isPinned': target.isPinned,
        'clientRevision': 1,
        'clientModifiedAt': DateTime.now().toIso8601String(),
        'isDeleted': false,
      });
    }
  }
}

final notesProvider = StateNotifierProvider<NotesNotifier, List<NoteModel>>((ref) {
  return NotesNotifier();
});

// Tasks State Notifier
class TasksNotifier extends StateNotifier<List<TaskModel>> {
  TasksNotifier() : super([]);

  void setTasks(List<TaskModel> tasks) {
    state = tasks;
    LocalStorageService.instance.saveTasks(state);
  }

  void addTask(TaskModel task) {
    state = [task, ...state];
    LocalStorageService.instance.saveTasks(state);
    ApiClient.instance.createTask(
      title: task.title,
      priority: task.priority.toUpperCase(),
      dueTimeStr: task.dueTime,
      projectId: task.project,
    ).catchError((_) => null);
  }

  void toggleTask(String id) {
    state = [
      for (final t in state)
        if (t.id == id) t.copyWith(isCompleted: !t.isCompleted) else t,
    ];
    LocalStorageService.instance.saveTasks(state);
    ApiClient.instance.toggleTask(id).catchError((_) => false);
  }

  void deleteTask(String id) {
    state = state.where((t) => t.id != id).toList();
    LocalStorageService.instance.saveTasks(state);
    ApiClient.instance.deleteTask(id).catchError((_) => false);
  }

  void addExtractedTasks(
    List<dynamic> rawTasks, {
    String project = 'Quick Capture',
    String? sourceNote,
  }) {
    final existingTitles = state.map((t) => t.title.trim().toLowerCase()).toSet();
    final newTasks = <TaskModel>[];

    for (final item in rawTasks) {
      String title = '';
      String? description;
      String priority = 'high';
      String dueTime = 'Tomorrow';
      String? category;
      int? stepNumber;
      String? taskType;

      if (item is TaskModel) {
        title = item.title;
        description = item.description;
        priority = item.priority;
        dueTime = item.dueTime;
        category = item.category;
        stepNumber = item.stepNumber;
        taskType = item.taskType;
      } else if (item is Map) {
        title = (item['title'] ?? item['task'] ?? item['instruction'] ?? '').toString().trim();
        description = item['description']?.toString();
        priority = (item['priority']?.toString().toLowerCase()) ?? 'medium';
        dueTime = (item['dueDate'] ?? item['dueTime'] ?? 'Tomorrow').toString();
        category = item['category']?.toString();
        stepNumber = item['stepNumber'] is int ? item['stepNumber'] as int : null;
        taskType = item['taskType']?.toString();
      } else if (item is String) {
        title = item.trim();
      }

      if (title.isEmpty) continue;

      final normalizedTitle = title.toLowerCase();
      if (existingTitles.contains(normalizedTitle)) {
        continue;
      }
      existingTitles.add(normalizedTitle);

      final taskModel = TaskModel(
        id: '${DateTime.now().millisecondsSinceEpoch}_${title.hashCode.abs()}',
        title: title,
        project: project,
        sourceNote: sourceNote,
        priority: priority.toLowerCase(),
        dueTime: dueTime,
        isAiExtracted: true,
        isCompleted: false,
        description: description,
        category: category,
        stepNumber: stepNumber,
        taskType: taskType,
      );

      newTasks.add(taskModel);

      ApiClient.instance.createTask(
        title: title,
        description: description,
        priority: priority.toUpperCase(),
        dueTimeStr: dueTime,
        projectId: project,
      ).catchError((_) => null);
    }

    if (newTasks.isNotEmpty) {
      state = [...newTasks, ...state];
      LocalStorageService.instance.saveTasks(state);
    }
  }
}

final tasksProvider = StateNotifierProvider<TasksNotifier, List<TaskModel>>((ref) {
  return TasksNotifier();
});

// Projects State Notifier
class ProjectsNotifier extends StateNotifier<List<ProjectModel>> {
  ProjectsNotifier() : super([]);

  void setProjects(List<ProjectModel> projects) {
    state = projects;
    LocalStorageService.instance.saveProjects(state);
  }

  void addProject(ProjectModel project) {
    state = [project, ...state];
    LocalStorageService.instance.saveProjects(state);
  }

  void updateProject(ProjectModel updated) {
    state = [
      for (final p in state)
        if (p.id == updated.id) updated else p,
    ];
    LocalStorageService.instance.saveProjects(state);
  }
}

final projectsProvider = StateNotifierProvider<ProjectsNotifier, List<ProjectModel>>((ref) {
  return ProjectsNotifier();
});

// Smart Lists State Notifier
class SmartListsNotifier extends StateNotifier<List<SmartListModel>> {
  SmartListsNotifier() : super([]);

  void addList(SmartListModel list) {
    state = [list, ...state];
    LocalStorageService.instance.saveSmartLists(state);
  }

  void toggleItem(String listId, String itemId) {
    state = [
      for (final l in state)
        if (l.id == listId)
          l.copyWith(
            items: [
              for (final item in l.items)
                if (item.id == itemId)
                  item.copyWith(isCompleted: !item.isCompleted)
                else
                  item,
            ],
          )
        else
          l,
    ];
    LocalStorageService.instance.saveSmartLists(state);
  }

  void addItem(String listId, String content) {
    if (content.trim().isEmpty) return;
    state = [
      for (final l in state)
        if (l.id == listId)
          l.copyWith(
            items: [
              ...l.items,
              SmartListItemModel(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                content: content.trim(),
                isCompleted: false,
              ),
            ],
          )
        else
          l,
    ];
    LocalStorageService.instance.saveSmartLists(state);
  }

  void generateAiList(String promptTitle, List<String> generatedItems) {
    final newList = SmartListModel(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: promptTitle,
      isAiGenerated: true,
      items: generatedItems.map((text) {
        return SmartListItemModel(
          id: DateTime.now().millisecondsSinceEpoch.toString() + text.hashCode.toString(),
          content: text,
          isCompleted: false,
        );
      }).toList(),
    );
    state = [newList, ...state];
    LocalStorageService.instance.saveSmartLists(state);
  }
}

final smartListsProvider = StateNotifierProvider<SmartListsNotifier, List<SmartListModel>>((ref) {
  return SmartListsNotifier();
});

// ==========================================
// Notifications State Notifier
// ==========================================
class NotificationsNotifier extends StateNotifier<List<NotificationModel>> {
  NotificationsNotifier() : super([]) {
    loadNotifications();
  }

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> loadNotifications({bool? unreadOnly, String? category}) async {
    _isLoading = true;
    try {
      final list = await ApiClient.instance.fetchNotifications(
        unreadOnly: unreadOnly,
        category: category,
      );
      state = list;
    } catch (_) {
      // Keep existing state on error
    } finally {
      _isLoading = false;
    }
  }

  Future<void> markAsRead(String id) async {
    final success = await ApiClient.instance.markNotificationRead(id);
    if (success) {
      state = [
        for (final n in state)
          if (n.id == id) n.copyWith(readAt: DateTime.now()) else n,
      ];
    }
  }

  Future<void> markAllAsRead() async {
    final success = await ApiClient.instance.markAllNotificationsRead();
    if (success) {
      final now = DateTime.now();
      state = [
        for (final n in state)
          if (n.readAt == null) n.copyWith(readAt: now) else n,
      ];
    }
  }

  Future<void> deleteNotification(String id) async {
    final success = await ApiClient.instance.deleteNotification(id);
    if (success) {
      state = state.where((n) => n.id != id).toList();
    }
  }
}

final notificationsProvider = StateNotifierProvider<NotificationsNotifier, List<NotificationModel>>((ref) {
  return NotificationsNotifier();
});

final unreadNotificationCountProvider = Provider<int>((ref) {
  final list = ref.watch(notificationsProvider);
  return list.where((n) => !n.isRead).length;
});

// ==========================================
// Reminders State Notifier
// ==========================================
class RemindersNotifier extends StateNotifier<List<ReminderModel>> {
  RemindersNotifier() : super([]) {
    loadReminders();
  }

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> loadReminders({String? status, String? noteId, String? taskId}) async {
    _isLoading = true;
    try {
      final list = await ApiClient.instance.fetchReminders(
        status: status,
        noteId: noteId,
        taskId: taskId,
      );
      state = list;
    } catch (_) {
      // Keep existing state on error
    } finally {
      _isLoading = false;
    }
  }

  Future<ReminderModel?> addReminder({
    required String title,
    String? description,
    required DateTime remindAt,
    String? noteId,
    String? taskId,
    String? meetingId,
    String? voiceNoteId,
    String recurrenceRule = 'NONE',
    String? timezone,
  }) async {
    final created = await ApiClient.instance.createReminder(
      title: title,
      description: description,
      remindAt: remindAt,
      noteId: noteId,
      taskId: taskId,
      meetingId: meetingId,
      voiceNoteId: voiceNoteId,
      recurrenceRule: recurrenceRule,
      timezone: timezone,
    );
    if (created != null) {
      state = [created, ...state];
    }
    return created;
  }

  Future<void> snoozeReminder(String id, {int minutes = 15, DateTime? customUntil}) async {
    final updated = await ApiClient.instance.snoozeReminder(id, minutes: minutes, customUntil: customUntil);
    if (updated != null) {
      state = [
        for (final r in state)
          if (r.id == id) updated else r,
      ];
    }
  }

  Future<void> completeReminder(String id) async {
    final updated = await ApiClient.instance.completeReminder(id);
    if (updated != null) {
      state = [
        for (final r in state)
          if (r.id == id) updated else r,
      ];
    }
  }

  Future<void> deleteReminder(String id) async {
    final success = await ApiClient.instance.deleteReminder(id);
    if (success) {
      state = state.where((r) => r.id != id).toList();
    }
  }
}

final remindersProvider = StateNotifierProvider<RemindersNotifier, List<ReminderModel>>((ref) {
  return RemindersNotifier();
});

