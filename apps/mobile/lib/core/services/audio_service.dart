import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;

class AudioRecordingService {
  static AudioRecordingService? _instance;
  static AudioRecordingService get instance => _instance ??= AudioRecordingService._();

  AudioRecorder? _recorder;
  stt.SpeechToText? _speech;
  bool _isRecording = false;
  bool _speechAvailable = false;
  String? _currentRecordingPath;
  String _liveTranscript = '';
  void Function(String words)? onLiveWordsChanged;

  AudioRecordingService._();

  AudioRecorder get recorder => _recorder ??= AudioRecorder();

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
      return await recorder.hasPermission();
    } catch (e) {
      debugPrint('Audio permission check notice: $e');
      try {
        return await recorder.hasPermission();
      } catch (_) {
        return false;
      }
    }
  }

  Future<String?> startRecording({void Function(String words)? onWords}) async {
    _liveTranscript = '';
    onLiveWordsChanged = onWords;

    try {
      _recorder ??= AudioRecorder();
      final hasPerm = await checkPermission();
      if (!hasPerm) {
        debugPrint('Microphone permission not granted by user.');
        return null;
      }

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

      // Initialize and start live speech recognition in parallel
      _startLiveSpeechRecognition();

      return savePath;
    } catch (e) {
      debugPrint('Audio start recording notice: $e');
      _isRecording = false;
      _currentRecordingPath = null;
      return null;
    }
  }

  Future<void> _startLiveSpeechRecognition() async {
    try {
      _speech ??= stt.SpeechToText();
      if (!_speechAvailable) {
        _speechAvailable = await _speech!.initialize(
          onError: (val) => debugPrint('STT notice: ${val.errorMsg}'),
          onStatus: (val) => debugPrint('STT status: $val'),
        );
      }

      if (_speechAvailable && _isRecording) {
        await _speech!.listen(
          onResult: (result) {
            if (result.recognizedWords.isNotEmpty) {
              _liveTranscript = result.recognizedWords;
              onLiveWordsChanged?.call(_liveTranscript);
            }
          },
          listenOptions: stt.SpeechListenOptions(
            partialResults: true,
            cancelOnError: false,
            listenMode: stt.ListenMode.dictation,
            listenFor: const Duration(hours: 1),
            pauseFor: const Duration(seconds: 10),
          ),
        );
      }
    } catch (e) {
      debugPrint('Live speech recognition notice: $e');
    }
  }

  Future<String?> stopRecording() async {
    try {
      _isRecording = false;

      // Stop speech to text
      try {
        if (_speech != null && _speech!.isListening) {
          await _speech!.stop();
        }
      } catch (_) {}

      // Stop audio file recording
      if (_recorder != null && await _recorder!.isRecording()) {
        final path = await _recorder!.stop();
        if (path != null && File(path).existsSync() && File(path).lengthSync() > 0) {
          _currentRecordingPath = path;
          return path;
        }
      }

      if (_currentRecordingPath != null &&
          File(_currentRecordingPath!).existsSync() &&
          File(_currentRecordingPath!).lengthSync() > 0) {
        return _currentRecordingPath;
      }

      return null;
    } catch (e) {
      debugPrint('Audio stop recording notice: $e');
      _isRecording = false;
      return null;
    }
  }

  Future<void> dispose() async {
    try {
      _isRecording = false;
      await _speech?.stop();
      _speech = null;
      await _recorder?.dispose();
      _recorder = null;
    } catch (e) {
      debugPrint('Audio dispose notice: $e');
    }
  }
}
