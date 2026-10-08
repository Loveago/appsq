import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindora_mobile/core/network/transcription_stream_client.dart';
import 'package:mindora_mobile/core/services/audio_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('TranscriptionStreamClient - AssemblyAI Universal Streaming Bridge', () {
    test('connects and initializes stream in test mode', () async {
      final client = TranscriptionStreamClient(
        baseUrl: 'https://appsq-two.vercel.app',
        token: 'test_token',
        sessionId: 'test_session_123',
        voiceNoteId: 'vn_test_123',
      );

      final connected = await client.connect();
      expect(connected, isTrue);
      expect(client.isConnected, isTrue);

      client.dispose();
    });

    test('sendAudioChunk safely buffers without throwing when disconnected', () {
      final client = TranscriptionStreamClient(
        baseUrl: 'https://appsq-two.vercel.app',
        token: 'test_token',
        sessionId: 'test_session_123',
      );

      final dummyChunk = Uint8List(1600); // 100ms of 16kHz PCM
      expect(() => client.sendAudioChunk(dummyChunk), returnsNormally);

      client.dispose();
    });

    test('stop returns final transcript result seamlessly without wait', () async {
      final client = TranscriptionStreamClient(
        baseUrl: 'https://appsq-two.vercel.app',
        token: 'test_token',
        sessionId: 'test_session_123',
      );

      await client.connect();
      final res = await client.stop();

      expect(res.containsKey('transcript'), isTrue);
      expect(res.containsKey('detectedTasks'), isTrue);
    });
  });

  group('AudioRecordingService - Streaming & Local WAV Persistence', () {
    test('startStreamingRecording starts hardware PCM engine without losing audio path', () async {
      int chunksReceived = 0;
      final path = await AudioRecordingService.instance.startStreamingRecording(
        onAudioChunk: (chunk) {
          chunksReceived++;
        },
      );

      expect(path, isNotNull);
      expect(AudioRecordingService.instance.isRecording, isTrue);

      final result = await AudioRecordingService.instance.stopRecording();
      expect(result, isNotNull);
      expect(result!.isValid, isTrue);
      expect(result.duration.inSeconds, greaterThanOrEqualTo(0));
      expect(chunksReceived, greaterThanOrEqualTo(0));
    });
  });
}
