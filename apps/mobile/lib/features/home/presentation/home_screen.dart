import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/providers/app_state_providers.dart';
import 'widgets/quick_capture_bar.dart';
import 'widgets/today_metric_cards.dart';
import 'widgets/daily_briefing_card.dart';
import 'widgets/continue_project_card.dart';
import 'widgets/recent_notes_list.dart';
import '../../tasks/presentation/tasks_screen.dart';
import '../../notes/presentation/notes_screen.dart';
import '../../notes/presentation/note_editor_screen.dart';
import '../../notes/presentation/ai_extract_sheet.dart';
import '../../ai_assistant/presentation/ask_notes_screen.dart';
import '../../meeting/presentation/meeting_mode_screen.dart';
import '../../settings/presentation/settings_screen.dart';
import '../../settings/presentation/account_profile_screen.dart';
import '../../projects/presentation/project_detail_screen.dart';
import '../../graph/presentation/knowledge_graph_screen.dart';
import '../../briefing/presentation/daily_briefing_dialog.dart';
import '../../voice/presentation/voice_capture_sheet.dart';
import 'package:image_picker/image_picker.dart';
import '../../ads/presentation/native_ad_card.dart';
import '../../../../core/services/ocr_service.dart';
import '../../../../core/network/api_client.dart';

class HomeScreen extends ConsumerStatefulWidget {
  final VoidCallback? onOpenSearch;
  final VoidCallback? onOpenMeetingMode;
  final VoidCallback? onOpenPaywall;
  final Function(int index)? onNavTap;

  const HomeScreen({
    super.key,
    this.onOpenSearch,
    this.onOpenMeetingMode,
    this.onOpenPaywall,
    this.onNavTap,
  });

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  int _currentNavIndex = 0;

