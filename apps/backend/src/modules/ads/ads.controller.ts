import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AdMobConfig } from './interfaces/ad-config.interface';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * Public Mobile Client Endpoint
   * Returns authoritative banner ad settings, placement IDs, and eligibility (FREE tier only).
   */
  @Get('public-config')
  async getPublicConfig(@Query('platform') platform?: string) {
    return this.adsService.getPublicConfig(platform);
  }
}

@Controller('admin/ads')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAdsController {
  constructor(private readonly adsService: AdsService) {}

  /**
   * Get draft, published, history, and validation report
   */
  @Get('config')
  async getConfig() {
    return this.adsService.getAdminConfig();
  }

  /**
   * Update draft configuration
   */
  @Put('config')
  async updateDraft(@Req() req: any, @Body() body: Partial<AdMobConfig>) {
    return this.adsService.saveDraft(req.user, body);
  }

  /**
   * Publish draft to production/testing
   */
  @Post('publish')
  async publishConfig(@Req() req: any, @Body('reason') reason?: string) {
    return this.adsService.publish(req.user, reason);
  }

  /**
   * Rollback to previous published version
   */
  @Post('revert')
  async revertConfig(@Req() req: any, @Body('targetVersion') targetVersion?: number) {
    return this.adsService.revert(req.user, targetVersion);
  }
}
