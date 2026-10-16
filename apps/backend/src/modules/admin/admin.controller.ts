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
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../auth/email.service';

@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly billingService: BillingService,
    private readonly emailService: EmailService,
  ) {}

  // 1d. BREVO EMAIL & PASSWORD RESET CONFIGURATION
  @Get('email/config')
  async getEmailConfig() {
    const config = await this.emailService.getConfig();
    return {
      isEnabled: config.isEnabled,
      senderEmail: config.senderEmail,
      senderName: config.senderName,
      apiKeyMasked: config.apiKey ? `${config.apiKey.slice(0, 8)}...${config.apiKey.slice(-4)}` : '',
      isConfigured: !!(config.apiKey && config.senderEmail),
    };
  }

  @Put('email/config')
  async updateEmailConfig(@Req() req: any, @Body() body: any) {
    return this.emailService.updateConfig(req.user, body);
  }

  @Post('email/test')
  async sendTestEmail(@Body('to') toEmail: string) {
    const success = await this.emailService.sendEmail(
      toEmail || 'test@vynotes.ai',
      'VyNotes Brevo Test Email',
      '<h2>VyNotes Email Integration Test</h2><p>Your Brevo transactional email configuration is active and working properly.</p>',
    );
    return {
      success,
      message: success
        ? 'Test email dispatched successfully via Brevo'
        : 'Failed to send test email. Please check your Brevo API key and verified sender email.',
    };
  }

  // 1. DASHBOARD & SYSTEM OVERVIEW
  @Get('overview')
  async getOverview() {
    return this.adminService.getOverviewMetrics();
  }

  // 1b. PLANS & LIMITS MANAGEMENT
  @Get('plans/limits')
  async getPlanLimits() {
    return this.billingService.getEffectivePlanLimits();
  }

  @Put('plans/limits')
  async updatePlanLimits(@Req() req: any, @Body() body: any) {
    return this.billingService.updatePlanLimitsConfig(req.user, body);
  }

  // 1c. REVENUECAT SUBSCRIPTIONS & BILLING CONFIGURATION
  @Get('billing/config')
  async getSubscriptionConfig() {
    return this.billingService.getAdminSubscriptionConfig();
  }

  @Put('billing/config')
  async updateSubscriptionConfig(@Req() req: any, @Body() body: any) {
    return this.billingService.updateAdminSubscriptionConfig(req.user, body);
  }

  @Post('billing/validate-revenuecat')
  async validateRevenueCatConnection(@Body('secretKey') secretKey?: string) {
    return this.billingService.validateRevenueCatConnection(secretKey);
  }

  @Get('billing/webhook-events')
  async getWebhookEvents(@Query('limit') limit?: string) {
    return this.billingService.getRecentWebhookEvents(limit ? parseInt(limit, 10) : 30);
  }

  @Post('billing/users/:id/override')
  async manualSubscriptionOverride(
    @Req() req: any,
    @Param('id') userId: string,
    @Body() body: { plan: 'PRO' | 'FREE' | 'TRIAL'; durationDays?: number; reason: string },
  ) {
    return this.billingService.manualSubscriptionOverride(req.user, userId, body);
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
    @Body()
    dto: {
      title: string;
      message: string;
      targetTier?: string;
      category?: string;
      priority?: string;
      channel?: string;
      actionUrl?: string;
      actionLabel?: string;
      scheduledFor?: string;
      expiresAt?: string;
      publishImmediately?: boolean;
    },
  ) {
    return this.adminService.createAnnouncement(req.user, dto);
  }

  @Post('announcements/:id/publish')
  async publishAnnouncement(@Req() req: any, @Param('id') id: string) {
    return this.adminService.publishAnnouncement(req.user, id);
  }

  @Post('announcements/:id/retract')
  async retractAnnouncement(@Req() req: any, @Param('id') id: string) {
    return this.adminService.retractAnnouncement(req.user, id);
  }

  @Get('announcements/:id/stats')
  async getAnnouncementStats(@Param('id') id: string) {
    return this.adminService.getAnnouncementStats(id);
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

  // 8. NOTES & CONTENT MODERATION
  @Get('notes')
  async listNotes(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listNotes(
      search,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 25,
    );
  }

  @Delete('notes/:id')
  async deleteNote(@Req() req: any, @Param('id') id: string) {
    return this.adminService.deleteNote(req.user, id);
  }
}
