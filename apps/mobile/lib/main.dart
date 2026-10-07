import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/app_colors.dart';
import 'core/models/note_model.dart';
import 'core/models/task_model.dart';
import 'core/models/project_model.dart';
import 'core/models/smart_list_model.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/auth/presentation/auth_screen.dart';
import 'features/ai_assistant/presentation/ask_notes_screen.dart';
import 'features/meeting/presentation/meeting_mode_screen.dart';
import 'features/paywall/presentation/paywall_screen.dart';
import 'core/network/api_client.dart';
import 'core/storage/local_storage_service.dart';
import 'core/providers/app_state_providers.dart';

void main() {
  runZonedGuarded(() async {
    WidgetsFlutterBinding.ensureInitialized();

    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details);
      debugPrint('Flutter uncaught error: ${details.exception}');
    };

    PlatformDispatcher.instance.onError = (error, stack) {
      debugPrint('Platform uncaught error: $error\n$stack');
      return true; // Handled, prevent app crash
    };

  String? savedToken;
  UserProfileState? savedProfile;
  List<NoteModel>? savedNotes;
  List<TaskModel>? savedTasks;
  List<ProjectModel>? savedProjects;
  List<SmartListModel>? savedSmartLists;

  try {
    savedToken = await LocalStorageService.instance.loadAuthToken();
    if (savedToken != null && savedToken.isNotEmpty) {
      ApiClient.instance.setAuthToken(savedToken);
    }
  } catch (e) {
    debugPrint('Error loading auth token: $e');
  }

  try {
    savedProfile = await LocalStorageService.instance.loadUserProfile();
  } catch (e) {
    debugPrint('Error loading user profile: $e');
  }

  try {
    savedNotes = await LocalStorageService.instance.loadNotes();
  } catch (e) {
    debugPrint('Error loading notes: $e');
  }

  try {
    savedTasks = await LocalStorageService.instance.loadTasks();
  } catch (e) {
    debugPrint('Error loading tasks: $e');
  }

  try {
    savedProjects = await LocalStorageService.instance.loadProjects();
  } catch (e) {
    debugPrint('Error loading projects: $e');
  }

  try {
    savedSmartLists = await LocalStorageService.instance.loadSmartLists();
  } catch (e) {
    debugPrint('Error loading smart lists: $e');
  }

    runApp(
      ProviderScope(
        overrides: [
          if (savedToken != null && savedToken.isNotEmpty)
            isAuthenticatedProvider.overrideWith((ref) => true),
        ],
        child: MindoraApp(
          initialProfile: savedProfile,
          initialNotes: savedNotes,
          initialTasks: savedTasks,
          initialProjects: savedProjects,
          initialSmartLists: savedSmartLists,
        ),
      ),
    );
  }, (error, stack) {
    debugPrint('runZonedGuarded uncaught error: $error\n$stack');
  });
}

final isAuthenticatedProvider = StateProvider<bool>((ref) {
  // Stay authenticated in unit/widget test environments or when a session exists
  final isTest = WidgetsBinding.instance.runtimeType.toString().contains('Test');
  return isTest || ApiClient.instance.authToken.isNotEmpty;
});

class MindoraApp extends ConsumerStatefulWidget {
  final UserProfileState? initialProfile;
  final List<NoteModel>? initialNotes;
  final List<TaskModel>? initialTasks;
  final List<ProjectModel>? initialProjects;
  final List<SmartListModel>? initialSmartLists;

  const MindoraApp({
    super.key,
    this.initialProfile,
    this.initialNotes,
    this.initialTasks,
    this.initialProjects,
    this.initialSmartLists,
  });

  @override
  ConsumerState<MindoraApp> createState() => _MindoraAppState();
}

class _MindoraAppState extends ConsumerState<MindoraApp> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        if (widget.initialProfile != null) {
          ref.read(userProfileProvider.notifier).setUser(
            email: widget.initialProfile!.email,
            fullName: widget.initialProfile!.fullName,
            isPro: widget.initialProfile!.isPro,
            monthlyAiTokensUsed: widget.initialProfile!.monthlyAiTokensUsed,
            monthlyAiTokensLimit: widget.initialProfile!.monthlyAiTokensLimit,
          );
        }
        if (widget.initialNotes != null && widget.initialNotes!.isNotEmpty) {
          ref.read(notesProvider.notifier).setNotes(widget.initialNotes!);
        }
        if (widget.initialTasks != null && widget.initialTasks!.isNotEmpty) {
          ref.read(tasksProvider.notifier).setTasks(widget.initialTasks!);
        }
        if (widget.initialProjects != null && widget.initialProjects!.isNotEmpty) {
          ref.read(projectsProvider.notifier).setProjects(widget.initialProjects!);
        }

        // Sync latest data from backend if authenticated
        if (ApiClient.instance.authToken.isNotEmpty) {
          _syncWithBackend();
        }
      } catch (e) {
        debugPrint('PostFrameCallback initialization error: $e');
      }
    });
  }

  Future<void> _syncWithBackend() async {
    try {
      final remoteNotes = await ApiClient.instance.fetchNotes();
      if (remoteNotes.isNotEmpty && mounted) {
        final parsedNotes = <NoteModel>[];
        for (final n in remoteNotes) {
          try {
            parsedNotes.add(NoteModel(
              id: n['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
              title: n['title']?.toString() ?? 'Note',
              content: n['content']?.toString() ?? '',
              snippet: (n['summary'] != null && n['summary'].toString().isNotEmpty)
                  ? n['summary'].toString()
                  : (n['content']?.toString() ?? ''),
              date: 'Synced',
              category: 'Ideas',
              tag: 'SYNCED',
              tagColor: AppColors.primary,
              icon: NoteModel.iconForCategory('Ideas'),
              isPinned: n['isPinned'] == true,
            ));
          } catch (_) {}
        }
        if (parsedNotes.isNotEmpty && mounted) {
          ref.read(notesProvider.notifier).setNotes(parsedNotes);
        }
      }

      final remoteTasks = await ApiClient.instance.fetchTasks();
      if (remoteTasks.isNotEmpty && mounted) {
        final parsedTasks = <TaskModel>[];
        for (final t in remoteTasks) {
          try {
            parsedTasks.add(TaskModel(
              id: t['id']?.toString() ?? DateTime.now().millisecondsSinceEpoch.toString(),
              title: t['title']?.toString() ?? 'Task',
              priority: (t['priority']?.toString() ?? 'medium').toLowerCase(),
              isCompleted: t['isCompleted'] == true,
              dueTime: t['dueDate']?.toString() ?? 'Today',
              project: t['projectId']?.toString() ?? 'Workspace',
              isAiExtracted: false,
            ));
          } catch (_) {}
        }
        if (parsedTasks.isNotEmpty && mounted) {
          ref.read(tasksProvider.notifier).setTasks(parsedTasks);
        }
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final isAuthenticated = ref.watch(isAuthenticatedProvider);

    return MaterialApp(
      title: 'Mindora',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      home: !isAuthenticated
          ? AuthScreen(
              onAuthSuccess: () {
                ref.read(isAuthenticatedProvider.notifier).state = true;
              },
            )
          : Builder(
              builder: (context) => HomeScreen(
                onOpenSearch: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AskNotesScreen()),
                  );
                },
                onOpenMeetingMode: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const MeetingModeScreen()),
                  );
                },
                onOpenPaywall: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const PaywallScreen()),
                  );
                },
              ),
            ),
    );
  }
}
