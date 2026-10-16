import { Test, TestingModule } from '@nestjs/testing';
import { CloudSyncService } from './cloud-sync.service';
import { PrismaService } from '../../database/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('CloudSyncService - Text Notes Only, Pro Gating & Retention', () => {
  let service: CloudSyncService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    note: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    userDevice: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(async (cb) => {
      if (typeof cb === 'function') {
        return cb(mockPrisma);
      }
      return Promise.all(cb);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudSyncService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CloudSyncService>(CloudSyncService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('1. Pro Subscription Gating', () => {
    it('should allow active Pro user to access cloud sync', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_pro_1',
        email: 'pro@vynotes.ai',
        subscriptionTier: 'PRO',
        plan: 'PRO',
        cloudSyncEnabled: true,
        cloudStorageBytes: 1024,
        cloudStorageQuotaBytes: 26214400,
      });

      const user = await service.validateUserPro('user_pro_1');
      expect(user).toBeDefined();
      expect(user.id).toBe('user_pro_1');
    });

    it('should allow Trial user with trial entitlement to access cloud sync', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_trial_1',
        email: 'trial@vynotes.ai',
        subscriptionTier: 'FREE',
        plan: 'TRIAL',
        cloudSyncEnabled: true,
        cloudStorageBytes: 500,
        cloudStorageQuotaBytes: 26214400,
      });

      const user = await service.validateUserPro('user_trial_1');
      expect(user).toBeDefined();
      expect(user.id).toBe('user_trial_1');
    });

    it('should strictly deny Free user from cloud sync with PRO_REQUIRED error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_free_1',
        email: 'free@vynotes.ai',
        subscriptionTier: 'FREE',
        plan: 'FREE',
      });

      await expect(service.validateUserPro('user_free_1')).rejects.toThrow(ForbiddenException);
    });

    it('should deny sync when account is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.validateUserPro('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('2. Strict Text-Only Payload Validation (Media Exclusion)', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_pro_1',
        subscriptionTier: 'PRO',
        plan: 'PRO',
        cloudStorageBytes: 0,
        cloudStorageQuotaBytes: 26214400,
      });
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
    });

    it('should reject payload containing audioPath', async () => {
      const payload: any = {
        items: [
          {
            id: 'note_1',
            title: 'Meeting Discussion',
            content: 'Summary of the roadmap',
            audioPath: '/local/storage/audio/rec_123.wav', // PROHIBITED!
            clientRevision: 1,
          },
        ],
      };

      await expect(service.pushChanges('user_pro_1', payload)).rejects.toThrow(BadRequestException);
    });

    it('should reject payload containing imagePaths or photos', async () => {
      const payload: any = {
        items: [
          {
            id: 'note_2',
            title: 'Whiteboard',
            content: 'Notes from board',
            imagePaths: ['/images/board.jpg'], // PROHIBITED!
            clientRevision: 1,
          },
        ],
      };

      await expect(service.pushChanges('user_pro_1', payload)).rejects.toThrow(BadRequestException);
    });

    it('should reject payload containing embedded audio data URI', async () => {
      const payload: any = {
        items: [
          {
            id: 'note_3',
            title: 'Voice Recording Note',
            content: 'data:audio/wav;base64,UklGRi4AAABXQVZFZm10IBAAAAABAAEA...', // PROHIBITED!
            clientRevision: 1,
          },
        ],
      };

      await expect(service.pushChanges('user_pro_1', payload)).rejects.toThrow(BadRequestException);
    });

    it('should reject note exceeding maximum text size limit (500 KB)', async () => {
      const oversizedText = 'A'.repeat(600 * 1024); // 600 KB text
      const payload: any = {
        items: [
          {
            id: 'note_oversized',
            title: 'Large Dump',
            content: oversizedText,
            clientRevision: 1,
          },
        ],
      };

      await expect(service.pushChanges('user_pro_1', payload)).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Storage Quota Enforcement', () => {
    it('should reject push if user cloud storage quota would be exceeded', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_pro_1',
        subscriptionTier: 'PRO',
        plan: 'PRO',
        cloudStorageBytes: 26210000, // almost full (25 MB limit)
        cloudStorageQuotaBytes: 26214400,
      });
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const payload: any = {
        items: [
          {
            id: 'note_extra',
            title: 'Push exceeding quota',
            content: 'X'.repeat(10000), // 10 KB addition
            clientRevision: 1,
          },
        ],
      };

      await expect(service.pushChanges('user_pro_1', payload)).rejects.toThrow(BadRequestException);
    });
  });

  describe('4. Incremental Pull & Push with Revision Conflict Detection', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_pro_1',
        subscriptionTier: 'PRO',
        plan: 'PRO',
        cloudStorageBytes: 100,
        cloudStorageQuotaBytes: 26214400,
      });
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.note.findMany.mockResolvedValue([]);
    });

    it('should pull changes and include tombstones without media fields', async () => {
      const now = new Date();
      mockPrisma.note.findMany.mockResolvedValue([
        {
          id: 'note_1',
          title: 'Architecture Review',
          content: 'Clean microservices architecture',
          isPinned: true,
          serverRevision: 3,
          clientModifiedAt: now,
          deletedAt: null,
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'note_2',
          title: 'Old Draft',
          content: 'Deleted content',
          isPinned: false,
          serverRevision: 4,
          clientModifiedAt: now,
          deletedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ]);

      const res = await service.pullChanges('user_pro_1', { lastSyncTimestamp: new Date(0).toISOString() });
      expect(res.notes).toHaveLength(2);
      expect(res.notes[0].isDeleted).toBe(false);
      expect(res.notes[1].isDeleted).toBe(true);
      expect((res.notes[0] as any).audioPath).toBeUndefined();
    });

    it('should detect conflicting edit when client revision is older than server revision', async () => {
      mockPrisma.note.findFirst.mockResolvedValue({
        id: 'note_conflict',
        userId: 'user_pro_1',
        title: 'Original Title',
        content: 'Server content updated by device B',
        serverRevision: 3, // Server is at revision 3
        updatedAt: new Date(),
        deletedAt: null,
      });

      const payload: any = {
        items: [
          {
            id: 'note_conflict',
            title: 'Stale Edit Title',
            content: 'Client content modified offline from old revision 1',
            clientRevision: 1, // Stale!
          },
        ],
      };

      const res = await service.pushChanges('user_pro_1', payload);
      expect(res.conflicts).toHaveLength(1);
      expect(res.conflicts[0].noteId).toBe('note_conflict');
      expect(res.conflicts[0].serverRevision).toBe(3);
      expect(res.conflicts[0].serverContent).toBe('Server content updated by device B');
    });

    it('should create new note and apply deletion tombstone cleanly', async () => {
      mockPrisma.note.findFirst
        .mockResolvedValueOnce(null) // note_new doesn't exist
        .mockResolvedValueOnce({ id: 'note_del', userId: 'user_pro_1', deletedAt: null }); // note_del exists

      const payload: any = {
        items: [
          {
            id: 'note_new',
            title: 'Brand New Note',
            content: 'Offline thought',
            clientRevision: 1,
            isDeleted: false,
          },
          {
            id: 'note_del',
            title: 'Trash Note',
            content: 'To delete',
            clientRevision: 2,
            isDeleted: true,
          },
        ],
      };

      const res = await service.pushChanges('user_pro_1', payload);
      expect(res.appliedCount).toBe(2);
      expect(mockPrisma.note.create).toHaveBeenCalled();
      expect(mockPrisma.note.update).toHaveBeenCalled();
    });
  });

  describe('5. User-Controlled Sync & Expiration Lifecycle', () => {
    it('should enable sync and clear pending expiration on user notes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_pro_1',
        subscriptionTier: 'PRO',
        plan: 'PRO',
      });

      const res = await service.enableSync('user_pro_1');
      expect(res.success).toBe(true);
      expect(res.cloudSyncEnabled).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ cloudSyncEnabled: true, cloudSyncDisabledAt: null }),
        }),
      );
      expect(mockPrisma.note.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pendingExpirationAt: null, expirationReason: null }),
        }),
      );
    });

    it('should disable sync, start 90-day retention countdown, and NOT delete cloud notes immediately', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);

      const res = await service.disableSync('user_pro_1');
      expect(res.success).toBe(true);
      expect(res.cloudSyncEnabled).toBe(false);
      expect(res.daysUntilExpiration).toBe(90);

      // Verify notes were marked with pending expiration instead of being deleted
      expect(mockPrisma.note.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.note.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ expirationReason: 'SYNC_DISABLED' }),
        }),
      );
    });

    it('should permanently delete cloud data when user explicitly triggers Delete Cloud Data', async () => {
      mockPrisma.note.count.mockResolvedValue(15);

      const res = await service.deleteCloudData('user_pro_1');
      expect(res.success).toBe(true);
      expect(res.deletedCount).toBe(15);
      expect(mockPrisma.note.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user_pro_1' } });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_pro_1' },
          data: expect.objectContaining({ cloudStorageBytes: 0, cloudSyncEnabled: false }),
        }),
      );
    });
  });

  describe('6. Automated Retention Cleanup Job', () => {
    it('should perform dry-run without deleting records', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.note.count
        .mockResolvedValueOnce(5) // 5 tombstones
        .mockResolvedValueOnce(10); // 10 pro expired notes
      mockPrisma.note.findMany.mockResolvedValue([
        { id: 'exp_1', userId: 'u1', title: 'T1', content: 'C1' },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'u_exp' }]);

      const res = await service.cleanupExpiredCloudNotes(true, 'admin@vynotes.ai');
      expect(res.dryRun).toBe(true);
      expect(res.totalEligibleCount).toBe(16); // 5 + 1 + 10
      expect(mockPrisma.note.deleteMany).not.toHaveBeenCalled();
    });

    it('should execute live cleanup and record audit log', async () => {
      mockPrisma.systemSetting.findUnique.mockResolvedValue(null);
      mockPrisma.note.count.mockResolvedValue(2);
      mockPrisma.note.findMany.mockResolvedValue([]);
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.note.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'admin_1', email: 'admin@vynotes.ai' });

      const res = await service.cleanupExpiredCloudNotes(false, 'admin@vynotes.ai');
      expect(res.dryRun).toBe(false);
      expect(res.deletedCount).toBe(2);
      expect(mockPrisma.note.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });
  });

  describe('7. Device and Session Management', () => {
    it('should list devices and allow revoking remote sessions', async () => {
      mockPrisma.userDevice.findMany.mockResolvedValue([
        { id: 'dev_1', deviceModel: 'Pixel 8', platform: 'ANDROID', isActive: true },
        { id: 'dev_2', deviceModel: 'iPhone 15', platform: 'IOS', isActive: true },
      ]);
      mockPrisma.userDevice.findFirst.mockResolvedValue({ id: 'dev_2', userId: 'u1' });

      const devices = await service.listDevices('u1');
      expect(devices).toHaveLength(2);

      const revokeRes = await service.revokeDevice('u1', 'dev_2');
      expect(revokeRes.success).toBe(true);
      expect(mockPrisma.userDevice.update).toHaveBeenCalledWith({
        where: { id: 'dev_2' },
        data: { isActive: false },
      });
    });
  });
});
