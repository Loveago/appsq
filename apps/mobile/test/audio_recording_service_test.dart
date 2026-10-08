import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/core/services/audio_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('AudioRecordingService Engine Unit Tests', () {
    test('State machine transitions cleanly between Idle, Initializing, Recording, and Completed', () async {
      final service = AudioRecordingService.instance;
      expect(service.status, equals(RecordingStatus.idle));
      expect(service.isRecording, isFalse);

      // Start recording
      final path = await service.startRecording();
      expect(path, isNotNull);
      expect(service.status, equals(RecordingStatus.recording));
      expect(service.isRecording, isTrue);

      // Double-start concurrency protection: subsequent start should not re-initialize or corrupt active recording
      final secondPath = await service.startRecording();
      expect(secondPath, equals(path));
      expect(service.status, equals(RecordingStatus.recording));

      // Pause and Resume checks
      final paused = await service.pauseRecording();
      expect(paused, isTrue);
      expect(service.status, equals(RecordingStatus.paused));
      expect(service.isPaused, isTrue);

      final resumed = await service.resumeRecording();
      expect(resumed, isTrue);
      expect(service.status, equals(RecordingStatus.recording));

      // Stop and finalize
      final RecordingResult? result = await service.stopRecording();
      expect(result, isNotNull);
      expect(result!.isValid, isTrue);
      expect(result.duration.inMilliseconds, greaterThan(0));
      expect(result.fileSizeBytes, greaterThan(0));
      expect(result.filePath, isNotEmpty);
      expect(service.status, equals(RecordingStatus.completed));
      expect(service.isRecording, isFalse);

      // Double-stop protection: subsequent stop when idle returns cached path or null safely
      final doubleStop = await service.stopRecording();
      expect(doubleStop, isNull);
    });

    test('RecordingResult properly exposes metadata and validation', () {
      const result = RecordingResult(
        filePath: '/mock/mindora_rec_123.m4a',
        duration: Duration(seconds: 15),
        fileSizeBytes: 24500,
        isValid: true,
      );

      expect(result.isValid, isTrue);
      expect(result.duration.inSeconds, equals(15));
      expect(result.fileSizeBytes, equals(24500));
      expect(result.mimeType, equals('audio/m4a'));
      expect(result.filePath, contains('.m4a'));
    });
  });
}
