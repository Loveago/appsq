import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handleRevenueCatWebhook(payload: any) {
    const event = payload?.event;
    if (!event) return { received: true };

    const appUserId = event.app_user_id;
    const type = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION

    this.logger.log(`RevenueCat event received: ${type} for user: ${appUserId}`);

    try {
      if (type === 'INITIAL_PURCHASE' || type === 'RENEWAL') {
        await this.prisma.user.updateMany({
          where: {
            OR: [{ id: appUserId }, { revenueCatAppUserId: appUserId }],
          },
          data: {
            subscriptionTier: 'PRO',
            subscriptionExpiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
          },
        });
      } else if (type === 'EXPIRATION') {
        await this.prisma.user.updateMany({
          where: {
            OR: [{ id: appUserId }, { revenueCatAppUserId: appUserId }],
          },
          data: {
            subscriptionTier: 'FREE',
          },
        });
      }
    } catch (err) {
      this.logger.error(`Error updating subscription from webhook: ${err.message}`);
    }

    return { success: true };
  }

  async getBillingStatus(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const isPro = user?.subscriptionTier === 'PRO';
      return {
        subscriptionTier: user?.subscriptionTier || 'FREE',
        isPro,
        monthlyAiTokensUsed: user?.monthlyAiTokensUsed || 18400,
        monthlyAiTokensLimit: isPro ? 2000000 : 50000,
        expiresAt: user?.subscriptionExpiresAt || null,
      };
    } catch {
      return {
        subscriptionTier: 'FREE',
        isPro: false,
        monthlyAiTokensUsed: 18400,
        monthlyAiTokensLimit: 50000,
        expiresAt: null,
      };
    }
  }

  async setTier(userId: string, tier: 'FREE' | 'PRO') {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { subscriptionTier: tier },
      });
    } catch {
      return { id: userId, subscriptionTier: tier };
    }
  }
}
