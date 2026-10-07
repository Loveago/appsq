import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { PrismaService } from '../../database/prisma.service';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
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
});
