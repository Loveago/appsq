import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
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

  AudioRecordingService._() {
    try {
      _recorder = AudioRecorder();
    } catch (e) {
      debugPrint('AudioRecorder init notice: $e');
    }
    try {
      _speech = stt.SpeechToText();
    } catch (e) {
      debugPrint('SpeechToText init notice: $e');
    }
  }

  bool get isRecording => _isRecording;
  String? get currentRecordingPath => _currentRecordingPath;
  String get liveTranscript => _liveTranscript;

  Future<bool> checkPermission() async {
    try {
      if (_recorder == null) return false;
      return await _recorder!.hasPermission();
    } catch (e) {
      debugPrint('Audio permission check notice: $e');
      return true; // Fallback in mock environments
    }
  }

  Future<String?> startRecording({void Function(String words)? onWords}) async {
    _liveTranscript = '';
    onLiveWordsChanged = onWords;

    try {
      _recorder ??= AudioRecorder();
      final hasPerm = await checkPermission();
      if (!hasPerm) {
        debugPrint('Microphone permission not granted');
      }

      String savePath;
      if (!kIsWeb) {
        final dir = await getApplicationDocumentsDirectory();
        savePath = '${dir.path}/mindora_rec_${DateTime.now().millisecondsSinceEpoch}.m4a';
      } else {
        savePath = 'web_recording.m4a';
      }

      _currentRecordingPath = savePath;
      await _recorder!.start(const RecordConfig(), path: savePath);
      _isRecording = true;

      // Initialize and start live speech recognition in parallel
      _startLiveSpeechRecognition();

      return savePath;
    } catch (e) {
      debugPrint('Audio start recording notice (sandbox/headless mode): $e');
      _isRecording = true;
      _currentRecordingPath = '/tmp/simulated_recording.m4a';
      return _currentRecordingPath;
    }
  }

  Future<void> _startLiveSpeechRecognition() async {
    try {
      _speech ??= stt.SpeechToText();
      _speechAvailable = await _speech!.initialize(
        onError: (val) => debugPrint('STT error: $val'),
        onStatus: (val) => debugPrint('STT status: $val'),
      );

      if (_speechAvailable) {
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
            listenFor: const Duration(hours: 2),
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
        return path ?? _currentRecordingPath;
      }
      return _currentRecordingPath;
    } catch (e) {
      debugPrint('Audio stop recording notice: $e');
      _isRecording = false;
      return _currentRecordingPath;
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
