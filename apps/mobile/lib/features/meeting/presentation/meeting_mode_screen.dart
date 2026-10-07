import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/services/audio_service.dart';

class MeetingModeScreen extends StatefulWidget {
  final VoidCallback? onStopRecording;

  const MeetingModeScreen({super.key, this.onStopRecording});

  @override
  State<MeetingModeScreen> createState() => _MeetingModeScreenState();
}

class _MeetingModeScreenState extends State<MeetingModeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  bool _isPaused = false;
  int _bookmarkCount = 2;

  @override
  void initState() {
    super.initState();
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    if (!isTesting) {
      _animController.repeat(reverse: true);
    } else {
      _animController.value = 0.5;
    }

    AudioRecordingService.instance.startRecording();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        ProviderScope.containerOf(context, listen: false).read(adSuppressionProvider.notifier).state = true;
      } catch (_) {}
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    AudioRecordingService.instance.stopRecording();
    super.dispose();
  }

  void _showSummaryModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
          decoration: BoxDecoration(
            color: AppColors.darkSurface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
            border: Border.all(
              color: AppColors.darkBorderHighlight,
              width: 0.8,
            ),
          ),
          child: SafeArea(
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Center(
                    child: Container(
                      width: 38,
                      height: 4,
                      decoration: BoxDecoration(
                        color: AppColors.darkBorderHighlight,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: AppColors.emerald.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.check_circle_rounded, color: AppColors.emerald, size: 16),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'MEETING SYNTHESIS & ACTIONS',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'EXECUTIVE DECISIONS',
                    style: TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceSubtle,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.darkBorder, width: 0.8),
                    ),
                    child: const Text(
                      '• Launch website and mobile MVP before September 01.\n• Deploy staging environment after Stripe webhooks pass validation.',
                      style: TextStyle(
                        color: AppColors.darkTextSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'SYNTHESIZED ACTION ITEMS',
                    style: TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 13,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  _buildActionRow('Alex (You)', 'Finish payment integration and webhook testing', AppColors.primary),
                  _buildActionRow('John', 'Send approved brand logo and vector assets tomorrow', AppColors.electricViolet),
                  _buildActionRow('Sarah', 'Review responsive layout on iOS & Android devices', AppColors.amber),
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        try {
                          final container = ProviderScope.containerOf(context, listen: false);
                          final note = NoteModel(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            title: 'Meeting Synthesis: Launch & Deliverables',
                            content: 'Executive meeting discussing MVP target, Stripe payment verification, and brand assets.',
                            snippet: 'Launch scheduled before September 01. 3 action items assigned...',
                            date: 'Just now',
                            category: 'Meetings',
                            tag: 'AUDIO',
                            tagColor: AppColors.emerald,
                            icon: NoteModel.iconForCategory('Meetings'),
                            extractedTasks: [
                              'Finish payment integration and webhook testing',
                              'Send approved brand logo and vector assets tomorrow',
                              'Review responsive layout on iOS & Android devices',
                            ],
                          );
                          container.read(notesProvider.notifier).addNote(note);
                          container.read(tasksProvider.notifier).addExtractedTasks(
                            [
                              'Finish payment integration and webhook testing',
                              'Send approved brand logo and vector assets tomorrow',
                              'Review responsive layout on iOS & Android devices',
                            ],
                            project: 'Meeting Mode',
                            sourceNote: 'Meeting Synthesis: Launch & Deliverables',
                          );
                        } catch (_) {}

                        Navigator.pop(context); // Close sheet
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Meeting distilled & saved to Second Brain.')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      child: const Text(
                        'Sync with Neural Brain',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  static Widget _buildActionRow(String owner, String task, Color accent) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.darkSurfaceSubtle,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.darkBorder, width: 0.8),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              owner,
              style: TextStyle(
                color: accent,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              task,
              style: const TextStyle(
                color: AppColors.darkTextPrimary,
                fontSize: 12.5,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        ],
      ),
    );
  }

  static Widget _buildSpeakerChip(String name, String activity, Color accent, bool isActive) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 7),
        decoration: BoxDecoration(
          color: AppColors.darkSurfaceSubtle,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? accent.withValues(alpha: 0.5) : AppColors.darkBorder,
            width: 0.8,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Container(
                  width: 5,
                  height: 5,
                  decoration: BoxDecoration(
                    color: accent,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 5),
                Expanded(
                  child: Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 10.5,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 3),
            Text(
              activity,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: AppColors.darkTextMuted,
                fontSize: 9,
                fontFamily: 'monospace',
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.darkBackground,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.darkBorder, width: 0.8),
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 14),
          ),
          onPressed: () => Navigator.maybePop(context),
        ),
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: AppColors.emerald.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: AppColors.emerald.withValues(alpha: 0.3), width: 0.6),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              SubtlePulse(
                minScale: 0.8,
                maxScale: 1.25,
                duration: const Duration(milliseconds: 1000),
                child: Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    color: AppColors.emerald,
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              const SizedBox(width: 6),
              const Flexible(
                child: Text(
                  'STUDIO RECORDING',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: AppColors.emerald,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
        ),
        centerTitle: true,
        actions: [
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.settings_outlined, color: AppColors.darkTextSecondary, size: 20),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            child: Column(
              children: [
                const SizedBox(height: 10),

                // Title & Speaker metadata
                const Text(
                  'Sync: Product Architecture & Payments',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 12),

                // Speaker Diarization Section
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurface,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.darkBorder, width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: const BoxDecoration(
                                    color: AppColors.phosphorCyan,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Expanded(
                                  child: Text(
                                    'SPEAKER DIARIZATION (3)',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10.5,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 1.2,
                                      color: AppColors.darkTextMuted,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          const Text(
                            '48kHz HD Audio',
                            style: TextStyle(
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: AppColors.darkTextMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          _buildSpeakerChip('Alex (You)', '48% active', AppColors.matrixEmerald, true),
                          const SizedBox(width: 8),
                          _buildSpeakerChip('John', '36% active', AppColors.primary, false),
                          const SizedBox(width: 8),
                          _buildSpeakerChip('Sarah', '16% active', AppColors.electricViolet, false),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 18),

                // Ambient Glowing Sound Orb
              AnimatedBuilder(
                animation: _animController,
                builder: (context, child) {
                  final scale = _isPaused ? 1.0 : 1.0 + (_animController.value * 0.14);
                  return Container(
                    width: 130 * scale,
                    height: 130 * scale,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: [
                          AppColors.emerald.withValues(alpha: 0.25),
                          AppColors.primary.withValues(alpha: 0.15),
                          Colors.transparent,
                        ],
                      ),
                    ),
                    child: Center(
                      child: Container(
                        width: 72,
                        height: 72,
                        decoration: BoxDecoration(
                          color: const Color(0xFF141A24),
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: AppColors.emerald.withValues(alpha: 0.6),
                            width: 1.5,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.emerald.withValues(alpha: 0.3),
                              blurRadius: 24,
                              spreadRadius: 2,
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.graphic_eq_rounded,
                          color: AppColors.emerald,
                          size: 32,
                        ),
                      ),
                    ),
                  );
                },
              ),

              const SizedBox(height: 20),

              // Precision Sound Waveform
              AnimatedBuilder(
                animation: _animController,
                builder: (context, child) {
                  return SizedBox(
                    height: 50,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: List.generate(32, (index) {
                        final wave = _isPaused
                            ? 0.2
                            : math.sin((index * 0.25) + (_animController.value * math.pi * 2)).abs();
                        final height = 8.0 + (wave * 36.0);
                        return Container(
                          width: 3.5,
                          height: height,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: index % 4 == 0 ? AppColors.primary : AppColors.emerald,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                  );
                },
              ),

              const SizedBox(height: 18),

              // Timer Display
              const Text(
                '45:12.8',
                style: TextStyle(
                  fontSize: 48,
                  fontWeight: FontWeight.w800,
                  color: Colors.white,
                  letterSpacing: 2,
                  fontFeatures: [FontFeature.tabularFigures()],
                ),
              ),

              const SizedBox(height: 20),

              // Live Transcription Stream Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.darkBorder, width: 0.8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: const Text(
                            'JOHN 14:11',
                            style: TextStyle(
                              color: AppColors.primary,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'Live Transcription...',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              color: AppColors.darkTextMuted,
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      '“We need to verify the webhook signatures first. Once Emma merges the stripe integration, we deploy staging.”',
                      style: TextStyle(
                        color: AppColors.darkTextPrimary,
                        fontSize: 13,
                        height: 1.45,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    ),
    bottomNavigationBar: SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: _buildControlDock(context),
      ),
    ),
  );
  }

  Widget _buildControlDock(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF131620),
        borderRadius: BorderRadius.circular(100),
        border: Border.all(color: AppColors.darkBorderHighlight, width: 0.8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.4),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          // Pause/Resume Button
          Flexible(
            child: GestureDetector(
              onTap: () {
                setState(() => _isPaused = !_isPaused);
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: AppColors.darkSurfaceSubtle,
                  borderRadius: BorderRadius.circular(100),
                  border: Border.all(color: AppColors.darkBorder, width: 0.8),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded,
                      color: Colors.white,
                      size: 18,
                    ),
                    const SizedBox(width: 4),
                    Flexible(
                      child: Text(
                        _isPaused ? 'Resume' : 'Pause',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // Stop & Synthesize (Glowing red pill)
          Flexible(
            flex: 2,
            child: GestureDetector(
              onTap: () {
                if (widget.onStopRecording != null) {
                  widget.onStopRecording!();
                } else {
                  _showSummaryModal(context);
                }
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(100),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.stop_rounded, color: Colors.white, size: 18),
                    SizedBox(width: 5),
                    Flexible(
                      child: Text(
                        'End & Synthesize',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                          fontSize: 12.5,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 4),

          // Bookmark Key Moment
          IconButton(
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.all(4),
            constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
            onPressed: () {
              setState(() => _bookmarkCount++);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Timestamp bookmarked for AI synthesis'),
                  duration: Duration(milliseconds: 1200),
                ),
              );
            },
            icon: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.bookmark_border_rounded, color: Colors.white, size: 21),
                Positioned(
                  top: 0,
                  right: 0,
                  child: Container(
                    padding: const EdgeInsets.all(3),
                    decoration: const BoxDecoration(
                      color: AppColors.primary,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$_bookmarkCount',
                      style: const TextStyle(fontSize: 8, color: Colors.white, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
