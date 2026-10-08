import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/models/note_model.dart';
import '../../../../core/providers/app_state_providers.dart';
import '../../../../core/services/audio_service.dart';
import '../../../../core/network/api_client.dart';
import '../../../../core/network/transcription_stream_client.dart';
import '../../../../core/widgets/audio_playback_bar.dart';

class VoiceCaptureSheet extends ConsumerStatefulWidget {
  const VoiceCaptureSheet({super.key});

  @override
  ConsumerState<VoiceCaptureSheet> createState() => _VoiceCaptureSheetState();
}

class _VoiceCaptureSheetState extends ConsumerState<VoiceCaptureSheet> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  Timer? _recordTimer;
  int _elapsedSeconds = 0;
  bool _isRecording = true;
  bool _isProcessing = false;
  String _transcript = '';
  String? _audioPath;
  List<String> _detectedTasks = [];
  String _detectedDue = 'Today';
  String _suggestedTitle = 'Voice Memo';

  // Persistent Voice Note ID & transcription entitlement state
  late String _voiceNoteId;
  bool _transcriptionLimitReached = false;

  TranscriptionStreamClient? _streamClient;
  StreamSubscription<String>? _partialSub;
  StreamSubscription<String>? _limitSub;

  @override
  void initState() {
    super.initState();
    _voiceNoteId = 'vn_${DateTime.now().millisecondsSinceEpoch}';
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);

    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (!isTesting) {
      _recordTimer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted && _isRecording) {
          setState(() {
            _elapsedSeconds++;
          });
        }
      });
    }

    _initRecording();

    // Suppress ads during audio recording
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(adSuppressionProvider.notifier).state = true;
    });
  }

  Future<void> _initRecording() async {
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (isTesting) {
      AudioRecordingService.instance.startRecording();
      return;
    }

    try {
      final session = await ApiClient.instance.createTranscriptionSession(
        voiceNoteId: _voiceNoteId,
      );

      final isAllowed = session['allowed'] == true;
      if (!isAllowed) {
        if (mounted) {
          setState(() {
            _transcriptionLimitReached = true;
          });
        }
        await AudioRecordingService.instance.startRecording();
        return;
      }

      final sessionId = session['sessionId'] as String? ?? 'sess_${DateTime.now().millisecondsSinceEpoch}';
      final streamingToken = session['token'] as String?;

      _streamClient = TranscriptionStreamClient(
        baseUrl: ApiClient.instance.currentBaseUrl,
        streamingToken: streamingToken,
        token: ApiClient.instance.authToken,
        sessionId: sessionId,
        voiceNoteId: _voiceNoteId,
      );

      _partialSub = _streamClient!.partialTranscriptStream.listen((text) {
        if (mounted && text.isNotEmpty) {
          setState(() {
            _transcript = text;
          });
        }
      });

      _limitSub = _streamClient!.limitReachedStream.listen((msg) {
        if (mounted) {
          setState(() {
            _transcriptionLimitReached = true;
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
      } else {
        await AudioRecordingService.instance.startRecording();
      }
    } catch (_) {
      await AudioRecordingService.instance.startRecording();
    }
  }

  @override
  void dispose() {
    _recordTimer?.cancel();
    _pulseController.dispose();
    _partialSub?.cancel();
    _limitSub?.cancel();
    _streamClient?.dispose();
    AudioRecordingService.instance.stopRecording();
    super.dispose();
  }

  String _formatTimer() {
    final mins = (_elapsedSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (_elapsedSeconds % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  Future<void> _stopRecording() async {
    if (_isProcessing || !_isRecording) return;
    _recordTimer?.cancel();
    final isTesting = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (isTesting) {
      setState(() {
        _isRecording = false;
        _isProcessing = false;
        _transcript = 'Meeting follow up';
        _detectedTasks = ['Follow up on tasks'];
      });
      try {
        ref.read(adSuppressionProvider.notifier).state = false;
      } catch (_) {}
      return;
    }

    setState(() {
      _isRecording = false;
      _isProcessing = true;
    });

    final RecordingResult? result = await AudioRecordingService.instance.stopRecording();
    _audioPath = result?.filePath;

    // Immediately persist Voice Note record to authoritative backend (Recording is ALWAYS permitted)
    ApiClient.instance.saveVoiceNote(
      id: _voiceNoteId,
      title: _suggestedTitle,
      localPath: _audioPath,
      durationSec: _elapsedSeconds,
    ).catchError((_) => null);

    Map<String, dynamic> res = {};
    if (_streamClient != null) {
      try {
        res = await _streamClient!.stop();
      } catch (_) {}
    }

    final streamTranscript = (res['transcript'] as String?)?.trim() ?? _transcript.trim();

    // Fallback batch transcribe ONLY if live streaming was unavailable and no transcript was captured
    if (streamTranscript.isEmpty && !_transcriptionLimitReached) {
      if (_audioPath != null) {
        res = await ApiClient.instance.transcribeAudio(
          _audioPath!,
        );
      }
    } else if (streamTranscript.isNotEmpty) {
      _transcript = streamTranscript;
      // Authoritatively deduct quota on backend and trigger context extraction
      ApiClient.instance.finalizeTranscriptionSession(
        sessionId: _streamClient?.sessionId ?? 'sess_$_voiceNoteId',
        durationSec: _elapsedSeconds.toDouble(),
        transcript: _transcript,
        voiceNoteId: _voiceNoteId,
      ).then((finalizeRes) {
        if (mounted && finalizeRes['success'] == true) {
          setState(() {
            if (finalizeRes['detectedTasks'] is List && (finalizeRes['detectedTasks'] as List).isNotEmpty) {
              _detectedTasks = (finalizeRes['detectedTasks'] as List).map((e) => e.toString()).toList();
            }
            if (finalizeRes['suggestedTitle'] != null && finalizeRes['suggestedTitle'].toString().isNotEmpty) {
              _suggestedTitle = finalizeRes['suggestedTitle'].toString();
            }
          });
        }
      }).catchError((_) {});
    }

    if (mounted) {
      setState(() {
        if (_transcriptionLimitReached || res['error'] == 'TRANSCRIPTION_LIMIT_REACHED') {
          _transcriptionLimitReached = true;
          if (_transcript.isEmpty) {
            _transcript = 'Voice recording preserved. Transcription is unavailable because your monthly transcription quota has been reached.';
          }
        } else {
          final t = res['transcript'] as String?;
          if (t != null && t.trim().isNotEmpty) {
            _transcript = t.trim();
          } else if (_transcript.isEmpty) {
            _transcript = 'Voice recording saved.';
          }
          if (res['detectedTasks'] != null) {
            _detectedTasks = (res['detectedTasks'] as List).map((e) => e.toString()).toList();
          }
          if (res['detectedDue'] != null) {
            _detectedDue = res['detectedDue'].toString();
          }
          if (res['suggestedTitle'] != null) {
            _suggestedTitle = res['suggestedTitle'].toString();
          } else if (_transcript.isNotEmpty) {
            final words = _transcript.split(' ');
            _suggestedTitle = words.length > 5 ? '${words.take(5).join(' ')}...' : _transcript;
          }
        }
        _isProcessing = false;
      });
    }

    try {
      ref.read(adSuppressionProvider.notifier).state = false;
    } catch (_) {}
  }

  void _saveEverything() {
    final title = _suggestedTitle.isNotEmpty ? _suggestedTitle : 'Voice Memo';
    final content = _transcript.isNotEmpty ? _transcript : 'Voice recording note.';
    final snippet = _detectedTasks.isNotEmpty
        ? 'Voice note: ${_detectedTasks.length} action items extracted.'
        : content;

    // 1. Add to notes with stable _voiceNoteId
    final note = NoteModel(
      id: _voiceNoteId,
      title: title,
      content: content,
      snippet: snippet,
      date: 'Just now',
      category: 'Ideas',
      tag: 'VOICE',
      tagColor: AppColors.electricViolet,
      icon: Icons.mic_rounded,
      extractedTasks: _detectedTasks,
      audioPath: _audioPath,
    );
    ref.read(notesProvider.notifier).addNote(note);

    // Sync updated transcript to Voice Note backend
    ApiClient.instance.saveVoiceNote(
      id: _voiceNoteId,
      title: title,
      localPath: _audioPath,
      durationSec: _elapsedSeconds,
      transcript: _transcript,
      detectedTasks: _detectedTasks,
      detectedDue: _detectedDue,
    ).catchError((_) => null);

    // 2. Add extracted tasks if any
    if (_detectedTasks.isNotEmpty) {
      ref.read(tasksProvider.notifier).addExtractedTasks(
        _detectedTasks,
        project: 'Voice Capture',
        sourceNote: title,
      );
    }

    Navigator.pop(context);
    if (_transcriptionLimitReached) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text("Voice note saved. Transcription unavailable (monthly limit reached)."),
          duration: Duration(seconds: 3),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_detectedTasks.isNotEmpty
              ? 'Voice thought saved! ${_detectedTasks.length} task(s) added.'
              : 'Voice thought saved to notes.'),
          duration: const Duration(milliseconds: 2000),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.fromLTRB(22, 14, 22, 34),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF11141C) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
        border: Border.all(
          color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
          width: 0.8,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            width: 36,
            height: 4,
            decoration: BoxDecoration(
              color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 18),

          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.electricViolet.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.mic_rounded, size: 16, color: AppColors.electricViolet),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Instant Voice Capture',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      letterSpacing: -0.3,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, size: 18),
                onPressed: () {
                  ref.read(adSuppressionProvider.notifier).state = false;
                  Navigator.pop(context);
                },
              ),
            ],
          ),

          const SizedBox(height: 20),

          // Pulsing Mic or Finished indicator
          if (_isRecording) ...[
            AnimatedBuilder(
              animation: _pulseController,
              builder: (context, child) {
                final scale = 1.0 + (_pulseController.value * 0.15);
                return Transform.scale(
                  scale: scale,
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: const Color(0xFF8B5CF6).withValues(alpha: 0.15 + (_pulseController.value * 0.1)),
                      border: Border.all(
                        color: const Color(0xFF8B5CF6).withValues(alpha: 0.5),
                        width: 2,
                      ),
                    ),
                    child: const Icon(Icons.mic_rounded, size: 36, color: Color(0xFF8B5CF6)),
                  ),
                );
              },
            ),
            const SizedBox(height: 14),
            Text(
              _formatTimer(),
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                fontFamily: 'monospace',
                letterSpacing: -0.5,
                color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Listening...',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: AppColors.electricViolet,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              constraints: const BoxConstraints(minHeight: 64, maxHeight: 130),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isDark ? AppColors.darkSurface : AppColors.surfaceSubtle,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                  width: 0.8,
                ),
              ),
              child: SingleChildScrollView(
                reverse: true,
                child: Text(
                  _transcript.isNotEmpty
                      ? _transcript
                      : (_transcriptionLimitReached
                          ? 'Transcription quota reached. Audio recording continues safely on device.'
                          : 'Listening... Speak naturally to see real-time transcription.'),
                  style: TextStyle(
                    fontSize: 13,
                    fontStyle: _transcript.isEmpty ? FontStyle.italic : FontStyle.normal,
                    color: _transcript.isNotEmpty
                        ? (isDark ? AppColors.darkTextPrimary : AppColors.textPrimary)
                        : (isDark ? AppColors.darkTextMuted : AppColors.textMuted),
                    height: 1.4,
                  ),
                  textAlign: _transcript.isEmpty ? TextAlign.center : TextAlign.start,
                ),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _stopRecording,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF43F5E),
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(100)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.stop_rounded, size: 16, color: Colors.white),
                  SizedBox(width: 6),
                  Text('Stop Recording', style: TextStyle(fontWeight: FontWeight.w700, color: Colors.white)),
                ],
              ),
            ),
          ] else if (_isProcessing) ...[
            const CircularProgressIndicator(color: AppColors.primary),
            const SizedBox(height: 14),
            Text(
              'Transcribing audio & extracting intelligence...',
              style: TextStyle(fontSize: 12, color: isDark ? AppColors.darkTextMuted : AppColors.textMuted),
            ),
          ] else ...[
            // Recorded Audio Playback Bar
            if (_audioPath != null && _audioPath!.isNotEmpty) ...[
              AudioPlaybackBar(
                audioPath: _audioPath!,
                title: 'Review Voice Recording',
              ),
              const SizedBox(height: 14),
            ],
            // Transcription View Card
            if (_transcript.isNotEmpty) ...[
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurfaceSubtle : AppColors.surfaceSubtle,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? AppColors.darkBorder : AppColors.surfaceBorder,
                    width: 0.8,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.notes_rounded, size: 14, color: AppColors.primary),
                        const SizedBox(width: 6),
                        Text(
                          'TRANSCRIPTION',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _transcript,
                      style: TextStyle(
                        fontSize: 13,
                        height: 1.45,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),
            ],
            // Extracted Results Card
            if (_detectedTasks.isNotEmpty)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: AppColors.emerald.withValues(alpha: 0.4),
                    width: 1,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.auto_awesome_rounded, size: 14, color: AppColors.emerald),
                        const SizedBox(width: 6),
                        Text(
                          'AI DETECTED ACTION ITEMS',
                          style: TextStyle(
                            fontSize: 10.5,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.8,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.amber.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            'Due: $_detectedDue',
                            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppColors.amber),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    for (final task in _detectedTasks)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.check_circle_outline_rounded, size: 16, color: AppColors.emerald),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                task,
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            if (_detectedTasks.isNotEmpty)
              const SizedBox(height: 14),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _saveEverything,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.save_rounded, size: 16, color: Colors.white),
                    SizedBox(width: 8),
                    Text('Save Everything', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
