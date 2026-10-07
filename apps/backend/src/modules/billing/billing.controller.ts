import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook/revenuecat')
  async revenueCatWebhook(@Body() payload: any) {
    return this.billingService.handleRevenueCatWebhook(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return this.billingService.getBillingStatus(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  async upgradeToPro(@CurrentUser('id') userId: string) {
    return this.billingService.setTier(userId, 'PRO');
  }
}