  void _onSelectTab(int index) {
    setState(() => _currentNavIndex = index);
    widget.onNavTap?.call(index);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.background,
      body: Stack(
        children: [
          // Active Tab Content
          _buildActiveTab(context, isDark),

          // Floating Island Capsule Nav Bar
          Positioned(
            left: 0,
            right: 0,
            bottom: 22,
            child: Align(
              alignment: Alignment.bottomCenter,
              child: _buildBottomNav(context, isDark),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActiveTab(BuildContext context, bool isDark) {
    switch (_currentNavIndex) {
      case 1:
        return NotesScreen(onBack: () => _onSelectTab(0));
      case 2:
        return TasksScreen(
          onBack: () => _onSelectTab(0),
          onOpenSource: (id) => _onSelectTab(1),
        );
      case 3:
        return AskNotesScreen(
          onBack: () => _onSelectTab(0),
          bottomPadding: 88,
        );
      case 4:
        return SettingsScreen(onBack: () => _onSelectTab(0));
      default:
        return _buildHomeDashboard(context, isDark);
    }
  }

  Widget _buildHomeDashboard(BuildContext context, bool isDark) {
    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          // Minimalist Executive App Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // User Avatar & App Brand
                  Expanded(
                    child: Row(
                      children: [
                        GestureDetector(
                          onTap: () => _onSelectTab(4),
                          child: Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                                width: 0.6,
                              ),
                            ),
                            alignment: Alignment.center,
                            child: Consumer(
                              builder: (context, ref, _) {
                                final p = ref.watch(userProfileProvider);
                                final initial = p.fullName.isNotEmpty
                                    ? p.fullName[0].toUpperCase()
                                    : (p.email.isNotEmpty ? p.email[0].toUpperCase() : 'M');
                                return Text(
                                  initial,
                                  style: TextStyle(
                                    color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 13,
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'MINDORA',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 1.3,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 1),
                              Text(
                                'Second Brain Synchronized',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                  fontWeight: FontWeight.w400,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  // Action Controls (Meeting Voice trigger & Pro Token)
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: widget.onOpenMeetingMode ?? () => _openMeetingMode(context),
                        icon: Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                              width: 0.6,
                            ),
                          ),
                          child: Icon(
                            Icons.graphic_eq_rounded,
                            size: 15,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                          ),
                        ),
                        tooltip: 'Meeting Live Capture',
                      ),
                      IconButton(
                        visualDensity: VisualDensity.compact,
                        onPressed: widget.onOpenPaywall,
                        icon: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4.5),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                              width: 0.6,
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.star_rounded,
                                size: 12,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                              ),
                              const SizedBox(width: 3.5),
                              Text(
                                'PRO',
                                style: TextStyle(
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Command Omnibar Search & Today's Focus
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 6, 20, 10),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Minimalist Command Search Bar
                  InkWell(
                    onTap: widget.onOpenSearch ?? () => _onSelectTab(3),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                          width: 0.6,
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.search_rounded,
                            color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                            size: 17,
                          ),
                          const SizedBox(width: 9),
                          Expanded(
                            child: Text(
                              'Search notes, decisions, audio...',
                              style: TextStyle(
                                color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                fontSize: 13,
                                fontWeight: FontWeight.w400,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                              borderRadius: BorderRadius.circular(5),
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                                width: 0.5,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.keyboard_command_key_rounded,
                                  size: 10.5,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  'K',
                                  style: TextStyle(
                                    fontSize: 9.5,
                                    fontWeight: FontWeight.w600,
                                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 14),

                  // Clean status line
                  Consumer(
                    builder: (context, ref, _) {
                      final tasks = ref.watch(tasksProvider);
                      final pendingTasks = tasks.where((t) => !t.isCompleted).toList();
                      final notes = ref.watch(notesProvider);

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Flexible(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 4,
                                      height: 4,
                                      decoration: BoxDecoration(
                                        color: isDark ? AppColors.emerald : const Color(0xFF059669),
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Flexible(
                                      child: Text(
                                        pendingTasks.isNotEmpty ? 'Focus session active' : 'Workspace ready',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w500,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Synced just now',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w400,
                                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            pendingTasks.isNotEmpty
                                ? pendingTasks.first.title
                                : (notes.isNotEmpty ? notes.first.title : 'Welcome to Mindora'),
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w600,
                              letterSpacing: -0.3,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            pendingTasks.isNotEmpty
                                ? '${pendingTasks.length} pending action ${pendingTasks.length == 1 ? 'item' : 'items'} queued for today.'
                                : (notes.isNotEmpty
                                    ? '${notes.length} notes captured in your Second Brain.'
                                    : 'Your Second Brain is ready. Capture your first thought below.'),
                            style: TextStyle(
                              fontSize: 12.5,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                              fontWeight: FontWeight.w400,
                              height: 1.35,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 5-Pill Quick Capture Selector
          SliverToBoxAdapter(
            child: QuickCaptureBar(
              onCaptureSelected: (mode) => _handleCaptureMode(context, mode),
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 10)),

          // Bento Pulse Metrics
          SliverToBoxAdapter(
            child: Consumer(
              builder: (context, ref, _) {
                final tasks = ref.watch(tasksProvider);
                final pendingTasks = tasks.where((t) => !t.isCompleted).toList();
                return TodayMetricCards(
                  taskCount: pendingTasks.length,
                  eventCount: 0,
                  reminderCount: pendingTasks.isNotEmpty ? 1 : 0,
                  onSeeAll: () => _onSelectTab(2),
                  onTapActions: () => _onSelectTab(2),
                  onTapAudio: () => _openMeetingMode(context),
                  onTapSynapse: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const KnowledgeGraphScreen()),
                    );
                  },
                );
              },
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 14)),

          // AI Neural Daily Synthesis Card
          SliverToBoxAdapter(
            child: Consumer(
              builder: (context, ref, _) {
                final tasks = ref.watch(tasksProvider);
                final pendingTasks = tasks.where((t) => !t.isCompleted).toList();
                return DailyBriefingCard(
                  headline: pendingTasks.isNotEmpty
                      ? 'Focus for today: ${pendingTasks.first.title}'
                      : 'Welcome to Mindora! Your Second Brain is ready.',
                  insight: pendingTasks.isNotEmpty
                      ? 'You have ${pendingTasks.length} tasks pending completion.'
                      : 'Capture a note or record an audio meeting to populate your daily brief.',
                  onViewBriefing: () {
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => const DailyBriefingDialog(),
                    );
                  },
                );
              },
            ),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 10)),

          // Active Thread Card (shown only if projects exist)
          Consumer(
            builder: (context, ref, _) {
              final projects = ref.watch(projectsProvider);
              if (projects.isEmpty) {
                return const SliverToBoxAdapter(child: SizedBox.shrink());
              }
              final proj = projects.first;
              return SliverToBoxAdapter(
                child: ContinueProjectCard(
                  projectName: proj.name,
                  activeTask: proj.description,
                  progress: 0.5,
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => ProjectDetailScreen(
                          projectId: proj.id,
                        ),
                      ),
                    );
                  },
                ),
              );
            },
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 6)),

          // Native Sponsored Card (for Free tier users, suppressed for Pro)
          const SliverToBoxAdapter(
            child: NativeAdCard(),
          ),

          const SliverToBoxAdapter(child: SizedBox(height: 6)),

          // Indexed Recent Notes List
          SliverToBoxAdapter(
            child: RecentNotesList(
              onSeeAll: () => _onSelectTab(1),
              onNoteTap: (id) {
                try {
                  final notes = ProviderScope.containerOf(context, listen: false).read(notesProvider);
                  final note = notes.where((n) => n.id == id).firstOrNull;
                  if (note != null) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => NoteEditorScreen(
                          noteId: note.id,
                          initialTitle: note.title,
                          initialContent: note.content,
                          tag: note.tag,
                          tagColor: note.tagColor,
                          initialImagePaths: note.imagePaths,
                          initialAudioPath: note.audioPath,
                        ),
                      ),
                    );
                    return;
                  }
                } catch (_) {}
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const NoteEditorScreen(),
                  ),
                );
              },
            ),
          ),

          // Bottom clearance for floating capsule dock
          const SliverToBoxAdapter(child: SizedBox(height: 110)),
        ],
      ),
    );
  }

