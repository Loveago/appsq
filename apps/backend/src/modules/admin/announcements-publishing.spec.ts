import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('Admin Announcements & Batch Publishing', () => {
  let service: AdminService;

  const mockPrisma = {
    announcement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      count: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockBillingService = {};
  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BillingService, useValue: mockBillingService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should publish announcement to targeted Pro audience in batch chunks and record audit log', async () => {
    const announcement = {
      id: 'ann-1',
      title: 'Pro Feature: Fast AssemblyAI Transcription',
      message: 'New high-speed Universal 2 model is now live for all Pro users.',
      targetTier: 'PRO',
      category: 'ANNOUNCEMENT',
      priority: 'HIGH',
      channel: 'BOTH',
      status: 'DRAFT',
      actionUrl: 'mindora://settings/pro',
    };

    mockPrisma.announcement.findUnique.mockResolvedValue(announcement);
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.announcement.update.mockResolvedValue({ ...announcement, status: 'PUBLISHED' });
    mockPrisma.user.findMany.mockResolvedValue([{ id: 'pro-user-1' }, { id: 'pro-user-2' }]);
    mockNotificationsService.createNotification.mockResolvedValue({ id: 'notif-1' });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.publishAnnouncement(
      { id: 'admin-1', email: 'admin@mindora.ai' },
      'ann-1',
    );

    expect(result.status).toBe('PUBLISHED');
    expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(2);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: 'admin-1',
          action: 'PUBLISH_ANNOUNCEMENT',
        }),
      }),
    );
  });

  it('should retract announcement and suppress linked notifications', async () => {
    const announcement = {
      id: 'ann-2',
      title: 'Maintenance window update',
      status: 'PUBLISHED',
    };

    mockPrisma.announcement.findUnique.mockResolvedValue(announcement);
    mockPrisma.announcement.update.mockResolvedValue({ ...announcement, status: 'RETRACTED' });
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await service.retractAnnouncement(
      { id: 'admin-1', email: 'admin@mindora.ai' },
      'ann-2',
    );

    expect(result.status).toBe('RETRACTED');
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { targetId: 'ann-2', targetType: 'ANNOUNCEMENT' },
      data: { deliveryStatus: 'CANCELLED' },
    });
  });
});
