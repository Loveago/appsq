import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/note_model.dart';
import '../models/task_model.dart';
import '../models/project_model.dart';
import '../models/smart_list_model.dart';
import '../storage/local_storage_service.dart';

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
    this.monthlyAiTokensLimit = 50000,
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
    int monthlyAiTokensLimit = 50000,
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

  void resetProfile() {
    state = const UserProfileState();
    LocalStorageService.instance.saveUserProfile(state);
  }

  void setPro(bool isPro) {
    state = state.copyWith(
      isPro: isPro,
      monthlyAiTokensLimit: isPro ? 2000000 : 50000,
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

// Notes State Notifier
class NotesNotifier extends StateNotifier<List<NoteModel>> {
  NotesNotifier() : super([]);

  void setNotes(List<NoteModel> notes) {
    state = notes;
    LocalStorageService.instance.saveNotes(state);
  }

  void addNote(NoteModel note) {
    state = [note, ...state];
    LocalStorageService.instance.saveNotes(state);
  }

  void updateNote(NoteModel updatedNote) {
    state = [
      for (final n in state)
        if (n.id == updatedNote.id) updatedNote else n,
    ];
    LocalStorageService.instance.saveNotes(state);
  }

  void deleteNote(String id) {
    state = state.where((n) => n.id != id).toList();
    LocalStorageService.instance.saveNotes(state);
  }

  void togglePin(String id) {
    state = [
      for (final n in state)
        if (n.id == id) n.copyWith(isPinned: !n.isPinned) else n,
    ];
    LocalStorageService.instance.saveNotes(state);
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
  }

  void toggleTask(String id) {
    state = [
      for (final t in state)
        if (t.id == id) t.copyWith(isCompleted: !t.isCompleted) else t,
    ];
    LocalStorageService.instance.saveTasks(state);
  }

  void deleteTask(String id) {
    state = state.where((t) => t.id != id).toList();
    LocalStorageService.instance.saveTasks(state);
  }

  void addExtractedTasks(List<String> titles, {String project = 'Quick Capture', String? sourceNote}) {
    final newTasks = titles.map((title) {
      return TaskModel(
        id: DateTime.now().millisecondsSinceEpoch.toString() + title.hashCode.toString(),
        title: title,
        project: project,
        sourceNote: sourceNote,
        priority: 'high',
        dueTime: 'Tomorrow',
        isAiExtracted: true,
        isCompleted: false,
      );
    }).toList();

    state = [...newTasks, ...state];
    LocalStorageService.instance.saveTasks(state);
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
