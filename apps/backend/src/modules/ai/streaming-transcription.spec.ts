import { StreamingTranscriptionGateway } from './streaming-transcription.gateway';

describe('StreamingTranscriptionGateway - AssemblyAI Universal Streaming', () => {
  let gateway: StreamingTranscriptionGateway;
  let mockHttpAdapterHost: any;
  let mockConfigService: any;
  let mockPrisma: any;
  let mockAiService: any;
  let mockBillingService: any;
  let mockJwtService: any;

  beforeEach(() => {
    mockHttpAdapterHost = {
      httpAdapter: {
        getHttpServer: jest.fn().mockReturnValue({
          on: jest.fn(),
        }),
      },
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test_jwt_secret';
        if (key === 'ASSEMBLYAI_API_KEY') return 'test_aai_key';
        return null;
      }),
    };

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_123',
          email: 'user@mindora.ai',
          isSuspended: false,
          accountStatus: 'ACTIVE',
        }),
      },
      voiceNote: {
        upsert: jest.fn().mockResolvedValue({ id: 'vn_1' }),
      },
      meeting: {
        update: jest.fn().mockResolvedValue({ id: 'mt_1' }),
      },
    };

    mockAiService = {
      getAssemblyAiKey: jest.fn().mockResolvedValue('test_aai_key_123'),
      extractContext: jest.fn().mockResolvedValue({
        tasks: [{ title: 'Review quarterly goals' }],
        deadlines: ['Friday'],
        suggestedTitle: 'Quarterly Goals Sync',
      }),
    };

    mockBillingService = {
      canTranscribe: jest.fn().mockResolvedValue({
        allowed: true,
        remainingMinutes: 30,
        limitMinutes: 30,
        usedMinutes: 0,
      }),
      recordTranscriptionUsage: jest.fn().mockResolvedValue(true),
    };

    mockJwtService = {
      verify: jest.fn().mockReturnValue({ sub: 'user_123' }),
    };

    gateway = new StreamingTranscriptionGateway(
      mockHttpAdapterHost,
      mockConfigService,
      mockPrisma,
      mockAiService,
      mockBillingService,
      mockJwtService,
    );
  });

  it('should initialize WebSocket gateway on /transcription/stream during bootstrap', () => {
    gateway.onApplicationBootstrap();
    expect(mockHttpAdapterHost.httpAdapter.getHttpServer).toHaveBeenCalled();
  });

  it('should deny unauthorized requests without valid JWT', async () => {
    const mockWs: any = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };
    const mockReq: any = {
      url: '/transcription/stream',
      headers: {},
    };

    // @ts-ignore - access private method for testing
    await gateway['handleClientConnection'](mockWs, mockReq);

    expect(mockWs.close).toHaveBeenCalledWith(4001, 'Unauthorized');
  });

  it('should deny streaming when user transcription quota is reached', async () => {
    mockBillingService.canTranscribe.mockResolvedValueOnce({
      allowed: false,
      remainingMinutes: 0,
      limitMinutes: 30,
      usedMinutes: 30,
    });

    const mockWs: any = {
      send: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
      readyState: 1, // WebSocket.OPEN
    };
    const mockReq: any = {
      url: '/transcription/stream?token=valid_token',
      headers: {},
    };

    // @ts-ignore
    await gateway['handleClientConnection'](mockWs, mockReq);

    expect(mockWs.send).toHaveBeenCalledWith(
      expect.stringContaining('TRANSCRIPTION_LIMIT_REACHED'),
    );
    expect(mockWs.close).toHaveBeenCalledWith(4003, 'Quota Exceeded');
  });

  it('should correctly calculate audio duration from 16kHz 16-bit PCM (32,000 bytes/sec)', async () => {
    const session: any = {
      sessionId: 'sess_test',
      userId: 'user_123',
      voiceNoteId: 'vn_test',
      totalAudioBytes: 96000, // 96,000 bytes = 3 seconds
      collectedTranscript: 'First turn.',
      currentTurnTranscript: 'Second turn.',
      maxAllowedSec: 1800,
      limitReached: false,
      isFinalized: false,
      clientWs: { send: jest.fn(), close: jest.fn(), readyState: 1 },
      aaiWs: { send: jest.fn(), close: jest.fn(), readyState: 1 },
    };

    // @ts-ignore
    await gateway['finalizeAndPersistSession'](session);

    // Should record 3 seconds of audio usage
    expect(mockBillingService.recordTranscriptionUsage).toHaveBeenCalledWith(
      'user_123',
      3,
      'TRANSCRIPTION',
      expect.objectContaining({ sessionId: 'sess_test' }),
    );

    // Should save combined canonical transcript to VoiceNote
    expect(mockPrisma.voiceNote.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          transcript: 'First turn. Second turn.',
          durationSec: 3,
          status: 'TRANSCRIBED',
        }),
      }),
    );
  });

  it('should handle partial and final turn messages from AssemblyAI Universal Streaming', () => {
    const session: any = {
      sessionId: 'sess_test',
      clientWs: { send: jest.fn(), readyState: 1 },
      collectedTranscript: '',
      currentTurnTranscript: '',
    };

    // Partial turn
    const partialMsg = Buffer.from(
      JSON.stringify({
        type: 'Turn',
        transcript: 'Today I want to talk',
        end_of_turn: false,
      }),
    );
    // @ts-ignore
    gateway['handleAssemblyAiMessage'](session, partialMsg);

    expect(session.clientWs.send).toHaveBeenCalledWith(
      expect.stringContaining('partial_transcript'),
    );

    // Final turn
    const finalMsg = Buffer.from(
      JSON.stringify({
        type: 'Turn',
        transcript: 'Today I want to talk about our product roadmap.',
        end_of_turn: true,
      }),
    );
    // @ts-ignore
    gateway['handleAssemblyAiMessage'](session, finalMsg);

    expect(session.clientWs.send).toHaveBeenLastCalledWith(
      expect.stringContaining('final_turn'),
    );
    expect(session.collectedTranscript).toBe(
      'Today I want to talk about our product roadmap.',
    );
  });
});
