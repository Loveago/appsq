import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma.service';

describe('NotificationsService', () => {
  let service: NotificationsService;

  const mockPrisma = {
    notification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    userDevice: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should prevent duplicate notifications with the same idempotencyKey', async () => {
    const existingNotification = {
      id: 'notif-1',
      userId: 'user-1',
      title: 'Existing',
      body: 'Already sent',
      idempotencyKey: 'idem-123',
    };

    mockPrisma.notification.findUnique.mockResolvedValue(existingNotification);

    const result = await service.createNotification({
      userId: 'user-1',
      title: 'New attempt',
      body: 'Should not create duplicate',
      idempotencyKey: 'idem-123',
    });

    expect(result).toEqual(existingNotification);
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('should suppress notifications when category is disabled by user preferences', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null);
    mockPrisma.notificationPreference.findUnique.mockResolvedValue({
      userId: 'user-1',
      pushEnabled: true,
      inAppEnabled: true,
      reminderAlerts: false, // Disabled!
      noteReviewAlerts: true,
      taskDueAlerts: true,
      meetingAlerts: true,
      voiceNoteAlerts: true,
      announcements: true,
    });

    const result = await service.createNotification({
      userId: 'user-1',
      title: 'Dentist Reminder',
      body: 'Time to go',
      category: 'REMINDER',
    });

    expect(result).toBeNull();
    expect(mockPrisma.notification.create).not.toHaveBeenCalled();
  });

  it('should create notification and return unread count correctly', async () => {
    mockPrisma.notification.findUnique.mockResolvedValue(null);
    mockPrisma.notificationPreference.findUnique.mockResolvedValue({
      userId: 'user-1',
      pushEnabled: true,
      inAppEnabled: true,
      reminderAlerts: true,
      noteReviewAlerts: true,
      taskDueAlerts: true,
      meetingAlerts: true,
      voiceNoteAlerts: true,
      announcements: true,
    });

    const createdNotif = {
      id: 'notif-2',
      userId: 'user-1',
      title: 'Review Note',
      body: 'Review your meeting note',
      category: 'NOTE_REVIEW',
      isRead: false,
    };
    mockPrisma.notification.create.mockResolvedValue(createdNotif);
    mockPrisma.userDevice.findMany.mockResolvedValue([]);

    const result = await service.createNotification({
      userId: 'user-1',
      title: 'Review Note',
      body: 'Review your meeting note',
      category: 'NOTE_REVIEW',
    });

    expect(result).toEqual(createdNotif);
    expect(mockPrisma.notification.create).toHaveBeenCalled();

    mockPrisma.notification.count.mockResolvedValue(3);
    const unread = await service.getUnreadCount('user-1');
    expect(unread).toBe(3);
  });
});
