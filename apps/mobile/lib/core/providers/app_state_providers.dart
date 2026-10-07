import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/note_model.dart';
import '../models/task_model.dart';
import '../models/project_model.dart';
import '../models/smart_list_model.dart';
import '../storage/local_storage_service.dart';
import '../theme/app_colors.dart';

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
    this.fullName = 'Emmanuel Mensah',
    this.email = 'emmanuel@mindora.ai',
    this.isPro = false,
    this.monthlyAiTokensUsed = 18400,
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
  NotesNotifier()
      : super([
          const NoteModel(
            id: '1',
            title: 'Product Architecture & LLM Routing',
            snippet: 'Dynamic model fallback, token latency budgets & latency telemetry across Groq & Claude 3.5 Sonnet...',
            date: '10:30 AM',
            category: 'Architecture',
            tag: 'SYSTEM',
            tagColor: AppColors.primary,
            icon: Icons.insights_rounded,
            content:
                'Dynamic model fallback, token latency budgets & latency telemetry.\n\nKey decisions:\n1. Route fast queries to Groq / Llama 3 for sub-200ms latency.\n2. Complex vector reasoning routes to Anthropic Claude 3.5 Sonnet.\n3. Offline mobile cache will synchronize via SQLite Drift.\n\nNext steps: finalize database indexes and verify pgvector similarity performance.',
            isPinned: true,
            projectId: 'proj-mindora',
            extractedPeople: ['Emmanuel', 'Architecture Team'],
            extractedTasks: ['Verify sub-200ms latency', 'Finalize pgvector indexes'],
          ),
          const NoteModel(
            id: '2',
            title: 'Meeting with John (Stripe Webhook)',
            snippet: '45m audio recorded. 4 action items extracted and assigned regarding payment verification and asset approvals...',
            date: 'Yesterday',
            category: 'Meetings',
            tag: 'AUDIO',
            tagColor: AppColors.emerald,
            icon: Icons.graphic_eq_rounded,
            content:
                'Met John today about the website. He wants it live before September. Need to finish payment integration and he will send the new logo tomorrow.\n\nKey decisions:\n- Verify Stripe webhook signature handling before 1:30 PM.\n- Test the checkout redirection edge cases.\n- Review brand assets tomorrow.',
            projectId: 'proj-delivery',
            extractedPeople: ['John', 'Emmanuel', 'Sarah'],
            extractedTasks: [
              'Finish payment integration',
              'Verify Stripe webhook signature',
              'Follow up with John for logo'
            ],
          ),
          const NoteModel(
            id: '3',
            title: 'App Store Screenshots & Value Proposition',
            snippet: 'Highlighting instant thought capture and auto-extraction capabilities with minimal dark mode visuals...',
            date: 'Sep 20',
            category: 'Ideas',
            tag: 'DRAFT',
            tagColor: AppColors.amber,
            icon: Icons.edit_note_rounded,
            content:
                'Prepare App Store submission assets focusing on the minimalist aesthetic and instant AI context extraction.\n- Frame 1: Instant Capture\n- Frame 2: Meeting Mode Diarization\n- Frame 3: Neural Knowledge Graph',
            projectId: 'proj-mindora',
            extractedTasks: ['Prepare App Store submission assets', 'Capture iPad mockups'],
          ),
          const NoteModel(
            id: '4',
            title: 'Autonomous Knowledge Graph Synchronization',
            snippet: 'Multi-entity linking between meetings, tasks, and project deliverables with vector embeddings...',
            date: 'Sep 18',
            category: 'Architecture',
            tag: 'GRAPH',
            tagColor: AppColors.electricViolet,
            icon: Icons.hub_rounded,
            content:
                'Explore bi-directional link discovery between unstructured raw thought memos and project milestone nodes.\nConnect people, projects, notes, and tasks automatically with confidence score > 0.82.',
            projectId: 'proj-mindora',
          ),
        ]);

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
  TasksNotifier()
      : super([
          const TaskModel(
            id: '1',
            title: 'Finish Stripe payment webhook integration',
            project: 'Delivery App',
            sourceNote: 'Meeting with John (10:30 AM)',
            priority: 'high',
            dueTime: '14:00 Today',
            isAiExtracted: true,
            isCompleted: false,
          ),
          const TaskModel(
            id: '2',
            title: 'Review landing page draft & approve typography',
            project: 'Mindora Studio',
            sourceNote: 'Architecture Notes',
            priority: 'high',
            dueTime: '16:30 Today',
            isAiExtracted: true,
            isCompleted: false,
          ),
          const TaskModel(
            id: '3',
            title: 'Follow up with John regarding new logo assets',
            project: 'Delivery App',
            sourceNote: 'Meeting with John',
            priority: 'medium',
            dueTime: 'Tomorrow',
            isAiExtracted: true,
            isCompleted: false,
          ),
          const TaskModel(
            id: '4',
            title: 'Send monthly cloud infrastructure invoice',
            project: 'Finance',
            sourceNote: null,
            priority: 'medium',
            dueTime: 'Sep 28',
            isAiExtracted: false,
            isCompleted: false,
          ),
          const TaskModel(
            id: '5',
            title: 'Setup pgvector similarity embeddings indexing',
            project: 'Backend Core',
            sourceNote: 'Database Implementation Plan',
            priority: 'low',
            dueTime: 'Completed',
            isAiExtracted: true,
            isCompleted: true,
          ),
        ]);

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
  ProjectsNotifier()
      : super([
          const ProjectModel(
            id: 'proj-delivery',
            name: 'Delivery App',
            description: 'Hyperlocal rider logistics & customer checkout app.',
            colorHex: '#6366F1',
            icon: 'rocket_launch_rounded',
            aiSummary: 'You are currently working on the rider tracking and Stripe webhook payment systems. Milestone launch target is before September.',
            noteCount: 34,
            taskCount: 12,
            meetingCount: 4,
            people: ['John', 'Sarah', 'Emmanuel', 'Michael'],
            links: ['https://github.com/org/delivery-app', 'https://figma.com/file/delivery'],
            nextTasks: [
              'Fix payment webhook signature verification',
              'Test rider location tracking latency',
              'Review order flow redirection',
            ],
          ),
          const ProjectModel(
            id: 'proj-mindora',
            name: 'Mindora Studio v2.0',
            description: 'AI Second Brain mobile app and multi-provider LLM infrastructure.',
            colorHex: '#10B981',
            icon: 'auto_awesome_rounded',
            aiSummary: 'Designing neural canvas specs, offline Drift SQLite synchronization, and RevenueCat subscription flow.',
            noteCount: 18,
            taskCount: 8,
            meetingCount: 2,
            people: ['Emmanuel', 'AI Team'],
            links: ['https://mindora.ai', 'https://docs.mindora.ai'],
            nextTasks: [
              'Implement offline Drift SQLite sync',
              'Finalize audio frequency visualizer',
              'Verify RevenueCat paywall trial flow',
            ],
          ),
        ]);

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
  SmartListsNotifier()
      : super([
          const SmartListModel(
            id: 'list-1',
            title: 'Office Setup Essentials',
            isAiGenerated: true,
            items: [
              SmartListItemModel(id: 'l1', content: 'Ultra-wide 34" Monitor', isCompleted: true),
              SmartListItemModel(id: 'l2', content: 'Mechanical Keyboard (Low profile)', isCompleted: true),
              SmartListItemModel(id: 'l3', content: 'Ergonomic Desk Chair', isCompleted: false),
              SmartListItemModel(id: 'l4', content: 'Standing Desk Frame', isCompleted: false),
              SmartListItemModel(id: 'l5', content: 'Wi-Fi 6 Mesh Router', isCompleted: false),
              SmartListItemModel(id: 'l6', content: 'Cable Management Extension Board', isCompleted: false),
            ],
          ),
          const SmartListModel(
            id: 'list-2',
            title: 'Product Launch Checklist',
            isAiGenerated: true,
            items: [
              SmartListItemModel(id: 'l7', content: 'Generate Android APK & AAB release bundles', isCompleted: false),
              SmartListItemModel(id: 'l8', content: 'Prepare iOS App Store screenshots & review notes', isCompleted: false),
              SmartListItemModel(id: 'l9', content: 'Verify RevenueCat sandbox products', isCompleted: true),
              SmartListItemModel(id: 'l10', content: 'Enable AdMob test ad unit IDs', isCompleted: true),
            ],
          ),
        ]);

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
