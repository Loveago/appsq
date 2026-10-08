import { Controller, Post, Get, Body, UseGuards, Headers } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook/revenuecat')
  async revenueCatWebhook(
    @Body() payload: any,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.billingService.handleRevenueCatWebhook(payload, authHeader);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return this.billingService.getBillingStatus(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('entitlements')
  async getEntitlements(@CurrentUser('id') userId: string) {
    return this.billingService.getUserEntitlements(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('trial')
  async startTrial(@CurrentUser('id') userId: string) {
    return this.billingService.startFreeTrial(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  async upgradeToPro(@CurrentUser('id') userId: string) {
    return this.billingService.setTier(userId, 'PRO');
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify')
  async verifySubscription(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      provider?: 'IN_APP' | 'REVENUECAT' | 'STRIPE' | 'PLAY_STORE' | 'APP_STORE';
      providerSubscriptionId?: string;
      paymentRef?: string;
      plan?: 'PRO' | 'TRIAL';
      durationDays?: number;
      expiresAt?: string;
      metadata?: any;
    },
  ) {
    return this.billingService.activateSubscription({
      userId,
      plan: body.plan || 'PRO',
      provider: body.provider || 'IN_APP',
      providerSubscriptionId: body.providerSubscriptionId,
      paymentRef: body.paymentRef,
      durationDays: body.durationDays,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      source: 'PAYMENT_VERIFICATION',
      metadata: body.metadata,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      provider?: 'IN_APP' | 'REVENUECAT' | 'STRIPE' | 'PLAY_STORE' | 'APP_STORE';
      providerSubscriptionId?: string;
      paymentRef?: string;
      plan?: 'PRO' | 'TRIAL';
      durationDays?: number;
      expiresAt?: string;
      metadata?: any;
    },
  ) {
    return this.billingService.activateSubscription({
      userId,
      plan: body.plan || 'PRO',
      provider: body.provider || 'IN_APP',
      providerSubscriptionId: body.providerSubscriptionId,
      paymentRef: body.paymentRef,
      durationDays: body.durationDays,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      source: 'PAYMENT_VERIFICATION',
      metadata: body.metadata,
    });
  }
}
