import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:audioplayers/audioplayers.dart';
import '../theme/app_colors.dart';

class AudioPlaybackBar extends StatefulWidget {
  final String audioPath;
  final VoidCallback? onRemove;
  final String? title;

  const AudioPlaybackBar({
    super.key,
    required this.audioPath,
    this.onRemove,
    this.title,
  });

  @override
  State<AudioPlaybackBar> createState() => _AudioPlaybackBarState();
}

class _AudioPlaybackBarState extends State<AudioPlaybackBar> {
  late final AudioPlayer _player;
  PlayerState _playerState = PlayerState.stopped;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  StreamSubscription? _stateSub;
  StreamSubscription? _durationSub;
  StreamSubscription? _positionSub;
  StreamSubscription? _completeSub;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _player.setReleaseMode(ReleaseMode.stop);
    _initAudioListeners();
    _loadInitialDuration();
  }

  void _loadInitialDuration() {
    try {
      if (widget.audioPath.isNotEmpty && !widget.audioPath.startsWith('http')) {
        final f = File(widget.audioPath);
        if (f.existsSync()) {
          _player.setSource(DeviceFileSource(widget.audioPath)).then((_) {
            _player.getDuration().then((dur) {
              if (dur != null && mounted) {
                setState(() => _duration = dur);
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
      if (mounted) setState(() => _duration = dur);
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
          if (widget.audioPath.startsWith('http://') || widget.audioPath.startsWith('https://')) {
            source = UrlSource(widget.audioPath);
          } else {
            final f = File(widget.audioPath);
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
            source = DeviceFileSource(widget.audioPath);
          }
          await _player.stop();
          await _player.play(source);
        }
      }
    } catch (e) {
      debugPrint('AudioPlaybackBar playback notice: $e');
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
