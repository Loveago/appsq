import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import 'package:share_plus/share_plus.dart';
import '../services/audio_service.dart';
import '../theme/app_colors.dart';

class AudioPlaybackController {
  _AudioPlaybackBarState? _state;
  void _attach(_AudioPlaybackBarState state) => _state = state;
  void _detach() => _state = null;

  void seekTo(Duration position) => _state?.seekTo(position);
  void play() => _state?.play();
  void pause() => _state?.pause();
  Duration get currentPosition => _state?.currentPosition ?? Duration.zero;
}

class AudioPlaybackBar extends StatefulWidget {
  final String audioPath;
  final VoidCallback? onRemove;
  final String? title;
  final String? transcript;
  final AudioPlaybackController? controller;

  const AudioPlaybackBar({
    super.key,
    required this.audioPath,
    this.onRemove,
    this.title,
    this.transcript,
    this.controller,
  });

  @override
  State<AudioPlaybackBar> createState() => _AudioPlaybackBarState();
}

class _AudioPlaybackBarState extends State<AudioPlaybackBar> {
  late final AudioPlayer _player;
  PlayerState _playerState = PlayerState.stopped;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;
  String _effectivePath = '';

  Duration get currentPosition => _position;

  StreamSubscription? _stateSub;
  StreamSubscription? _durationSub;
  StreamSubscription? _positionSub;
  StreamSubscription? _completeSub;

  @override
  void initState() {
    super.initState();
    _effectivePath = widget.audioPath;
    widget.controller?._attach(this);
    _player = AudioPlayer();
    _player.setReleaseMode(ReleaseMode.stop);
    _initAudioListeners();
    _resolveAndLoad();
  }

  Future<void> _resolveAndLoad() async {
    final resolved = await AudioRecordingService.resolveAudioPath(widget.audioPath);
    if (mounted) {
      setState(() => _effectivePath = resolved);
    }
    _loadInitialDuration(resolved);
  }

  Future<void> seekTo(Duration pos) async {
    try {
      if (_playerState != PlayerState.playing) {
        Source source;
        if (_effectivePath.startsWith('http://') || _effectivePath.startsWith('https://')) {
          source = UrlSource(_effectivePath);
        } else {
          source = DeviceFileSource(_effectivePath);
        }
        await _player.play(source, position: pos);
      } else {
        await _player.seek(pos);
      }
    } catch (_) {}
  }

  Future<void> play() async {
    if (_playerState != PlayerState.playing) {
      await _togglePlayPause();
    }
  }

  Future<void> pause() async {
    if (_playerState == PlayerState.playing) {
      await _player.pause();
    }
  }

  void _loadInitialDuration(String path) {
    try {
      if (path.isNotEmpty && !path.startsWith('http')) {
        final f = File(path);
        if (f.existsSync()) {
          _player.setSource(DeviceFileSource(path)).then((_) {
            _player.getDuration().then((dur) {
              if (dur != null && dur > Duration.zero && mounted) {
                setState(() => _duration = dur);
              } else if (f.lengthSync() > 0 && mounted) {
                // Fallback estimate if container header hasn't reported length: ~16KB/s for 128kbps m4a
                final estSeconds = (f.lengthSync() / 16000).clamp(1.0, 7200.0).round();
                setState(() => _duration = Duration(seconds: estSeconds));
              }
            });
          }).catchError((_) {});
        }
      }
    } catch (_) {}
  }

  void _initAudioListeners() {
    _stateSub = _player.onPlayerStateChanged.listen((state) {
      if (mounted) setState(() => _playerState = state);
    });

    _durationSub = _player.onDurationChanged.listen((dur) {
      if (dur > Duration.zero && mounted) {
        setState(() => _duration = dur);
      }
    });

    _positionSub = _player.onPositionChanged.listen((pos) {
      if (mounted) setState(() => _position = pos);
    });

    _completeSub = _player.onPlayerComplete.listen((_) {
      if (mounted) {
        setState(() {
          _playerState = PlayerState.stopped;
          _position = Duration.zero;
        });
      }
    });
  }

  @override
  void dispose() {
    widget.controller?._detach();
    _stateSub?.cancel();
    _durationSub?.cancel();
    _positionSub?.cancel();
    _completeSub?.cancel();
    _player.dispose();
    super.dispose();
  }