  void _openMeetingMode(BuildContext context) {
    final isPro = ref.read(isProProvider);
    if (!isPro) {
      _showMeetingModeProGateModal(context);
      return;
    }
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MeetingModeScreen()),
    );
  }

  void _showMeetingModeProGateModal(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (ctx) => Container(
        padding: const EdgeInsets.fromLTRB(24, 20, 24, 34),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF131722) : Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          border: Border.all(
            color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
            width: 0.8,
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.white24,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.matrixEmerald.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.matrixEmerald.withValues(alpha: 0.4), width: 0.8),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_rounded, size: 12, color: AppColors.matrixEmerald),
                  SizedBox(width: 5),
                  Text(
                    'PRO FEATURE',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                      color: AppColors.matrixEmerald,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Text(
              'Meeting Mode is available with Pro',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Capture multi-speaker conversations, transcribe audio in real-time, and extract executive summaries, decisions, and action items automatically.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 0,
                ),
                onPressed: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (context) => const AccountProfileScreen()),
                  );
                },
                child: const Text('Upgrade to Pro', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
              ),
            ),
            const SizedBox(height: 10),
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(
                'Maybe Not Now',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleCaptureMode(BuildContext context, String mode) async {
    if (mode == 'write') {
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => const NoteEditorScreen(
            noteId: 'new',
            initialTitle: '',
            initialContent: '',
            tag: 'NOTE',
            tagColor: AppColors.pillWriteTextDark,
          ),
        ),
      );
    } else if (mode == 'voice') {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (context) => const VoiceCaptureSheet(),
      );
    } else if (mode == 'meeting') {
      _openMeetingMode(context);
    } else if (mode == 'list') {
      _onSelectTab(2);
    } else if (mode == 'photo') {
      try {
        final picker = ImagePicker();
        final pickedFile = await picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 85,
        );
        if (pickedFile != null && context.mounted) {
          final now = DateTime.now();
          final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
          
          if (context.mounted) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            );
          }

          String extractedText = '';
          try {
            final scanResult = await OcrService.instance.extractStructuredFromImage(pickedFile.path);
            extractedText = scanResult.rawText;

            // Authoritative server persistence & quota tracking
            ApiClient.instance.saveScannedDocument(
              extractedText: scanResult.rawText,
              imageUrl: pickedFile.path,
              structuredData: scanResult.toJson(),
              confidenceScore: scanResult.confidenceScore,
              documentType: scanResult.documentType,
            ).catchError((_) => <String, dynamic>{});
          } catch (e) {
            extractedText = '';
          }

          if (context.mounted) {
            Navigator.of(context, rootNavigator: true).pop(); // dismiss loading
          }

          if (extractedText.trim().isEmpty) {
            extractedText = 'No text detected in image. Image saved at $timeStr.';
          }

          if (context.mounted) {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (context) => AiExtractSheet(
                imagePath: pickedFile.path,
                rawThought: extractedText,
              ),
            );
          }
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Camera access notice: $e')),
          );
        }
      }
    } else {
      // scan document from gallery or camera
      try {
        final picker = ImagePicker();
        final pickedFile = await picker.pickImage(
          source: ImageSource.gallery,
          imageQuality: 85,
        );
        if (pickedFile != null && context.mounted) {
          final now = DateTime.now();
          final timeStr = '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
          
          if (context.mounted) {
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (ctx) => const Center(
                child: CircularProgressIndicator(color: AppColors.primary),
              ),
            );
          }

          String extractedText = '';
          try {
            final scanResult = await OcrService.instance.extractStructuredFromImage(pickedFile.path);
            extractedText = scanResult.rawText;

            // Authoritative server persistence & quota tracking
            ApiClient.instance.saveScannedDocument(
              extractedText: scanResult.rawText,
              imageUrl: pickedFile.path,
              structuredData: scanResult.toJson(),
              confidenceScore: scanResult.confidenceScore,
              documentType: scanResult.documentType,
            ).catchError((_) => <String, dynamic>{});
          } catch (e) {
            extractedText = '';
          }

          if (context.mounted) {
            Navigator.of(context, rootNavigator: true).pop(); // dismiss loading
          }

          if (extractedText.trim().isEmpty) {
            extractedText = 'No text detected in image. Document scanned at $timeStr.';
          }

          if (context.mounted) {
            showModalBottomSheet(
              context: context,
              isScrollControlled: true,
              backgroundColor: Colors.transparent,
              builder: (context) => AiExtractSheet(
                imagePath: pickedFile.path,
                rawThought: extractedText,
              ),
            );
          }
        }
      } catch (e) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Document scanner notice: $e')),
          );
        }
      }
    }
  }

  Widget _buildBottomNav(BuildContext context, bool isDark) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isCompact = screenWidth < 360;

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: (isDark ? const Color(0xFF10131B) : Colors.white).withValues(alpha: isDark ? 0.88 : 0.94),
        borderRadius: BorderRadius.circular(32),
        border: Border.all(
          color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: isDark ? 0.45 : 0.08),
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
          if (isDark)
            BoxShadow(
              color: const Color(0xFF6366F1).withValues(alpha: 0.04),
              blurRadius: 20,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(32),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 24, sigmaY: 24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 390),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: isCompact ? 8 : 12,
                vertical: 6,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildDockItem(
                    index: 0,
                    icon: Icons.grid_view_rounded,
                    label: 'Home',
                    isDark: isDark,
                    isCompact: isCompact,
                  ),
                  _buildDockItem(
                    index: 1,
                    icon: Icons.description_outlined,
                    activeIcon: Icons.description_rounded,
                    label: 'Notes',
                    isDark: isDark,
                    isCompact: isCompact,
                  ),
                  // Center Quick-Capture Action Jewel Button
                  _buildCenterActionButton(context, isDark, isCompact),
                  _buildDockItem(
                    index: 2,
                    icon: Icons.check_circle_outline_rounded,
                    activeIcon: Icons.check_circle_rounded,
                    label: 'Tasks',
                    isDark: isDark,
                    isCompact: isCompact,
                  ),
                  _buildAiChatDockItem(
                    isDark: isDark,
                    isCompact: isCompact,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDockItem({
    required int index,
    required IconData icon,
    IconData? activeIcon,
    required String label,
    required bool isDark,
    bool isCompact = false,
  }) {
    final isSelected = _currentNavIndex == index;

    return GestureDetector(
      onTap: () => _onSelectTab(index),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? (isCompact ? 10 : 14) : (isCompact ? 8 : 10),
          vertical: 7,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? (isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(100),
          border: isSelected
              ? Border.all(
                  color: isDark ? AppColors.darkBorderHighlight : AppColors.surfaceBorder,
                  width: 0.8,
                )
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isSelected ? (activeIcon ?? icon) : icon,
              size: isCompact ? 18 : 20,
              color: isSelected
                  ? (isDark ? Colors.white : AppColors.textPrimary)
                  : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: isDark ? Colors.white : AppColors.textPrimary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildAiChatDockItem({
    required bool isDark,
    bool isCompact = false,
  }) {
    final isSelected = _currentNavIndex == 3;

    return GestureDetector(
      onTap: () => _onSelectTab(3),
      behavior: HitTestBehavior.opaque,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOutCubic,
        padding: EdgeInsets.symmetric(
          horizontal: isSelected ? (isCompact ? 10 : 14) : (isCompact ? 8 : 10),
          vertical: 7,
        ),
        decoration: BoxDecoration(
          gradient: isSelected
              ? const LinearGradient(
                  colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                )
              : null,
          color: isSelected
              ? null
              : (isDark
                  ? const Color(0xFF6366F1).withValues(alpha: 0.12)
                  : const Color(0xFF6366F1).withValues(alpha: 0.08)),
          borderRadius: BorderRadius.circular(100),
          border: Border.all(
            color: isSelected
                ? Colors.white.withValues(alpha: 0.25)
                : const Color(0xFF6366F1).withValues(alpha: 0.28),
            width: 0.8,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: const Color(0xFF6366F1).withValues(alpha: 0.38),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.psychology_rounded,
              size: isCompact ? 18 : 20,
              color: isSelected
                  ? Colors.white
                  : (isDark ? const Color(0xFFA5B4FC) : const Color(0xFF6366F1)),
            ),
            if (isSelected) ...[
              const SizedBox(width: 6),
              Text(
                'AI Chat',
                style: TextStyle(
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                  color: Colors.white,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCenterActionButton(BuildContext context, bool isDark, bool isCompact) {
    return GestureDetector(
      onTap: () => _showCaptureBottomSheet(context),
      child: Container(
        width: isCompact ? 36 : 40,
        height: isCompact ? 36 : 40,
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFFF3F4F6) : AppColors.textPrimary,
          shape: BoxShape.circle,
          boxShadow: [
            BoxShadow(
              color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.15),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Icon(
          Icons.add_rounded,
          color: isDark ? Colors.black : Colors.white,
          size: isCompact ? 20 : 23,
        ),
      ),
    );
  }

  void _showCaptureBottomSheet(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.fromLTRB(20, 14, 20, 28),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(22)),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
              width: 0.6,
            ),
          ),
          child: SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'QUICK CAPTURE',
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Capture thoughts, voice, and documents',
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 14),
                _buildCaptureTile(
                  icon: Icons.edit_note_rounded,
                  title: 'Raw Thought / Note',
                  subtitle: 'Stream of consciousness or formatted text',
                  onTap: () {
                    Navigator.pop(context);
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const NoteEditorScreen(
                          noteId: 'new',
                          initialTitle: '',
                          initialContent: '',
                          tag: 'NOTE',
                          tagColor: AppColors.pillWriteTextDark,
                        ),
                      ),
                    );
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 8),
                _buildCaptureTile(
                  icon: Icons.mic_rounded,
                  title: 'Voice Whisper Memo',
                  subtitle: 'Transcribed in real-time with AI summaries',
                  onTap: () {
                    Navigator.pop(context);
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => const VoiceCaptureSheet(),
                    );
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 8),
                _buildCaptureTile(
                  icon: Icons.graphic_eq_rounded,
                  title: 'Meeting Intelligence Mode',
                  subtitle: 'Continuous audio recording with action items',
                  badge: 'PRO',
                  onTap: () {
                    Navigator.pop(context);
                    _openMeetingMode(context);
                  },
                  isDark: isDark,
                ),
                const SizedBox(height: 8),
                _buildCaptureTile(
                  icon: Icons.document_scanner_rounded,
                  title: 'Document & OCR Scan',
                  subtitle: 'Extract text, entities and dates from camera or files',
                  onTap: () {
                    Navigator.pop(context);
                    showModalBottomSheet(
                      context: context,
                      isScrollControlled: true,
                      backgroundColor: Colors.transparent,
                      builder: (context) => const AiExtractSheet(
                        rawThought: 'Contract scan: Scope of work signed for Q4 delivery.',
                      ),
                    );
                  },
                  isDark: isDark,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildCaptureTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
    String? badge,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
              width: 0.6,
            ),
          ),
          child: Row(
            children: [
              Icon(
                icon,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                size: 18,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.2,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        if (badge != null) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                            decoration: BoxDecoration(
                              color: isDark ? AppColors.darkSurface : Colors.white,
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(
                                color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                                width: 0.6,
                              ),
                            ),
                            child: Text(
                              badge,
                              style: TextStyle(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w700,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 11.5,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                size: 16,
                color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
              ),
            ],
          ),
        ),
      ),
    );
  }
}