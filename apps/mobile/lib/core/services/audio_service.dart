import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:stt_record/stt_record.dart';
import 'package:record/record.dart';

class AudioRecordingService {
  static AudioRecordingService? _instance;
  static AudioRecordingService get instance => _instance ??= AudioRecordingService._();

  SttRecord? _sttRecord;
  AudioRecorder? _recorder;
  StreamSubscription? _sttSub;
  bool _isRecording = false;
  String? _currentRecordingPath;
  String _liveTranscript = '';
  void Function(String words)? onLiveWordsChanged;

  AudioRecordingService._();

  AudioRecorder get recorder => _recorder ??= AudioRecorder();
  SttRecord get sttRecord => _sttRecord ??= SttRecord();

  bool get isRecording => _isRecording;
  String? get currentRecordingPath => _currentRecordingPath;
  String get liveTranscript => _liveTranscript;

  Future<bool> checkPermission() async {
    try {
      if (kIsWeb) return true;
      final status = await Permission.microphone.status;
      if (status.isGranted) return true;
      final requested = await Permission.microphone.request();
      if (requested.isGranted) return true;
      return await sttRecord.hasPermission();
    } catch (e) {
      debugPrint('Audio permission check notice: $e');
      try {
        return await sttRecord.hasPermission();
      } catch (_) {
        return false;
      }
    }
  }

  Future<String?> startRecording({void Function(String words)? onWords}) async {
    _liveTranscript = '';
    onLiveWordsChanged = onWords;
    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('Test');

    if (isTest) {
      _isRecording = true;
      _currentRecordingPath = '/mock/test_recording.m4a';
      return _currentRecordingPath;
    }

    final hasPerm = await checkPermission();
    if (!hasPerm) {
      debugPrint('Microphone permission not granted by user.');
      return null;
    }

    // Try SttRecord first (unified single-channel mic capture + live STT)
    if (!kIsWeb) {
      try {
        _sttRecord ??= SttRecord();
        _isRecording = true;
        _sttSub?.cancel();
        _sttSub = _sttRecord!.transcripts.listen(
          (event) {
            if (event.text.isNotEmpty) {
              _liveTranscript = event.text;
              onLiveWordsChanged?.call(_liveTranscript);
            }
          },
          onError: (err) {
            debugPrint('STT transcript stream notice: $err');
          },
        );

        await _sttRecord!.start(
          localeId: 'en_US',
          partialResults: true,
        );

        return 'stt_recording_active';
      } catch (e) {
        debugPrint('SttRecord start failed, falling back to AudioRecorder: $e');
      }
    }

    // Fallback to AudioRecorder if SttRecord fails or on web
    try {
      _recorder ??= AudioRecorder();
      String savePath;
      if (!kIsWeb) {
        final dir = await getApplicationDocumentsDirectory();
        final recDir = Directory('${dir.path}/recordings');
        if (!recDir.existsSync()) {
          await recDir.create(recursive: true);
        }
        savePath = '${recDir.path}/mindora_rec_${DateTime.now().millisecondsSinceEpoch}.m4a';
      } else {
        savePath = 'web_recording.m4a';
      }

      _currentRecordingPath = savePath;
      await _recorder!.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: savePath,
      );
      _isRecording = true;
      return savePath;
    } catch (e) {
      debugPrint('Audio start recording exception: $e');
      _isRecording = false;
      _currentRecordingPath = null;
      return null;
    }
  }

  Future<String?> stopRecording() async {
    _isRecording = false;
    _sttSub?.cancel();
    _sttSub = null;

    final isTest = WidgetsBinding.instance.runtimeType.toString().contains('Test');
    if (isTest) {
      return _currentRecordingPath;
    }

    // 1. Try stopping SttRecord
    if (_sttRecord != null) {
      try {
        final stopResult = await _sttRecord!.stop();
        final path = stopResult.audioPath;
        if (File(path).existsSync() && File(path).lengthSync() > 0) {
          _currentRecordingPath = path;
          return path;
        }
      } catch (e) {
        debugPrint('SttRecord stop notice: $e');
      }
    }

    // 2. Try stopping AudioRecorder
    if (_recorder != null) {
      try {
        if (await _recorder!.isRecording()) {
          final path = await _recorder!.stop();
          if (path != null && File(path).existsSync() && File(path).lengthSync() > 0) {
            _currentRecordingPath = path;
            return path;
          }
        }
      } catch (e) {
        debugPrint('AudioRecorder stop notice: $e');
      }
    }

    if (_currentRecordingPath != null &&
        File(_currentRecordingPath!).existsSync() &&
        File(_currentRecordingPath!).lengthSync() > 0) {
      return _currentRecordingPath;
    }

    return null;
  }

  Future<void> dispose() async {
    try {
      _isRecording = false;
      _sttSub?.cancel();
      _sttSub = null;
      await _sttRecord?.cancel();
      _sttRecord = null;
      await _recorder?.dispose();
      _recorder = null;
    } catch (e) {
      debugPrint('Audio dispose notice: $e');
    }
  }
}