  Future<void> _togglePlayPause() async {
    try {
      if (_playerState == PlayerState.playing) {
        await _player.pause();
      } else {
        if (_position > Duration.zero && _position < _duration) {
          await _player.resume();
        } else {
          Source source;
          if (_effectivePath.startsWith('http://') || _effectivePath.startsWith('https://')) {
            source = UrlSource(_effectivePath);
          } else {
            final f = File(_effectivePath);
            if (!f.existsSync()) {
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Audio file is not present on this device.'),
                    duration: Duration(seconds: 2),
                  ),
                );
              }
              return;
            }
            source = DeviceFileSource(_effectivePath);
          }
          await _player.stop();
          await _player.play(source);
        }
      }
    } catch (e) {
      debugPrint('AudioPlaybackBar playback notice: $e');
    }
  }

  Future<void> _exportAudio() async {
    try {
      if (_effectivePath.isEmpty) return;
      final f = File(_effectivePath);
      if (await f.exists()) {
        if (!mounted) return;
        final box = context.findRenderObject() as RenderBox?;
        await Share.shareXFiles(
          [XFile(f.path, mimeType: _effectivePath.endsWith('.wav') ? 'audio/wav' : 'audio/m4a')],
          text: widget.title ?? 'Voice Note Recording',
          sharePositionOrigin: box != null ? box.localToGlobal(Offset.zero) & box.size : null,
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cannot export: Audio file not found locally.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    }
  }

  Future<void> _exportTranscript() async {
    try {
      if (widget.transcript == null || widget.transcript!.trim().isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No transcript available for this recording.')),
          );
        }
        return;
      }
      final box = context.findRenderObject() as RenderBox?;
      await Share.share(
        'Transcript for "${widget.title ?? 'Voice Note'}":\n\n${widget.transcript}',
        subject: 'Transcript - ${widget.title ?? 'Voice Note'}',
        sharePositionOrigin: box != null ? box.localToGlobal(Offset.zero) & box.size : null,
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Export failed: $e')),
        );
      }
    }
  }

  String _formatDuration(Duration d) {
    final mins = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final secs = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isPlaying = _playerState == PlayerState.playing;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161F2E) : const Color(0xFFEEF2FF),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: AppColors.primary.withValues(alpha: 0.35),
          width: 0.8,
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              // Play/Pause Action Button
              GestureDetector(
                onTap: _togglePlayPause,
                child: Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              // Audio Label & Time
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.title ?? 'Audio Recording Attached',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.textPrimary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${_formatDuration(_position)} / ${_formatDuration(_duration)}',
                      style: TextStyle(
                        fontSize: 11,
                        fontFamily: 'monospace',
                        color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              // Native Export Popover
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.ios_share_rounded,
                  size: 18,
                  color: isDark ? AppColors.darkTextMuted : AppColors.textMuted,
                ),
                tooltip: 'Export / Share',
                onSelected: (val) {
                  if (val == 'audio') {
                    _exportAudio();
                  } else if (val == 'transcript') {
                    _exportTranscript();
                  }
                },
                itemBuilder: (ctx) => [
                  const PopupMenuItem(
                    value: 'audio',
                    child: Row(
                      children: [
                        Icon(Icons.audio_file_rounded, size: 16),
                        SizedBox(width: 8),
                        Text('Export Audio File (.m4a/.wav)'),
                      ],
                    ),
                  ),
                  if (widget.transcript != null && widget.transcript!.trim().isNotEmpty)
                    const PopupMenuItem(
                      value: 'transcript',
                      child: Row(
                        children: [
                          Icon(Icons.description_rounded, size: 16),
                          SizedBox(width: 8),
                          Text('Export Transcript (.txt)'),
                        ],
                      ),
                    ),
                ],
              ),
              if (widget.onRemove != null)
                IconButton(
                  icon: const Icon(Icons.close_rounded, size: 16),
                  tooltip: 'Detach Audio',
                  onPressed: widget.onRemove,
                ),
            ],
          ),
          if (_duration.inMilliseconds > 0) ...[
            const SizedBox(height: 4),
            SliderTheme(
              data: SliderTheme.of(context).copyWith(
                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 5),
                trackHeight: 3,
                activeTrackColor: AppColors.primary,
                inactiveTrackColor: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.1),
                thumbColor: AppColors.primary,
                overlayShape: SliderComponentShape.noOverlay,
              ),
              child: Slider(
                value: _position.inMilliseconds.clamp(0, _duration.inMilliseconds).toDouble(),
                max: _duration.inMilliseconds.toDouble(),
                onChanged: (val) {
                  _player.seek(Duration(milliseconds: val.toInt()));
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
