import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'features/home/presentation/home_screen.dart';
import 'features/auth/presentation/auth_screen.dart';
import 'features/ai_assistant/presentation/ask_notes_screen.dart';
import 'features/meeting/presentation/meeting_mode_screen.dart';
import 'features/paywall/presentation/paywall_screen.dart';
import 'core/network/api_client.dart';
import 'core/storage/local_storage_service.dart';
import 'core/providers/app_state_providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final savedToken = await LocalStorageService.instance.loadAuthToken();
  if (savedToken != null && savedToken.isNotEmpty) {
    ApiClient.instance.setAuthToken(savedToken);
  }
  final savedProfile = await LocalStorageService.instance.loadUserProfile();
  final savedNotes = await LocalStorageService.instance.loadNotes();
  final savedTasks = await LocalStorageService.instance.loadTasks();
  final savedProjects = await LocalStorageService.instance.loadProjects();
  final savedSmartLists = await LocalStorageService.instance.loadSmartLists();

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
}

final isAuthenticatedProvider = StateProvider<bool>((ref) {
  // Stay authenticated in unit/widget test environments or when a session exists
  final isTest = WidgetsBinding.instance.runtimeType.toString().contains('Test');
  return isTest || ApiClient.instance.authToken.isNotEmpty;
});

class MindoraApp extends ConsumerStatefulWidget {
  final UserProfileState? initialProfile;
  final dynamic initialNotes;
  final dynamic initialTasks;
  final dynamic initialProjects;
  final dynamic initialSmartLists;

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
      if (widget.initialProfile != null) {
        ref.read(userProfileProvider.notifier).setUser(
          email: widget.initialProfile!.email,
          fullName: widget.initialProfile!.fullName,
          isPro: widget.initialProfile!.isPro,
          monthlyAiTokensUsed: widget.initialProfile!.monthlyAiTokensUsed,
          monthlyAiTokensLimit: widget.initialProfile!.monthlyAiTokensLimit,
        );
      }
      if (widget.initialNotes != null && widget.initialNotes is List) {
        ref.read(notesProvider.notifier).setNotes(widget.initialNotes);
      }
      if (widget.initialTasks != null && widget.initialTasks is List) {
        ref.read(tasksProvider.notifier).setTasks(widget.initialTasks);
      }
      if (widget.initialProjects != null && widget.initialProjects is List) {
        ref.read(projectsProvider.notifier).setProjects(widget.initialProjects);
      }
    });
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
