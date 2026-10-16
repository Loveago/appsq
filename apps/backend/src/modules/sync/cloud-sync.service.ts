import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SyncPullDto, SyncPushDto, validateNoMediaFields } from './dto/cloud-sync.dto';

export interface RetentionConfig {
  disabledSyncRetentionDays: number;
  proExpiredGraceDays: number;
  proExpiredRecoveryDays: number;
  tombstoneRetentionDays: number;
  maxNoteSizeKb: number;
  defaultQuotaMb: number;
  globalSyncEnabled: boolean;
}

export const DEFAULT_RETENTION_CONFIG: RetentionConfig = {
  disabledSyncRetentionDays: 90,
  proExpiredGraceDays: 30,
  proExpiredRecoveryDays: 60,
  tombstoneRetentionDays: 30,
  maxNoteSizeKb: 512, // 500 KB limit per note
  defaultQuotaMb: 25, // 25 MB default text quota for Pro
  globalSyncEnabled: true,
};

@Injectable()
export class CloudSyncService {
  private readonly logger = new Logger(CloudSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the dynamic system retention and cloud sync configuration
   */
  async getRetentionConfig(): Promise<RetentionConfig> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: 'cloud_sync_retention_config' },
      });
      if (setting && setting.value) {
        return { ...DEFAULT_RETENTION_CONFIG, ...(setting.value as any) };
      }
    } catch (err: any) {
      this.logger.warn(`Could not load retention config: ${err.message}. Using defaults.`);
    }
    return DEFAULT_RETENTION_CONFIG;
  }

  /**
   * Updates the retention configuration dynamically from the admin panel
   */
  async updateRetentionConfig(config: Partial<RetentionConfig>, adminEmail: string): Promise<RetentionConfig> {
    const current = await this.getRetentionConfig();
    const updated: RetentionConfig = { ...current, ...config };

    await this.prisma.systemSetting.upsert({
      where: { key: 'cloud_sync_retention_config' },
      update: { value: updated as any },
      create: {
        key: 'cloud_sync_retention_config',
        value: updated as any,
        description: 'VyNotes Cloud Sync retention, quotas, and expiration rules',
      },
    });

    const admin = await this.prisma.user.findFirst({ where: { email: adminEmail } });
    if (admin) {
      await this.prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminEmail,
          action: 'UPDATE_CLOUD_SYNC_CONFIG',
          targetType: 'SETTING',
          targetId: 'cloud_sync_retention_config',
          details: updated as any,
        },
      });
    }

    return updated;
  }

  /**
   * Validates that the user has an active, verified Pro or Trial subscription.
   */
  async validateUserPro(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        plan: true,
        subscriptionExpiresAt: true,
        cloudSyncEnabled: true,
        cloudStorageBytes: true,
        cloudStorageQuotaBytes: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isPro =
      user.subscriptionTier === 'PRO' ||
      user.plan === 'PRO' ||
      user.plan === 'TRIAL';

    if (!isPro) {
      throw new ForbiddenException({
        code: 'PRO_REQUIRED',
        message: 'Automatic cloud sync is a Pro-only feature. Please upgrade to VyNotes Pro to synchronize notes across devices.',
      });
    }

    return user;
  }

  /**
   * Validates user account for general cloud synchronization.
   * Allows all authenticated accounts (5 MB standard text quota for Free, 25 MB for Pro).
   */
  async validateUserSyncAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        plan: true,
        subscriptionExpiresAt: true,
        cloudSyncEnabled: true,
        cloudStorageBytes: true,
        cloudStorageQuotaBytes: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const isPro =
      user.subscriptionTier === 'PRO' ||
      user.plan === 'PRO' ||
      user.plan === 'TRIAL';

    const defaultQuota = isPro ? 26214400 : 5242880; // 25 MB for Pro, 5 MB for Free
    const cloudStorageQuotaBytes = user.cloudStorageQuotaBytes || defaultQuota;

    return {
      ...user,
      isPro,
      cloudStorageQuotaBytes,
    };
  }

  /**
   * PULL: Returns incremental note changes and tombstones since lastSyncTimestamp
   */
  async pullChanges(userId: string, dto: SyncPullDto) {
    const user = await this.validateUserSyncAccess(userId);
    const config = await this.getRetentionConfig();

    if (!config.globalSyncEnabled) {
      throw new ForbiddenException({
        code: 'SYNC_DISABLED_GLOBALLY',
        message: 'Cloud sync is temporarily undergoing maintenance.',
      });
    }

    const sinceDate = dto.lastSyncTimestamp ? new Date(dto.lastSyncTimestamp) : new Date(0);
    const limit = Math.min(dto.limit || 200, 500);

    // Fetch notes updated since lastSyncTimestamp for this user
    const notes = await this.prisma.note.findMany({
      where: {
        userId,
        updatedAt: { gt: sinceDate },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit + 1,
      select: {
        id: true,
        title: true,
        content: true,
        isPinned: true,
        serverRevision: true,
        clientModifiedAt: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const hasMore = notes.length > limit;
    const resultNotes = hasMore ? notes.slice(0, limit) : notes;

    return {
      notes: resultNotes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        isPinned: n.isPinned,
        serverRevision: n.serverRevision,
        clientModifiedAt: n.clientModifiedAt?.toISOString() || n.updatedAt.toISOString(),
        isDeleted: n.deletedAt !== null,
        deletedAt: n.deletedAt?.toISOString() || null,
        updatedAt: n.updatedAt.toISOString(),
      })),
      hasMore,
      serverTimestamp: new Date().toISOString(),
      cloudStorageBytes: user.cloudStorageBytes,
      cloudStorageQuotaBytes: user.cloudStorageQuotaBytes,
    };
  }

  /**
   * PUSH: Batches client creations, updates, and deletions with strict text-only validation
   */
  async pushChanges(userId: string, dto: SyncPushDto) {
    const user = await this.validateUserSyncAccess(userId);
    const config = await this.getRetentionConfig();

    if (!config.globalSyncEnabled) {
      throw new ForbiddenException({
        code: 'SYNC_DISABLED_GLOBALLY',
        message: 'Cloud sync is temporarily undergoing maintenance.',
      });
    }

    if (!dto.items || !Array.isArray(dto.items)) {
      throw new BadRequestException('Sync payload must contain an items array.');
    }

    // 1. Strict Server-Side Validation: Reject any media / attachment keys or oversized text
    const maxSizeBytes = (config.maxNoteSizeKb || 512) * 1024;
    let totalPayloadBytes = 0;

    for (const item of dto.items) {
      validateNoMediaFields(item);

      const contentLen = Buffer.byteLength(item.content || '', 'utf8');
      const titleLen = Buffer.byteLength(item.title || '', 'utf8');
      const noteBytes = contentLen + titleLen;

      if (noteBytes > maxSizeBytes) {
        throw new BadRequestException({
          code: 'NOTE_SIZE_EXCEEDED',
          message: `Note "${item.title || item.id}" exceeds the maximum text size of ${config.maxNoteSizeKb} KB.`,
        });
      }

      totalPayloadBytes += noteBytes;
    }

    // 2. Storage Quota Check
    const effectiveQuota = user.cloudStorageQuotaBytes || config.defaultQuotaMb * 1024 * 1024;
    if (user.cloudStorageBytes + totalPayloadBytes > effectiveQuota) {
      throw new BadRequestException({
        code: 'STORAGE_QUOTA_EXCEEDED',
        message: `Cloud storage limit of ${Math.round(effectiveQuota / (1024 * 1024))} MB reached. Please delete unnecessary notes or upgrade storage.`,
      });
    }

    const conflicts: any[] = [];
    let appliedCount = 0;

    // 3. Process items transactionally
    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const existing = await tx.note.findFirst({
          where: { id: item.id, userId },
        });

        // Case A: Deletion Tombstone
        if (item.isDeleted) {
          if (existing && !existing.deletedAt) {
            await tx.note.update({
              where: { id: item.id },
              data: {
                deletedAt: new Date(),
                serverRevision: { increment: 1 },
                clientModifiedAt: item.clientModifiedAt ? new Date(item.clientModifiedAt) : new Date(),
                updatedAt: new Date(),
              },
            });
            appliedCount++;
          }
          continue;
        }

        // Case B: Update existing note
        if (existing) {
          // Conflict Detection: If client revision is older than server revision AND content differs
          if (
            item.clientRevision !== undefined &&
            item.clientRevision < existing.serverRevision &&
            item.content !== existing.content
          ) {
            conflicts.push({
              noteId: item.id,
              clientRevision: item.clientRevision,
              serverRevision: existing.serverRevision,
              serverTitle: existing.title,
              serverContent: existing.content,
              serverUpdatedAt: existing.updatedAt.toISOString(),
            });
            continue;
          }

          // Safe update
          await tx.note.update({
            where: { id: item.id },
            data: {
              title: item.title,
              content: item.content,
              isPinned: item.isPinned !== undefined ? item.isPinned : existing.isPinned,
              serverRevision: { increment: 1 },
              clientModifiedAt: item.clientModifiedAt ? new Date(item.clientModifiedAt) : new Date(),
              deletedAt: null, // Undelete if resurrecting locally
              pendingExpirationAt: null,
              expirationReason: null,
              updatedAt: new Date(),
            },
          });
          appliedCount++;
        } else {
          // Case C: Create new note
          await tx.note.create({
            data: {
              id: item.id,
              userId,
              title: item.title,
              content: item.content,
              isPinned: item.isPinned ?? false,
              serverRevision: 1,
              version: 1,
              clientModifiedAt: item.clientModifiedAt ? new Date(item.clientModifiedAt) : new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
          appliedCount++;
        }
      }
    });

    // 4. Update Device lastSyncAt if deviceToken provided
    if (dto.deviceToken) {
      await this.prisma.userDevice
        .updateMany({
          where: { userId, token: dto.deviceToken },
          data: { lastSyncAt: new Date(), lastSeenAt: new Date() },
        })
        .catch(() => null);
    }

    // 5. Recalculate stored text bytes
    const totalBytes = await this.recalculateStorageBytes(userId);

    return {
      success: true,
      appliedCount,
      conflicts,
      cloudStorageBytes: totalBytes,
      serverTimestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculates actual stored text bytes for a user's active cloud notes
   */
  async recalculateStorageBytes(userId: string): Promise<number> {
    const activeNotes = await this.prisma.note.findMany({
      where: { userId, deletedAt: null },
      select: { title: true, content: true },
    });

    let total = 0;
    for (const n of activeNotes) {
      total += Buffer.byteLength(n.title || '', 'utf8') + Buffer.byteLength(n.content || '', 'utf8');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { cloudStorageBytes: total },
    });

    return total;
  }

  /**
   * Gets current cloud sync status, storage usage, retention, and expiration state
   */
  async getStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        plan: true,
        cloudSyncEnabled: true,
        cloudSyncDisabledAt: true,
        cloudStorageBytes: true,
        cloudStorageQuotaBytes: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPro =
      user.subscriptionTier === 'PRO' ||
      user.plan === 'PRO' ||
      user.plan === 'TRIAL';

    let activeCount = 0;
    try {
      activeCount = await this.prisma.note.count({
        where: { userId, deletedAt: null },
      });
    } catch {
      activeCount = 0;
    }

    let pendingExpirationCount = 0;
    try {
      pendingExpirationCount = await this.prisma.note.count({
        where: { userId, pendingExpirationAt: { not: null } },
      });
    } catch {
      pendingExpirationCount = 0;
    }

    const config = await this.getRetentionConfig();
    const effectiveQuota = user.cloudStorageQuotaBytes || (isPro ? config.defaultQuotaMb * 1024 * 1024 : 5 * 1024 * 1024);

    return {
      isPro,
      cloudSyncEnabled: user.cloudSyncEnabled,
      cloudSyncDisabledAt: user.cloudSyncDisabledAt?.toISOString() || null,
      cloudStorageBytes: user.cloudStorageBytes || 0,
      cloudStorageQuotaBytes: effectiveQuota,
      activeNotesCount: activeCount,
      pendingExpirationCount,
      retentionConfig: {
        disabledSyncRetentionDays: config.disabledSyncRetentionDays,
        proExpiredGraceDays: config.proExpiredGraceDays,
        proExpiredRecoveryDays: config.proExpiredRecoveryDays,
        totalRecoveryWindowDays: config.proExpiredGraceDays + config.proExpiredRecoveryDays,
        maxNoteSizeKb: config.maxNoteSizeKb,
      },
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() || null,
    };
  }

  /**
   * Turns cloud sync ON for an authenticated user
   */
  async enableSync(userId: string) {
    await this.validateUserSyncAccess(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        cloudSyncEnabled: true,
        cloudSyncDisabledAt: null,
      },
    });

    // Cancel any pending expiration on cloud notes
    try {
      await this.prisma.note.updateMany({
        where: { userId, pendingExpirationAt: { not: null } },
        data: {
          pendingExpirationAt: null,
          expirationReason: null,
        },
      });
    } catch {}

    return {
      success: true,
      cloudSyncEnabled: true,
      message: 'Cloud sync enabled.',
    };
  }

  /**
   * Turns cloud sync OFF.
   * Starts the 90-day retention countdown on server copies.
   * NEVER deletes local notes!
   */
  async disableSync(userId: string) {
    const config = await this.getRetentionConfig();
    const disabledAt = new Date();
    const retentionDeadline = new Date(
      disabledAt.getTime() + config.disabledSyncRetentionDays * 24 * 60 * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        cloudSyncEnabled: false,
        cloudSyncDisabledAt: disabledAt,
      },
    });

    // Mark existing cloud notes with pending expiration
    await this.prisma.note.updateMany({
      where: { userId, deletedAt: null },
      data: {
        pendingExpirationAt: retentionDeadline,
        expirationReason: 'SYNC_DISABLED',
      },
    });

    return {
      success: true,
      cloudSyncEnabled: false,
      retentionDeadline: retentionDeadline.toISOString(),
      daysUntilExpiration: config.disabledSyncRetentionDays,
      message: `Cloud sync disabled. Your existing cloud notes will be preserved for ${config.disabledSyncRetentionDays} days before expiration. Local notes on your device are never deleted.`,
    };
  }

  /**
   * Separate explicit action: Permanently deletes all cloud notes and tombstones for user
   */
  async deleteCloudData(userId: string) {
    const noteCount = await this.prisma.note.count({ where: { userId } });

    await this.prisma.$transaction([
      this.prisma.note.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          cloudStorageBytes: 0,
          cloudSyncEnabled: false,
          cloudSyncDisabledAt: new Date(),
        },
      }),
    ]);

    this.logger.log(`User ${userId} deleted all cloud note records (${noteCount} notes).`);

    return {
      success: true,
      deletedCount: noteCount,
      message: 'All cloud copies and synchronization metadata permanently deleted from servers. Local notes on your device remain untouched.',
    };
  }

  /**
   * Lists devices and active sessions for the user
   */
  async listDevices(userId: string) {
    return this.prisma.userDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
      select: {
        id: true,
        deviceModel: true,
        deviceName: true,
        platform: true,
        appVersion: true,
        isActive: true,
        lastSeenAt: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });
  }

  /**
   * Revokes a specific device session
   */
  async revokeDevice(userId: string, deviceId: string) {
    const device = await this.prisma.userDevice.findFirst({
      where: { id: deviceId, userId },
    });
    if (!device) {
      throw new NotFoundException('Device not found or unauthorized');
    }

    await this.prisma.userDevice.update({
      where: { id: deviceId },
      data: { isActive: false },
    });

    return {
      success: true,
      message: 'Device session revoked. The remote device will no longer be permitted to synchronize with cloud servers.',
    };
  }

  /**
   * Scheduled or Admin-Triggered Retention Cleanup Job
   * Batched, idempotent, privacy-safe. Never logs note content.
   */
  async cleanupExpiredCloudNotes(dryRun = false, adminEmail?: string) {
    const startTime = Date.now();
    const config = await this.getRetentionConfig();
    const now = new Date();

    // 1. Candidate A: Tombstones older than tombstoneRetentionDays (default 30 days)
    const tombstoneCutoff = new Date(now.getTime() - config.tombstoneRetentionDays * 24 * 60 * 60 * 1000);
    const expiredTombstonesCount = await this.prisma.note.count({
      where: {
        deletedAt: { lt: tombstoneCutoff },
      },
    });

    // 2. Candidate B: Notes marked pendingExpirationAt whose deadline has passed
    const expiredPendingNotes = await this.prisma.note.findMany({
      where: {
        pendingExpirationAt: { lt: now },
      },
      select: { id: true, userId: true, title: true, content: true },
      take: 1000,
    });

    // 3. Candidate C: Pro expired notes beyond total grace + recovery period (e.g. 30 + 60 = 90 days)
    const totalRecoveryMs = (config.proExpiredGraceDays + config.proExpiredRecoveryDays) * 24 * 60 * 60 * 1000;
    const proExpiredCutoff = new Date(now.getTime() - totalRecoveryMs);

    const proExpiredUsers = await this.prisma.user.findMany({
      where: {
        subscriptionTier: 'FREE',
        plan: { in: ['EXPIRED', 'CANCELLED'] },
        subscriptionExpiresAt: { lt: proExpiredCutoff },
      },
      select: { id: true },
    });

    const proExpiredUserIds = proExpiredUsers.map((u) => u.id);
    const proExpiredNotesCount = await this.prisma.note.count({
      where: {
        userId: { in: proExpiredUserIds },
        deletedAt: null,
      },
    });

    const totalEligibleCount = expiredTombstonesCount + expiredPendingNotes.length + proExpiredNotesCount;

    if (dryRun) {
      return {
        dryRun: true,
        totalEligibleCount,
        expiredTombstonesCount,
        expiredPendingNotesCount: expiredPendingNotes.length,
        proExpiredNotesCount,
        executionTimeMs: Date.now() - startTime,
        message: `Dry-run completed. Found ${totalEligibleCount} records eligible for permanent cleanup. No data was deleted.`,
      };
    }

    // Execute Batched Cleanup in Transactions
    let deletedCount = 0;

    // Delete tombstones
    if (expiredTombstonesCount > 0) {
      const res = await this.prisma.note.deleteMany({
        where: { deletedAt: { lt: tombstoneCutoff } },
      });
      deletedCount += res.count;
    }

    // Delete pending expiration notes
    if (expiredPendingNotes.length > 0) {
      const ids = expiredPendingNotes.map((n) => n.id);
      const res = await this.prisma.note.deleteMany({
        where: { id: { in: ids } },
      });
      deletedCount += res.count;
    }

    // Delete notes of expired Pro accounts past 90 days
    if (proExpiredUserIds.length > 0) {
      const res = await this.prisma.note.deleteMany({
        where: { userId: { in: proExpiredUserIds } },
      });
      deletedCount += res.count;
    }

    const executionTimeMs = Date.now() - startTime;

    // Record privacy-safe audit record
    if (adminEmail) {
      const admin = await this.prisma.user.findFirst({ where: { email: adminEmail } });
      if (admin) {
        await this.prisma.auditLog.create({
          data: {
            adminId: admin.id,
            adminEmail,
            action: 'EXECUTE_CLOUD_RETENTION_CLEANUP',
            targetType: 'SYSTEM',
            details: {
              deletedCount,
              tombstonesDeleted: expiredTombstonesCount,
              expiredNotesDeleted: expiredPendingNotes.length + proExpiredNotesCount,
              executionTimeMs,
            },
          },
        });
      }
    }

    this.logger.log(`Retention cleanup job completed. Permanently removed ${deletedCount} records in ${executionTimeMs}ms.`);

    return {
      dryRun: false,
      deletedCount,
      executionTimeMs,
      message: `Retention cleanup successfully purged ${deletedCount} expired cloud records.`,
    };
  }
}
