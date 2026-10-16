import { Test, TestingModule } from '@nestjs/testing';
import { RemindersService } from './reminders.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AiService } from '../ai/ai.service';

describe('RemindersService', () => {
  let service: RemindersService;

  const mockPrisma = {
    reminder: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    note: {
      findFirst: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
    },
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockAiService = {
    getAiClient: jest.fn().mockResolvedValue({ client: null, model: null }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RemindersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    service = module.get<RemindersService>(RemindersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly calculate recurring intervals for DAILY, WEEKLY, and MONTHLY', () => {
    const baseDate = new Date('2026-10-20T10:00:00.000Z');

    const nextDaily = service.calculateNextOccurrence(baseDate, 'DAILY');
    expect(nextDaily.toISOString()).toBe('2026-10-21T10:00:00.000Z');

    const nextWeekly = service.calculateNextOccurrence(baseDate, 'WEEKLY');
    expect(nextWeekly.toISOString()).toBe('2026-10-27T10:00:00.000Z');

    const nextMonthly = service.calculateNextOccurrence(baseDate, 'MONTHLY');
    expect(nextMonthly.getUTCMonth()).toBe(10); // November (0-indexed: 10)
  });

  it('should process due reminders and dispatch notifications via scheduler tick', async () => {
    const dueReminder = {
      id: 'rem-1',
      userId: 'user-1',
      title: 'Review Quarterly Taxes',
      description: 'Check deduction receipts',
      remindAt: new Date(Date.now() - 10000), // In past
      recurrenceRule: 'NONE',
      status: 'PENDING',
      noteId: 'note-1',
      note: { id: 'note-1', title: 'Tax Notes', deletedAt: null },
    };

    mockPrisma.reminder.findMany.mockResolvedValue([dueReminder]);
    mockNotificationsService.createNotification.mockResolvedValue({ id: 'notif-1' });
    mockPrisma.reminder.update.mockResolvedValue({});

    const result = await service.processDueReminders();

    expect(result.processedCount).toBe(1);
    expect(result.processedIds).toContain('rem-1');
    expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        title: 'Reminder: Review Quarterly Taxes',
        deepLink: 'mindora://notes/note-1',
      }),
    );
    expect(mockPrisma.reminder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rem-1' },
        data: expect.objectContaining({ status: 'TRIGGERED' }),
      }),
    );
  });

  it('should cancel reminder if linked note was deleted to avoid dead navigation', async () => {
    const deletedNoteReminder = {
      id: 'rem-2',
      userId: 'user-1',
      title: 'Call Accountant',
      remindAt: new Date(Date.now() - 10000),
      status: 'PENDING',
      noteId: 'note-2',
      note: { id: 'note-2', title: 'Deleted Note', deletedAt: new Date() },
    };

    mockPrisma.reminder.findMany.mockResolvedValue([deletedNoteReminder]);
    mockPrisma.reminder.update.mockResolvedValue({});

    const result = await service.processDueReminders();

    expect(result.processedCount).toBe(0);
    expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    expect(mockPrisma.reminder.update).toHaveBeenCalledWith({
      where: { id: 'rem-2' },
      data: { status: 'CANCELLED' },
    });
  });
});
