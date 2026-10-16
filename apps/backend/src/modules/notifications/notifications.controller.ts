import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly aiService: AiService,
  ) {}

  private async resolveUserId(userId?: string): Promise<string> {
    return userId || (await this.aiService.getOrCreateDefaultGuestId());
  }

  @Get()
  async getNotifications(
    @CurrentUser('id') userId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('category') category?: string,
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.notificationsService.getUserNotifications(effectiveUserId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      unreadOnly: unreadOnly === 'true',
      category,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    const count = await this.notificationsService.getUnreadCount(effectiveUserId);
    return { unreadCount: count };
  }

  @Patch(':id/read')
  async markAsRead(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    await this.notificationsService.markAsRead(effectiveUserId, id);
    return { success: true };
  }

  @Post('read-all')
  async markAllAsRead(@CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    await this.notificationsService.markAllAsRead(effectiveUserId);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    await this.notificationsService.deleteNotification(effectiveUserId, id);
    return { success: true };
  }

  @Get('preferences')
  async getPreferences(@CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.notificationsService.getPreferences(effectiveUserId);
  }

  @Put('preferences')
  async updatePreferences(@CurrentUser('id') userId: string | undefined, @Body() body: any) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.notificationsService.updatePreferences(effectiveUserId, body);
  }

  @Post('devices')
  async registerDevice(
    @CurrentUser('id') userId: string | undefined,
    @Body() body: { token: string; platform: string; deviceModel?: string; appVersion?: string },
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.notificationsService.registerDevice(effectiveUserId, body);
  }

  @Delete('devices/:token')
  async unregisterDevice(@Param('token') token: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    await this.notificationsService.unregisterDevice(effectiveUserId, token);
    return { success: true };
  }
}
