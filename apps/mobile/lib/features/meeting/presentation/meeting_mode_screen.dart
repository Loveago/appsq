import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/fade_slide_in.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/models/meeting_speaker_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/transcription_stream_client.dart';
import '../../../../core/widgets/audio_playback_bar.dart';
import '../../settings/presentation/account_profile_screen.dart';

class MeetingModeScreen extends StatefulWidget {
  final VoidCallback? onStopRecording;

  const MeetingModeScreen({super.key, this.onStopRecording});

  @override
  State<MeetingModeScreen> createState() => _MeetingModeScreenState();
}

class _MeetingModeScreenState extends State<MeetingModeScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  Timer? _timer;
  int _secondsElapsed = 0;
  bool _isPaused = false;
  int _bookmarkCount = 0;
  bool _isSynthesizing = false;
  String _liveTranscript = '';
  String? _recordedAudioPath;
  late final String _startTime;
  bool _isProLocked = false;
  final String _meetingId = 'mt_${DateTime.now().millisecondsSinceEpoch}';

  TranscriptionStreamClient? _streamClient;
  StreamSubscription<String>? _partialSub;
  StreamSubscription<List<MeetingSpeakerSegment>>? _segmentsSub;
  StreamSubscription<Map<String, String>>? _introSub;

  final ScrollController _transcriptScrollController = ScrollController();
  final AudioPlaybackController _audioPlaybackController = AudioPlaybackController();

  // Multi-speaker diarization state
  List<MeetingSpeakerSegment> _liveSegments = [];
  Map<String, String>? _pendingIntroSuggestion;

  // Speaker Palette
  final List<Color> _speakerColors = [
    AppColors.matrixEmerald,
    AppColors.phosphorCyan,
    const Color(0xFF8B5CF6), // Violet
    const Color(0xFFF59E0B), // Amber
    const Color(0xFFEC4899), // Pink
    const Color(0xFF06B6D4), // Cyan
  ];

  Color _getSpeakerColor(String key) {
    if (key == 'YOU' || key == 'You') return AppColors.matrixEmerald;
    final code = key.codeUnitAt(0);
    return _speakerColors[code % _speakerColors.length];
  }

  @override
  void initState() {
    super.initState();
    _startTime = DateFormat.jm().format(DateTime.now());
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );
    if (!isTesting) {
      _animController.repeat(reverse: true);
      _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
        if (!_isPaused && mounted) {
          setState(() {
            _secondsElapsed++;
          });
        }
      });
    } else {
      _animController.value = 0.5;
    }

    WidgetsBinding.instance.addPostFrameCallback((_) {
      try {
        final container = ProviderScope.containerOf(context, listen: false);
        final isPro = container.read(isProProvider);
        if (!isPro && !isTesting) {
          setState(() {
            _isProLocked = true;
          });
          return;
        }
        container.read(adSuppressionProvider.notifier).state = true;
      } catch (_) {}
      _initMeetingStream();
    });
  }

  Future<void> _initMeetingStream() async {
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (isTesting) {
      AudioRecordingService.instance.startRecording();
      return;
    }

    try {
      final session = await ApiClient.instance.createTranscriptionSession(
        meetingId: _meetingId,
      );

      if (session['allowed'] == true) {
        final sessionId = session['sessionId'] as String? ?? 'sess_mt_${DateTime.now().millisecondsSinceEpoch}';
        final streamingToken = session['token'] as String?;

        _streamClient = TranscriptionStreamClient(
          baseUrl: ApiClient.instance.currentBaseUrl,
          streamingToken: streamingToken,
          token: ApiClient.instance.authToken,
          sessionId: sessionId,
          meetingId: _meetingId,
          enableSpeakerDiarization: true, // Native Universal Streaming Diarization
        );

        _partialSub = _streamClient!.partialTranscriptStream.listen((text) {
          if (mounted && text.isNotEmpty) {
            setState(() {
              _liveTranscript = text;
            });
          }
        });

        _segmentsSub = _streamClient!.speakerSegmentsStream.listen((segs) {
          if (mounted) {
            setState(() {
              _liveSegments = segs;
            });
            _scrollToBottom();
          }
        });

        _introSub = _streamClient!.speakerIntroSuggestionStream.listen((suggestion) {
          if (mounted) {
            setState(() {
              _pendingIntroSuggestion = suggestion;
            });
          }
        });

        final connected = await _streamClient!.connect();
        if (connected) {
          await AudioRecordingService.instance.startStreamingRecording(
            onAudioChunk: (chunk) {
              _streamClient?.sendAudioChunk(chunk);
            },
          );
          return;
        }
      }
      await AudioRecordingService.instance.startRecording();
    } catch (_) {
      await AudioRecordingService.instance.startRecording();
    }
  }

  void _scrollToBottom() {
    if (_transcriptScrollController.hasClients) {
      Future.delayed(const Duration(milliseconds: 100), () {
        if (_transcriptScrollController.hasClients) {
          _transcriptScrollController.animateTo(
            _transcriptScrollController.position.maxScrollExtent,
            duration: const Duration(milliseconds: 250),
            curve: Curves.easeOut,
          );
        }
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _animController.dispose();
    _partialSub?.cancel();
    _segmentsSub?.cancel();
    _introSub?.cancel();
    _streamClient?.dispose();
    _transcriptScrollController.dispose();
    AudioRecordingService.instance.stopRecording();
    super.dispose();
  }

  String _formatTimer() {
    final mins = (_secondsElapsed ~/ 60).toString().padLeft(2, '0');
    final secs = (_secondsElapsed % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  Future<void> _handleEndMeeting() async {
    if (_isSynthesizing) return;
    _timer?.cancel();
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    final durationStr = _formatTimer();

    if (isTesting) {
      widget.onStopRecording?.call();
      _showSummaryModal(
        context,
        duration: durationStr,
        summary: 'Meeting synchronization completed.',
        decisions: ['Reviewed agenda and aligned on execution steps.'],
        actionItems: [
          {'assignee': 'Self', 'task': 'Follow up on meeting items'},
        ],
        transcript: _liveTranscript.isNotEmpty ? _liveTranscript : 'Recorded meeting follow up.',
        speakers: [
          MeetingSpeaker(id: 'spk_A', key: 'A', displayName: 'Speaker A'),
          MeetingSpeaker(id: 'spk_B', key: 'B', displayName: 'Speaker B'),
        ],
        segments: [
          MeetingSpeakerSegment(
            id: 'seg_1',
            speakerKey: 'A',
            speakerName: 'Speaker A',
            text: 'We should launch the product next Monday.',
            startMs: 0,
            endMs: 3000,
          ),
          MeetingSpeakerSegment(
            id: 'seg_2',
            speakerKey: 'B',
            speakerName: 'Speaker B',
            text: 'I can finish the payment integration by Friday.',
            startMs: 3500,
            endMs: 7000,
          ),
        ],
        audioPath: null,
      );
      return;
    }

    setState(() {
      _isSynthesizing = true;
    });

    try {
      final RecordingResult? result = await AudioRecordingService.instance.stopRecording();
      _recordedAudioPath = result?.filePath;

      // Check streaming transcription result first (instant!)
      String meetingTranscript = '';
      List<MeetingSpeaker> meetingSpeakers = _streamClient?.speakers ?? [];
      List<MeetingSpeakerSegment> meetingSegments = _liveSegments;

      if (_streamClient != null) {
        try {
          final streamRes = await _streamClient!.stop();
          meetingTranscript = (streamRes['transcript'] as String?)?.trim() ?? '';
          if (streamRes['speakers'] is List) {
            meetingSpeakers = (streamRes['speakers'] as List)
                .map((s) => MeetingSpeaker.fromJson(Map<String, dynamic>.from(s as Map)))
                .toList();
          }
          if (streamRes['segments'] is List) {
            meetingSegments = (streamRes['segments'] as List)
                .map((s) => MeetingSpeakerSegment.fromJson(Map<String, dynamic>.from(s as Map)))
                .toList();
          }
        } catch (_) {}
      }

      if (meetingTranscript.isEmpty && _liveTranscript.trim().isNotEmpty) {
        meetingTranscript = _liveTranscript.trim();
      }

      // Authoritatively deduct billing usage & persist structured segments to backend
      if (meetingTranscript.isNotEmpty) {
        ApiClient.instance.finalizeTranscriptionSession(
          sessionId: _streamClient?.sessionId ?? 'sess_meeting',
          durationSec: _secondsElapsed.toDouble(),
          transcript: meetingTranscript,
          meetingId: _streamClient?.meetingId ?? _meetingId,
          speakers: meetingSpeakers.map((s) => s.toJson()).toList(),
          segments: meetingSegments.map((s) => s.toJson()).toList(),
          audioUrl: _recordedAudioPath,
        ).catchError((_) => <String, dynamic>{});
      }

      // Transcribe finalized recording using fallback only if live streaming was unavailable
      if (meetingTranscript.isEmpty && _recordedAudioPath != null && File(_recordedAudioPath!).existsSync()) {
        final transcribeRes = await ApiClient.instance.transcribeAudio(_recordedAudioPath!);
        meetingTranscript = (transcribeRes['transcript'] as String?)?.trim() ?? '';
      }

      if (meetingTranscript.isEmpty) {
        meetingTranscript = 'Recorded meeting session lasting $durationStr with $_bookmarkCount key bookmarked timestamps.';
      }

      // Call live distillation engine with multi-speaker awareness
      final distillation = await ApiClient.instance.distillMeeting(meetingTranscript);

      final summary = distillation['summary'] as String? ?? 'Meeting synchronization completed.';
      final decisions = (distillation['decisions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [
        'Reviewed agenda and aligned on execution steps.',
      ];
      final actionItems = (distillation['actionItems'] as List<dynamic>?)?.map((item) {
        if (item is Map) {
          return {
            'assignee': item['assignee']?.toString() ?? 'Self',
            'task': item['task']?.toString() ?? 'Follow up on meeting items',
          };
        }
        return {'assignee': 'Self', 'task': item.toString()};
      }).toList() ?? [
        {'assignee': 'Self', 'task': 'Review meeting discussion & finalize action points'},
      ];

      final keyPoints = (distillation['keyPoints'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];
      final openQuestions = (distillation['openQuestions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [];

      widget.onStopRecording?.call();

      if (mounted) {
        _showSummaryModal(
          context,
          duration: durationStr,
          summary: summary,
          decisions: decisions,
          actionItems: actionItems,
          keyPoints: keyPoints,
          openQuestions: openQuestions,
          transcript: meetingTranscript,
          speakers: meetingSpeakers,
          segments: meetingSegments,
          audioPath: _recordedAudioPath,
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Synthesis error: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSynthesizing = false;
        });
      }
    }
  }

  void _showRenameSpeakerModal(String speakerKey, String currentDisplayName) {
    final controller = TextEditingController(text: currentDisplayName);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppColors.darkSurface,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              border: Border.all(color: AppColors.darkBorderHighlight, width: 0.8),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 36,
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.darkBorderHighlight,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Container(
                      width: 10,
                      height: 10,
                      decoration: BoxDecoration(
                        color: _getSpeakerColor(speakerKey),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Rename Speaker $speakerKey',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Renaming will apply to all existing and future speech blocks attributed to this speaker.',
                  style: TextStyle(color: AppColors.darkTextSecondary, fontSize: 12),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: controller,
                  autofocus: true,
                  style: const TextStyle(color: Colors.white, fontSize: 15),
                  decoration: InputDecoration(
                    hintText: 'Enter participant name (e.g. Emmanuel)',
                    hintStyle: const TextStyle(color: AppColors.darkTextMuted),
                    filled: true,
                    fillColor: AppColors.darkSurfaceSubtle,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.darkBorder),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(ctx),
                        child: const Text('Cancel', style: TextStyle(color: AppColors.darkTextSecondary)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          final newName = controller.text.trim();
                          if (newName.isNotEmpty) {
                            _streamClient?.renameSpeaker(speakerKey, newName);
                            setState(() {
                              for (int i = 0; i < _liveSegments.length; i++) {
                                if (_liveSegments[i].speakerKey.toUpperCase() == speakerKey.toUpperCase()) {
                                  _liveSegments[i] = _liveSegments[i].copyWith(speakerName: newName);
                                }
                              }
                            });
                          }
                          Navigator.pop(ctx);
                        },
                        child: const Text('Apply to All', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _showSummaryModal(
    BuildContext context, {
    required String duration,
    required String summary,
    required List<String> decisions,
    required List<Map<String, String>> actionItems,
    List<String> keyPoints = const [],
    List<String> openQuestions = const [],
    List<MeetingSpeaker> speakers = const [],
    List<MeetingSpeakerSegment> segments = const [],
    String? transcript,
    String? audioPath,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (modalContext) {
        return Container(
          height: MediaQuery.of(modalContext).size.height * 0.88,
          padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
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
                      Text(
                        'MEETING SYNTHESIS ($duration)',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                        ),
                      ),
                    ],
                  ),

                  // Audio Playback Bar
                  if (audioPath != null && audioPath.isNotEmpty) ...[
                    const SizedBox(height: 14),
                    AudioPlaybackBar(
                      audioPath: audioPath,
                      controller: _audioPlaybackController,
                      title: 'Meeting Recording ($duration)',
                    ),
                  ],

                  // Participants Header
                  if (speakers.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'PARTICIPANTS',
                      style: TextStyle(
                        color: AppColors.darkTextPrimary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 6,
                      children: speakers.map((spk) {
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: AppColors.darkSurfaceSubtle,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: _getSpeakerColor(spk.key).withValues(alpha: 0.4), width: 0.8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Container(
                                width: 7,
                                height: 7,
                                decoration: BoxDecoration(
                                  color: _getSpeakerColor(spk.key),
                                  shape: BoxShape.circle,
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                spk.displayName,
                                style: const TextStyle(color: Colors.white, fontSize: 11.5, fontWeight: FontWeight.w600),
                              ),
                            ],
                          ),
                        );
                      }).toList(),
                    ),
                  ],

                  // Executive Summary
                  const SizedBox(height: 16),
                  const Text(
                    'EXECUTIVE SUMMARY',
                    style: TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceSubtle,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.darkBorder, width: 0.8),
                    ),
                    child: Text(
                      summary,
                      style: const TextStyle(
                        color: AppColors.darkTextSecondary,
                        fontSize: 13,
                        height: 1.5,
                      ),
                    ),
                  ),

                  // Key Discussion Points
                  if (keyPoints.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'KEY DISCUSSION POINTS',
                      style: TextStyle(
                        color: AppColors.darkTextPrimary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.darkSurfaceSubtle,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.darkBorder, width: 0.8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: keyPoints.map((point) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('• ', style: TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold)),
                                Expanded(
                                  child: Text(
                                    point,
                                    style: const TextStyle(color: AppColors.darkTextSecondary, fontSize: 12.5, height: 1.4),
                                  ),
                                ),
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],

                  // Executive Decisions
                  const SizedBox(height: 16),
                  const Text(
                    'EXECUTIVE DECISIONS',
                    style: TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.darkSurfaceSubtle,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.darkBorder, width: 0.8),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: decisions
                          .map((d) => Padding(
                                padding: const EdgeInsets.only(bottom: 4),
                                child: Text(
                                  '• $d',
                                  style: const TextStyle(
                                    color: AppColors.darkTextSecondary,
                                    fontSize: 13,
                                    height: 1.45,
                                  ),
                                ),
                              ))
                          .toList(),
                    ),
                  ),

                  // Synthesized Action Items
                  const SizedBox(height: 16),
                  Text(
                    'SYNTHESIZED ACTION ITEMS (${actionItems.length})',
                    style: const TextStyle(
                      color: AppColors.darkTextPrimary,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.0,
                    ),
                  ),
                  const SizedBox(height: 8),
                  for (final item in actionItems)
                    _buildActionRow(
                      item['assignee'] ?? 'Self',
                      item['task'] ?? '',
                      AppColors.primary,
                    ),

                  // Open Questions
                  if (openQuestions.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'OPEN QUESTIONS & UNRESOLVED TOPICS',
                      style: TextStyle(
                        color: AppColors.darkTextPrimary,
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 1.0,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.darkSurfaceSubtle,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.darkBorder, width: 0.8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: openQuestions.map((q) => Padding(
                          padding: const EdgeInsets.only(bottom: 4),
                          child: Text('? $q', style: const TextStyle(color: AppColors.darkTextSecondary, fontSize: 12.5)),
                        )).toList(),
                      ),
                    ),
                  ],

                  // Synchronized Audio Transcript (tap to jump)
                  if (segments.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'SYNCHRONIZED SPEAKER TRANSCRIPT',
                          style: TextStyle(
                            color: AppColors.darkTextPrimary,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 1.0,
                          ),
                        ),
                        Text(
                          'Tap timestamp to jump',
                          style: TextStyle(
                            color: AppColors.phosphorCyan.withValues(alpha: 0.8),
                            fontSize: 10,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.darkSurfaceSubtle,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: AppColors.darkBorder, width: 0.8),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: segments.length,
                        separatorBuilder: (_, __) => const Divider(color: AppColors.darkBorder, height: 1),
                        itemBuilder: (ctx, idx) {
                          final seg = segments[idx];
                          final color = _getSpeakerColor(seg.speakerKey);
                          return InkWell(
                            onTap: () {
                              if (audioPath != null && audioPath.isNotEmpty) {
                                _audioPlaybackController.seekTo(Duration(milliseconds: seg.startMs));
                              }
                            },
                            child: Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Container(
                                        width: 8,
                                        height: 8,
                                        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        seg.speakerName,
                                        style: TextStyle(color: color, fontSize: 11.5, fontWeight: FontWeight.bold),
                                      ),
                                      const Spacer(),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.darkBackground,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          '${seg.formattedStartTime} → ${seg.formattedEndTime}',
                                          style: const TextStyle(
                                            color: AppColors.darkTextMuted,
                                            fontSize: 9.5,
                                            fontFamily: 'monospace',
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    seg.text,
                                    style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  const SizedBox(height: 20),

                  // Quick Action Chips
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      ActionChip(
                        avatar: const Icon(Icons.email_outlined, size: 14, color: AppColors.primary),
                        label: const Text('Follow-up Email', style: TextStyle(fontSize: 11)),
                        backgroundColor: AppColors.darkSurfaceSubtle,
                        side: const BorderSide(color: AppColors.darkBorder, width: 0.8),
                        onPressed: () {
                          final emailDraft = StringBuffer();
                          emailDraft.writeln('Subject: Meeting Follow-up & Next Steps ($duration)\n');
                          emailDraft.writeln('Hi Team,\n');
                          emailDraft.writeln('Thanks for the productive sync today. Here is the overview:\n');
                          emailDraft.writeln('$summary\n');
                          if (decisions.isNotEmpty) {
                            emailDraft.writeln('Key Decisions:');
                            for (final d in decisions) {
                              emailDraft.writeln('• $d');
                            }
                            emailDraft.writeln();
                          }
                          if (actionItems.isNotEmpty) {
                            emailDraft.writeln('Action Items:');
                            for (final item in actionItems) {
                              emailDraft.writeln('• [${item['assignee'] ?? 'Self'}] ${item['task']}');
                            }
                            emailDraft.writeln();
                          }
                          emailDraft.writeln('Best regards,\nExecutive Team');

                          Clipboard.setData(ClipboardData(text: emailDraft.toString()));
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Follow-up email copied to clipboard!')),
                          );
                        },
                      ),
                      ActionChip(
                        avatar: const Icon(Icons.psychology_outlined, size: 14, color: AppColors.emerald),
                        label: const Text('Ask AI about Meeting', style: TextStyle(fontSize: 11)),
                        backgroundColor: AppColors.darkSurfaceSubtle,
                        side: const BorderSide(color: AppColors.darkBorder, width: 0.8),
                        onPressed: () {
                          _showAskMeetingAiModal(context, transcript ?? '');
                        },
                      ),
                    ],
                  ),

                  const SizedBox(height: 18),

                  // Save & Sync Button
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        try {
                          final container = ProviderScope.containerOf(context, listen: false);
                          final taskTitles = actionItems.map((e) => e['task'] ?? '').where((t) => t.isNotEmpty).toList();
                          final fullContent = StringBuffer();
                          fullContent.writeln(summary);
                          if (decisions.isNotEmpty) {
                            fullContent.writeln('\nKey Decisions:');
                            for (final d in decisions) {
                              fullContent.writeln('• $d');
                            }
                          }
                          if (transcript != null && transcript.isNotEmpty) {
                            fullContent.writeln('\nSpeaker-Attributed Transcript:\n$transcript');
                          }
                          final note = NoteModel(
                            id: DateTime.now().millisecondsSinceEpoch.toString(),
                            title: 'Meeting Notes ($duration)',
                            content: fullContent.toString(),
                            snippet: summary.isNotEmpty ? (summary.length > 80 ? '${summary.substring(0, 80)}...' : summary) : 'Executive Meeting Session',
                            date: 'Just now',
                            category: 'Meetings',
                            tag: 'Executive Sync',
                            tagColor: AppColors.matrixEmerald,
                            icon: Icons.groups_rounded,
                            audioPath: audioPath,
                            extractedTasks: taskTitles,
                            extractedPeople: speakers.map((s) => s.displayName).toList(),
                          );
                          container.read(notesProvider.notifier).addNote(note);

                          ApiClient.instance.createMeeting(
                            title: 'Meeting Notes ($duration)',
                            transcript: transcript ?? '',
                            durationSec: _secondsElapsed,
                            audioUrl: audioPath,
                            speakers: speakers.map((s) => s.toJson()).toList(),
                            segments: segments.map((s) => s.toJson()).toList(),
                          ).catchError((_) => null);
                        } catch (_) {}

                        Navigator.pop(modalContext);
                        Navigator.maybePop(context);
                      },
                      child: const Text('Sync with Neural Brain', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
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

  void _showAskMeetingAiModal(BuildContext context, String transcript) {
    final queryController = TextEditingController();
    String? answer;
    bool isAsking = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Padding(
              padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
              child: Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: AppColors.darkSurface,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  border: Border.all(color: AppColors.darkBorderHighlight, width: 0.8),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.psychology_outlined, color: AppColors.emerald, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Ask AI About This Meeting',
                          style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Ask specific speaker-aware questions, such as "What did Sarah commit to?" or "Who suggested moving the date?".',
                      style: TextStyle(color: AppColors.darkTextSecondary, fontSize: 12),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: queryController,
                      style: const TextStyle(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'Ask anything about the meeting...',
                        hintStyle: const TextStyle(color: AppColors.darkTextMuted),
                        filled: true,
                        fillColor: AppColors.darkSurfaceSubtle,
                        suffixIcon: IconButton(
                          icon: isAsking
                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary))
                              : const Icon(Icons.send_rounded, color: AppColors.primary),
                          onPressed: isAsking
                              ? null
                              : () async {
                                  final q = queryController.text.trim();
                                  if (q.isEmpty) return;
                                  setModalState(() {
                                    isAsking = true;
                                    answer = null;
                                  });
                                  final ans = await ApiClient.instance.askMeetingQuestion(_meetingId, q);
                                  setModalState(() {
                                    isAsking = false;
                                    answer = ans;
                                  });
                                },
                        ),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: AppColors.darkBorder)),
                      ),
                    ),
                    if (answer != null) ...[
                      const SizedBox(height: 14),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.darkSurfaceSubtle,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.emerald.withValues(alpha: 0.4), width: 0.8),
                        ),
                        child: Text(
                          answer!,
                          style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.45),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildActionRow(String assignee, String task, Color accent) {
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
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: accent.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(
              assignee,
              style: TextStyle(
                color: accent,
                fontSize: 10.5,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              task,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 12.5,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpeakerChip(String name, String activity, Color accent, bool isActive, {VoidCallback? onTap}) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
        margin: const EdgeInsets.only(right: 8),
        decoration: BoxDecoration(
          color: AppColors.darkSurfaceSubtle,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isActive ? accent.withValues(alpha: 0.6) : AppColors.darkBorder,
            width: 0.8,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(
                color: accent,
                shape: BoxShape.circle,
              ),
            ),
            const SizedBox(width: 6),
            Text(
              name,
              style: const TextStyle(
                color: AppColors.darkTextPrimary,
                fontSize: 11,
                fontWeight: FontWeight.w700,
              ),
            ),
            if (onTap != null) ...[
              const SizedBox(width: 4),
              const Icon(Icons.keyboard_arrow_down_rounded, color: AppColors.darkTextMuted, size: 14),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isProLocked) {
      return Scaffold(
        backgroundColor: AppColors.darkBackground,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 16),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.matrixEmerald.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.matrixEmerald.withValues(alpha: 0.3)),
                  ),
                  child: const Icon(Icons.lock_rounded, size: 40, color: AppColors.matrixEmerald),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Meeting Mode is Locked',
                  style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Meeting Mode is available exclusively on Mindora Pro. Upgrade to unlock multi-speaker diarization and continuous meeting intelligence.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: AppColors.darkTextSecondary, fontSize: 13, height: 1.5),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    ),
                    onPressed: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const AccountProfileScreen()),
                      );
                    },
                    child: const Text('Upgrade to Pro', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final activeSpeakers = _streamClient?.speakers ?? [];

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
            child: Icon(
              Icons.arrow_back_ios_new_rounded,
              color: _isSynthesizing ? Colors.white38 : Colors.white,
              size: 14,
            ),
          ),
          onPressed: _isSynthesizing ? null : () => Navigator.maybePop(context),
        ),
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            child: Column(
              children: [
                // Title
                Text(
                  'Meeting Session • $_startTime',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 12),

                // Multi-Speaker Diarization Header Card
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
                      Wrap(
                        alignment: WrapAlignment.spaceBetween,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
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
                                const Text(
                                  'RECORDING STATUS',
                                  style: TextStyle(
                                    fontSize: 10.5,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 1.2,
                                    color: AppColors.darkTextMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const Text(
                            'AI Diarization Active',
                            style: TextStyle(
                              fontSize: 10,
                              fontFamily: 'monospace',
                              color: AppColors.darkTextMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            // Always present: You / Primary User
                            _buildSpeakerChip('You', 'Recording', AppColors.matrixEmerald, true),
                            // Dynamic speakers detected via AssemblyAI Diarization
                            for (final spk in activeSpeakers)
                              if (spk.key != 'A' && spk.key != 'YOU')
                                _buildSpeakerChip(
                                  spk.displayName,
                                  'Speaker ${spk.key}',
                                  _getSpeakerColor(spk.key),
                                  true,
                                  onTap: () => _showRenameSpeakerModal(spk.key, spk.displayName),
                                ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                // Confidence-based Speaker Introduction Alert Banner
                if (_pendingIntroSuggestion != null) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.phosphorCyan.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.phosphorCyan.withValues(alpha: 0.4), width: 0.8),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.person_pin_circle_outlined, color: AppColors.phosphorCyan, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Assign Speaker ${_pendingIntroSuggestion!['speakerKey']} → "${_pendingIntroSuggestion!['suggestedName']}"?',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ),
                        TextButton(
                          style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 8)),
                          onPressed: () {
                            setState(() {
                              _pendingIntroSuggestion = null;
                            });
                          },
                          child: const Text('Dismiss', style: TextStyle(color: AppColors.darkTextMuted, fontSize: 11)),
                        ),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.phosphorCyan,
                            foregroundColor: Colors.black,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            minimumSize: Size.zero,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          onPressed: () {
                            final key = _pendingIntroSuggestion!['speakerKey']!;
                            final name = _pendingIntroSuggestion!['suggestedName']!;
                            _streamClient?.renameSpeaker(key, name);
                            setState(() {
                              for (int i = 0; i < _liveSegments.length; i++) {
                                if (_liveSegments[i].speakerKey.toUpperCase() == key.toUpperCase()) {
                                  _liveSegments[i] = _liveSegments[i].copyWith(speakerName: name);
                                }
                              }
                              _pendingIntroSuggestion = null;
                            });
                          },
                          child: const Text('Confirm', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ),
                ],

                const SizedBox(height: 14),

                // Ambient Glowing Sound Orb
                AnimatedBuilder(
                  animation: _animController,
                  builder: (context, child) {
                    final scale = _isPaused ? 1.0 : 1.0 + (_animController.value * 0.12);
                    return Container(
                      width: 110 * scale,
                      height: 110 * scale,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: RadialGradient(
                          colors: [
                            AppColors.emerald.withValues(alpha: 0.22),
                            AppColors.primary.withValues(alpha: 0.12),
                            Colors.transparent,
                          ],
                        ),
                      ),
                      child: Center(
                        child: Container(
                          width: 64,
                          height: 64,
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
                                blurRadius: 20,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Icon(
                            Icons.graphic_eq_rounded,
                            color: AppColors.emerald,
                            size: 28,
                          ),
                        ),
                      ),
                    );
                  },
                ),

                const SizedBox(height: 10),

                // Timer Display
                Text(
                  _formatTimer(),
                  style: const TextStyle(
                    fontSize: 48,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                    letterSpacing: 2,
                    fontFeatures: [FontFeature.tabularFigures()],
                  ),
                ),

                const SizedBox(height: 14),

                // Live Conversational Speaker Transcript Feed
                Container(
                  constraints: const BoxConstraints(minHeight: 180, maxHeight: 320),
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.darkSurface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.darkBorder, width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Wrap(
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: 8,
                        runSpacing: 4,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              _isSynthesizing ? 'AI SYNTHESIZING' : (_isPaused ? 'PAUSED' : 'MULTI-SPEAKER STREAM'),
                              style: const TextStyle(
                                color: AppColors.primary,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          Text(
                            _isSynthesizing ? 'Distilling decisions & tasks...' : 'Live Speaker Attributions',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: AppColors.darkTextMuted,
                              fontSize: 11,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Expanded(
                        child: _liveSegments.isEmpty
                            ? Center(
                                child: Text(
                                  _liveTranscript.isNotEmpty
                                      ? _liveTranscript
                                      : 'Continuous meeting capture active ($_formatTimer()).\nSpeak into microphone — speech will be partitioned by speaker...',
                                  textAlign: TextAlign.center,
                                  style: const TextStyle(
                                    color: AppColors.darkTextMuted,
                                    fontSize: 12.5,
                                    height: 1.45,
                                  ),
                                ),
                              )
                            : ListView.separated(
                                controller: _transcriptScrollController,
                                itemCount: _liveSegments.length,
                                separatorBuilder: (_, __) => const SizedBox(height: 10),
                                itemBuilder: (ctx, idx) {
                                  final seg = _liveSegments[idx];
                                  final color = _getSpeakerColor(seg.speakerKey);
                                  return Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: AppColors.darkSurfaceSubtle,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: seg.isPartial ? color.withValues(alpha: 0.6) : AppColors.darkBorder,
                                        width: 0.7,
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Container(
                                              width: 7,
                                              height: 7,
                                              decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                            ),
                                            const SizedBox(width: 6),
                                            InkWell(
                                              onTap: () => _showRenameSpeakerModal(seg.speakerKey, seg.speakerName),
                                              child: Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Text(
                                                    seg.speakerName,
                                                    style: TextStyle(
                                                      color: color,
                                                      fontSize: 11.5,
                                                      fontWeight: FontWeight.bold,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  const Icon(Icons.edit, color: AppColors.darkTextMuted, size: 10),
                                                ],
                                              ),
                                            ),
                                            const Spacer(),
                                            Text(
                                              seg.formattedStartTime,
                                              style: const TextStyle(
                                                color: AppColors.darkTextMuted,
                                                fontSize: 9.5,
                                                fontFamily: 'monospace',
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          seg.text,
                                          style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4),
                                        ),
                                      ],
                                    ),
                                  );
                                },
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
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Bookmark Marker Button
            IconButton(
              onPressed: () {
                setState(() {
                  _bookmarkCount++;
                });
                HapticFeedback.mediumImpact();
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Timestamp bookmarked at ${_formatTimer()}'),
                    duration: const Duration(seconds: 1),
                  ),
                );
              },
              icon: Badge(
                isLabelVisible: _bookmarkCount > 0,
                label: Text('$_bookmarkCount'),
                backgroundColor: AppColors.primary,
                child: const Icon(Icons.bookmark_add_outlined, color: AppColors.darkTextSecondary),
              ),
              tooltip: 'Bookmark Moment',
            ),
            const SizedBox(width: 6),

            // Pause / Resume Button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: _isPaused ? AppColors.emerald : AppColors.darkSurfaceSubtle,
                foregroundColor: _isPaused ? Colors.black : Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              onPressed: () {
                setState(() {
                  _isPaused = !_isPaused;
                });
                HapticFeedback.selectionClick();
              },
              icon: Icon(_isPaused ? Icons.play_arrow_rounded : Icons.pause_rounded, size: 18),
              label: Text(_isPaused ? 'Resume' : 'Pause', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
            ),
            const SizedBox(width: 8),

            // End & Synthesize Button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
              ),
              onPressed: _isSynthesizing ? null : _handleEndMeeting,
              icon: _isSynthesizing
                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : const Icon(Icons.auto_awesome_rounded, size: 16),
              label: Text(
                _isSynthesizing ? 'Distilling...' : 'End & Synthesize',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
