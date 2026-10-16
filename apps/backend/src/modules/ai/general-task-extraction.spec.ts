import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';

describe('General-Purpose Task Extraction Engine', () => {
  let service: AiService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'user-1',
        subscriptionTier: 'PRO',
        monthlyAiTokensUsed: 100,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue(null), // Test heuristic engine reliably without external network dependencies
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

  describe('Domain 1: Cooking & Culinary Procedures (e.g. Banku recipe)', () => {
    it('accurately extracts procedural cooking tasks and preserves sequence from Banku note', async () => {
      const bankuNote = `How to prepare Banku:
1. Mix 2 cups fermented corn dough and 1 cup cassava dough with warm water in a pot until smooth.
2. Add a pinch of salt to the mixture.
3. Heat the mixture over medium flame, stirring continuously with a wooden spatula.
4. Knead firmly against the pot sides as the mixture thickens into a smooth, stiff dough.
5. Shape into smooth balls and wrap in cling film.`;

      const result = await service.extractContext(bankuNote, 'user-1', true);

      expect(result.tasks.length).toBeGreaterThanOrEqual(4);
      expect(result.projects[0]).toMatch(/Banku|Cooking/i);

      // Verify sequence ordering
      const stepNumbers = result.tasks.map((t) => t.stepNumber).filter((n) => n !== null && n !== undefined);
      expect(stepNumbers).toEqual([1, 2, 3, 4, 5]);

      // Verify action items contain key culinary verbs
      const titles = result.tasks.map((t) => t.title.toLowerCase());
      expect(titles.some((t) => t.includes('mix'))).toBe(true);
      expect(titles.some((t) => t.includes('heat') || t.includes('stir'))).toBe(true);
      expect(titles.some((t) => t.includes('knead'))).toBe(true);
    });

    it('extracts sourdough baking routine with sequential steps', async () => {
      const sourdoughNote = `Sourdough baking routine:
1. Mix 500g bread flour with 350g water and let autolyse for 30 minutes.
2. Add 100g active sourdough starter and 10g salt.
3. Perform 4 stretch and folds every 30 minutes.
4. Proof dough overnight in the refrigerator.
5. Bake in Dutch oven at 230C for 25 minutes covered, then 20 minutes uncovered.`;

      const result = await service.extractContext(sourdoughNote, 'user-1', true);
      expect(result.tasks.length).toBe(5);
      expect(result.tasks[0].stepNumber).toBe(1);
      expect(result.tasks[4].stepNumber).toBe(5);
    });
  });

  describe('Domain 2: Technical Setup & DevOps Runbooks', () => {
    it('extracts deployment and infrastructure tasks in proper sequence', async () => {
      const devOpsNote = `Deployment runbook:
1. Install Docker and Docker Compose on the target server.
2. Run database migrations using npx prisma migrate deploy.
3. Configure environment variables in .env production file.
4. Deploy container with docker compose up -d.`;

      const result = await service.extractContext(devOpsNote, 'user-1', true);

      expect(result.tasks.length).toBe(4);
      expect(result.tasks.some((t) => t.title.includes('Install Docker'))).toBe(true);
      expect(result.tasks.some((t) => t.title.includes('Run database migrations'))).toBe(true);
      expect(result.tasks.some((t) => t.title.includes('Configure environment variables'))).toBe(true);
      expect(result.tasks.some((t) => t.title.includes('Deploy container'))).toBe(true);
    });
  });

  describe('Domain 3: Academic & Study Notes', () => {
    it('extracts study action items and recognizes deadlines', async () => {
      const studyNote = `Neuroscience exam prep:
- Read chapter 4 on synaptic transmission
- Write flashcards for neurotransmitters
- Submit assignment to professor by Friday`;

      const result = await service.extractContext(studyNote, 'user-1', true);

      expect(result.tasks.length).toBe(3);
      expect(result.deadlines).toContain('Friday');
      expect(result.tasks.some((t) => t.title.toLowerCase().includes('read chapter 4'))).toBe(true);
      expect(result.tasks.some((t) => t.title.toLowerCase().includes('submit assignment'))).toBe(true);
    });
  });

  describe('Domain 4: Business & Client Operations', () => {
    it('extracts business action items, client names, and due dates', async () => {
      const businessNote = `Client onboarding for Acme Corp:
- Send contract and NDA to Sarah
- Setup Slack channel for project communication
- Schedule kickoff call for tomorrow`;

      const result = await service.extractContext(businessNote, 'user-1', true);

      expect(result.tasks.length).toBe(3);
      expect(result.people).toContain('Sarah');
      expect(result.deadlines).toContain('Tomorrow');
      expect(result.tasks.some((t) => t.title.toLowerCase().includes('send contract'))).toBe(true);
    });
  });

  describe('Domain 5: Shopping & Travel Preparation', () => {
    it('categorizes purchases and travel errands correctly', async () => {
      const travelNote = `Tokyo trip preparation:
- Buy travel power adapter for Japan
- Order international eSIM online
- Confirm hotel reservation in Shinjuku`;

      const result = await service.extractContext(travelNote, 'user-1', true);

      expect(result.tasks.length).toBe(3);
      const buyTask = result.tasks.find((t) => t.title.toLowerCase().includes('buy travel power adapter'));
      expect(buyTask).toBeDefined();
      expect(buyTask?.taskType).toBe('PURCHASE');
    });
  });

  describe('Domain 6: Zero-Hallucination & Non-Actionable Content', () => {
    it('extracts ZERO tasks from purely descriptive poetic notes', async () => {
      const poeticNote = `The sunset over the rolling hills was a magnificent shade of amber and lavender.
The evening breeze was cool, and crickets chirped softly in the grass.
It was a peaceful and quiet moment.`;

      const result = await service.extractContext(poeticNote, 'user-1', true);

      // Must NOT hallucinate tasks out of poetic descriptions
      expect(result.tasks.length).toBe(0);
    });

    it('extracts ZERO tasks from philosophical musings and quoted text', async () => {
      const quoteNote = `Reflections on Stoicism:
"We suffer more often in imagination than in reality." - Seneca.
I wonder how ancient philosophers viewed the passage of time. Modern life feels unnecessarily rushed.`;

      const result = await service.extractContext(quoteNote, 'user-1', true);

      // Quotes and musings must not become active commitments
      expect(result.tasks.length).toBe(0);
    });
  });
});
