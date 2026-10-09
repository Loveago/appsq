import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { PrismaService } from '../../database/prisma.service';

import { BillingService } from '../billing/billing.service';

describe('AiService', () => {
  let service: AiService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'FREE',
        monthlyAiTokensUsed: 1000,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-key'),
  };

  const mockBillingService = {
    canTranscribe: jest.fn().mockResolvedValue({ allowed: true }),
    recordTranscriptionUsage: jest.fn().mockResolvedValue(true),
    canUseAiTokens: jest.fn().mockResolvedValue({ allowed: true }),
    recordAiTokensUsage: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extract people, projects, and actionable tasks from raw content', async () => {
    const content =
      'Met John today about the website. Need to finish payment integration and verify Stripe webhook.';
    const result = await service.extractContext(content, 'user-1', false);

    expect(result.people).toContain('John');
    expect(result.projects).toContain('Website Project');
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.suggestedTitle).toBeDefined();
  });

  it('should distill meeting transcript into summary, decisions, and action items', async () => {
    const transcript =
      'Discussed launch roadmap before September. Agreed on Stripe payment webhook signature checks.';
    const result = await service.distillMeeting(transcript, 'user-1');

    expect(result.summary).toBeDefined();
    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it('should generate grounded answers and cite source notes in Ask Your Notes', async () => {
    const notes = [
      {
        id: 'n1',
        title: 'Meeting with John',
        content: 'John wants website launched before September with Stripe integration.',
      },
    ];

    const result = await service.askNotes('What did John decide on Stripe?', notes, 'user-1');
    expect(result.citedNoteIds).toContain('n1');
    expect(result.answer).toContain('Meeting with John');
  });

  it('should generate 1536-dimensional embeddings for vector search', async () => {
    const embedding = await service.generateEmbedding('Architecture and pgvector similarity');
    expect(embedding.length).toBe(1536);
  });

  it('should execute chatWithTools with general and personal queries gracefully', async () => {
    // Mock prisma for conversations and notes
    (mockPrismaService as any).aiConversation = {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'conv-1', title: 'What is Tokyo', messages: [] }),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([{ id: 'conv-1', title: 'Tokyo', messages: [] }]),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    (mockPrismaService as any).aiMessage = {
      create: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    };
    (mockPrismaService as any).note = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'note-1', title: 'Delivery App Ideas' }),
    };
    (mockPrismaService as any).task = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'task-1', title: 'Review Stripe Webhook' }),
    };
    (mockPrismaService as any).project = {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'proj-1', name: 'Delivery App' }),
    };
    (mockPrismaService as any).meeting = {
      findMany: jest.fn().mockResolvedValue([]),
    };
    (mockPrismaService as any).smartList = {
      create: jest.fn().mockResolvedValue({ id: 'list-1', title: 'Launch List' }),
    };

    const chatRes = await service.chatWithTools('user-1', 'What is the capital of Japan?');
    expect(chatRes.conversationId).toBe('conv-1');
    expect(chatRes.answer).toBeDefined();

    const noteCreationRes = await service.chatWithTools('user-1', 'Create a note about delivery app ideas');
    expect(noteCreationRes.actionsExecuted.length).toBeGreaterThan(0);
    expect(noteCreationRes.actionsExecuted[0].tool).toBe('create_note');
  });

  it('should retrieve relevant notes by scoring keywords and filtering archived/deleted notes', async () => {
    (mockPrismaService as any).note.findMany = jest.fn().mockImplementation((args: any) => {
      // Check that soft deleted and archived are filtered out
      expect(args.where.isArchived).toBe(false);
      expect(args.where.deletedAt).toBeNull();
      return [
        {
          id: 'note-biz',
          title: 'Business Idea: AI Notes',
          content: 'We are building an executive second brain app with audio memos.',
          summary: 'Second brain app',
          isPinned: true,
          updatedAt: new Date(),
        },
        {
          id: 'note-recipe',
          title: 'Pasta Recipe',
          content: 'Tomato sauce and basil.',
          summary: 'Food',
          isPinned: false,
          updatedAt: new Date(Date.now() - 30 * 24 * 3600 * 1000),
        },
      ];
    });

    const notes = await service.retrieveRelevantNotes('user-1', 'What did I write about my business idea?');
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].id).toBe('note-biz');
  });

  it('should record user audio metadata and retrieve full conversation messages', async () => {
    const mockMessages = [
      {
        id: 'msg-u1',
        role: 'user',
        content: 'Transcribed voice memo',
        metadata: { isAudio: true, audioPath: '/tmp/memo.m4a', durationSec: 12 },
        createdAt: new Date(),
      },
      {
        id: 'msg-a1',
        role: 'assistant',
        content: 'Understood your audio note.',
        citedNoteIds: ['note-biz'],
        metadata: { sources: [{ id: 'note-biz', title: 'Business Idea' }] },
        createdAt: new Date(),
      },
    ];

    (mockPrismaService as any).aiConversation.findFirst = jest.fn().mockResolvedValue({
      id: 'conv-voice',
      userId: 'user-1',
      title: 'Voice Note Chat',
      messages: mockMessages,
    });

    const conv = await service.getConversation('conv-voice', 'user-1');
    expect(conv).toBeDefined();
    expect(conv.messages.length).toBe(2);
    expect((conv.messages[0] as any).metadata.isAudio).toBe(true);
  });

  it('should require user confirmation before executing destructive archive_note tool', async () => {
    (mockPrismaService as any).note.updateMany = jest.fn().mockResolvedValue({ count: 1 });

    // Without confirmation
    const unconfirmed = await (service as any).executeToolAction('user-1', 'archive_note', {
      noteId: 'note-123',
      confirmed: false,
    });
    expect(unconfirmed.success).toBe(false);
    expect(unconfirmed.result.requiresConfirmation).toBe(true);

    // With confirmation
    const confirmed = await (service as any).executeToolAction('user-1', 'archive_note', {
      noteId: 'note-123',
      confirmed: true,
    });
    expect(confirmed.success).toBe(true);
    expect(confirmed.result.archived).toBe(true);
  });

  it('should enforce transcription quota and protect user recording on limit reach', async () => {
    (mockBillingService.canTranscribe as jest.Mock).mockResolvedValueOnce({ allowed: false });

    const result = await service.transcribeAudio('', 'user-1', Buffer.from('test'), undefined, 45);
    expect(result.error).toBe('TRANSCRIPTION_LIMIT_REACHED');
    expect(result.transcript).toBe('');
  });

  it('should retrieve saved meetings with decisions and action items in personal context', async () => {
    (mockPrismaService as any).meeting = {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'mtg-q3-sync',
          title: 'Q3 Product & Payments Sync',
          summary: 'Discussed launching Stripe subscriptions and new mobile UI.',
          transcript: 'Emmanuel: We will target next Monday for launch. Sarah: Payment integration will be ready Friday.',
          decisions: ['Target Monday for launch', 'Deploy backend to production'],
          actionItems: [{ assignee: 'Sarah', task: 'Complete payment integration', deadline: 'Friday' }],
          speakers: [{ key: 'A', displayName: 'Emmanuel' }, { key: 'B', displayName: 'Sarah' }],
          segments: [
            { speakerName: 'Emmanuel', text: 'We will target next Monday for launch.' },
            { speakerName: 'Sarah', text: 'Payment integration will be ready Friday.' },
          ],
          createdAt: new Date(),
        },
      ]),
    };

    const context = await service.retrieveUserPersonalContext('user-1', 'What did we decide about the launch in our last meeting?');
    expect(context.meetings.length).toBeGreaterThan(0);
    expect(context.meetings[0].id).toBe('mtg-q3-sync');
    expect(context.contextPrompt).toContain('<<<SAVED_MEETINGS>>>');
    expect(context.contextPrompt).toContain('Target Monday for launch');
    expect(context.contextPrompt).toContain('Sarah: "Payment integration will be ready Friday."');
    expect(context.sources.some((s) => s.id === 'mtg-q3-sync' && s.tag === 'Meeting')).toBe(true);
  });

  it('should stream progressive chat stages and response via chatWithToolsStream', async () => {
    const events: Array<{ event: string; data: any }> = [];
    (mockPrismaService as any).aiConversation.create = jest.fn().mockResolvedValue({
      id: 'conv-stream-1',
      title: 'Streaming Chat',
      messages: [],
    });
    (mockPrismaService as any).aiMessage.create = jest.fn().mockResolvedValue({});
    (mockPrismaService as any).aiConversation.update = jest.fn().mockResolvedValue({});

    await service.chatWithToolsStream(
      'user-1',
      'What were the action items from my meeting with Sarah?',
      undefined,
      undefined,
      (event, data) => {
        events.push({ event, data });
      },
    );

    const stages = events.filter((e) => e.event === 'status').map((e) => e.data.stage);
    expect(stages).toContain('preparing');
    expect(stages).toContain('retrieving');
    expect(stages).toContain('thinking');
    expect(stages).toContain('completed');

    const doneEvent = events.find((e) => e.event === 'done');
    expect(doneEvent).toBeDefined();
    expect(doneEvent?.data.answer).toBeDefined();
  });
});

