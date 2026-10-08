import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // 1. DASHBOARD & SYSTEM OVERVIEW
  @Get('overview')
  async getOverview() {
    return this.adminService.getOverviewMetrics();
  }

  // 2. USER MANAGEMENT
  @Get('users')
  async listUsers(
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('plan') plan?: string,
    @Query('role') role?: string,
    @Query('accountStatus') accountStatus?: string,
    @Query('isSuspended') isSuspended?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listUsers({
      search,
      tier,
      plan,
      role,
      accountStatus,
      isSuspended: isSuspended !== undefined ? isSuspended === 'true' : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  @Get('users/:id')
  async getUserDetails(@Param('id') userId: string) {
    return this.adminService.getUserDetails(userId);
  }

  @Get('users/:id/usage')
  async getUserUsage(@Param('id') userId: string) {
    return this.adminService.getUserUsage(userId);
  }

  @Put('users/:id/plan')
  async overridePlan(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('plan') plan: 'FREE' | 'TRIAL' | 'PRO',
    @Body('durationDays') durationDays?: number,
  ) {
    return this.adminService.overridePlan(req.user, userId, plan, durationDays);
  }

  @Post('users/:id/extend-trial')
  async extendTrial(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('days') days: number,
  ) {
    return this.adminService.extendTrial(req.user, userId, Number(days) || 7);
  }

  @Put('users/:id/tier')
  async overrideTier(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('tier') tier: 'FREE' | 'PRO',
    @Body('durationDays') durationDays?: number,
  ) {
    return this.adminService.overrideTier(req.user, userId, tier, durationDays);
  }

  @Post('users/:id/suspend')
  async suspendUser(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.adminService.suspendUser(req.user, userId, reason);
  }

  @Post('users/:id/unsuspend')
  async unsuspendUser(@Req() req: any, @Param('id') userId: string) {
    return this.adminService.unsuspendUser(req.user, userId);
  }

  @Post('users/:id/reset-quota')
  async resetQuota(@Req() req: any, @Param('id') userId: string) {
    return this.adminService.resetQuota(req.user, userId);
  }

  @Put('users/:id/role')
  async updateUserRole(
    @Req() req: any,
    @Param('id') userId: string,
    @Body('role') role: 'USER' | 'ADMIN' | 'SUPERADMIN',
  ) {
    return this.adminService.updateUserRole(req.user, userId, role);
  }

  @Delete('users/:id')
  async deleteUser(@Req() req: any, @Param('id') userId: string) {
    return this.adminService.deleteUser(req.user, userId);
  }

  // 3. AI PROVIDERS & ROUTING
  @Get('ai/providers')
  async getAiProviders() {
    return this.adminService.getAiProviders();
  }

  @Post('ai/providers')
  async saveAiProvider(@Req() req: any, @Body() dto: any) {
    return this.adminService.createOrUpdateAiProvider(req.user, dto);
  }

  @Post('ai/providers/:id/test')
  async testAiProvider(@Param('id') providerId: string) {
    return this.adminService.testAiProvider(providerId);
  }

  @Delete('ai/providers/:id')
  async deleteAiProvider(@Req() req: any, @Param('id') providerId: string) {
    return this.adminService.deleteAiProvider(req.user, providerId);
  }

  @Post('ai/assemblyai/test')
  async testAssemblyAi(@Body('apiKey') apiKey?: string) {
    return this.adminService.testAssemblyAi(apiKey);
  }

  // 4. FEATURE FLAGS
  @Get('features')
  async getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Put('features/:key')
  async updateFeatureFlag(
    @Req() req: any,
    @Param('key') key: string,
    @Body() dto: { isEnabled?: boolean; isProOnly?: boolean; rolloutPct?: number },
  ) {
    return this.adminService.updateFeatureFlag(req.user, key, dto);
  }

  // 5. SYSTEM SETTINGS & AD CONTROLS
  @Get('settings')
  async getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  async updateSetting(
    @Req() req: any,
    @Param('key') key: string,
    @Body('value') value: any,
    @Body('description') description?: string,
  ) {
    return this.adminService.updateSetting(req.user, key, value, description);
  }

  // 6. ANNOUNCEMENTS
  @Get('announcements')
  async listAnnouncements() {
    return this.adminService.listAnnouncements();
  }

  @Post('announcements')
  async createAnnouncement(
    @Req() req: any,
    @Body() dto: {
      title: string;
      message: string;
      targetTier?: string;
      actionUrl?: string;
      actionLabel?: string;
      expiresAt?: string;
    },
  ) {
    return this.adminService.createAnnouncement(req.user, dto);
  }

  @Delete('announcements/:id')
  async deleteAnnouncement(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteAnnouncement(req.user, id);
  }

  // 7. AUDIT LOGS & HEALTH ERRORS
  @Get('audit')
  async getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAuditLogs(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('system/errors')
  async getErrorLogs(@Query('limit') limit?: string) {
    return this.adminService.getErrorLogs(limit ? parseInt(limit, 10) : 50);
  }
}
