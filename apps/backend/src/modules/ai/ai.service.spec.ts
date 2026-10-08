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
});
