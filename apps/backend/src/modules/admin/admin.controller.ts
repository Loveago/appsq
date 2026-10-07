import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    return this.adminService.getOverviewMetrics();
  }

  @Get('users')
  async listUsers(@Query('search') search?: string) {
    return this.adminService.listUsers(search);
  }

  @Put('users/:id/tier')
  async overrideTier(
    @Param('id') userId: string,
    @Body('tier') tier: 'FREE' | 'PRO',
  ) {
    return this.adminService.overrideTier(userId, tier);
  }

  @Post('users/:id/reset-quota')
  async resetQuota(@Param('id') userId: string) {
    return this.adminService.resetQuota(userId);
  }
}
