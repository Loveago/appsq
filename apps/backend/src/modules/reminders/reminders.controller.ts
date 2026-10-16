import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { RemindersService, CreateReminderDto } from './reminders.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';
import { ConfigService } from '@nestjs/config';

@UseGuards(OptionalJwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(
    private readonly remindersService: RemindersService,
    private readonly aiService: AiService,
    private readonly configService: ConfigService,
  ) {}

  private async resolveUserId(userId?: string): Promise<string> {
    return userId || (await this.aiService.getOrCreateDefaultGuestId());
  }

  @Get()
  async getReminders(
    @CurrentUser('id') userId?: string,
    @Query('tab') tab?: 'all' | 'upcoming' | 'overdue' | 'completed',
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.getReminders(effectiveUserId, {
      tab,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 30,
    });
  }

  @Post()
  async createReminder(
    @CurrentUser('id') userId: string | undefined,
    @Body() dto: CreateReminderDto,
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.createReminder(effectiveUserId, dto);
  }

  @Post('ai-parse')
  async aiParseReminder(
    @Body('prompt') prompt: string,
    @Body('timezone') timezone?: string,
  ) {
    return this.remindersService.aiParseReminder(prompt, timezone);
  }

  @Get(':id')
  async getReminder(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.getReminder(effectiveUserId, id);
  }

  @Put(':id')
  async updateReminder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @Body() dto: Partial<CreateReminderDto>,
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.updateReminder(effectiveUserId, id, dto);
  }

  @Post(':id/complete')
  async completeReminder(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.completeReminder(effectiveUserId, id);
  }

  @Post(':id/snooze')
  async snoozeReminder(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @Body('minutes') minutes?: number,
  ) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.snoozeReminder(effectiveUserId, id, minutes || 15);
  }

  @Delete(':id')
  async deleteReminder(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = await this.resolveUserId(userId);
    return this.remindersService.deleteReminder(effectiveUserId, id);
  }

  /**
   * Durable scheduler tick endpoint for Vercel Cron or external triggers
   * Supports both GET (Vercel standard) and POST (webhooks / manual triggers)
   */
  @Get('scheduler/tick')
  @Post('scheduler/tick')
  async triggerSchedulerTick(
    @Headers('x-scheduler-secret') secretHeader?: string,
    @Headers('authorization') authHeader?: string,
    @CurrentUser('role') role?: string,
  ) {
    const expectedSecret = this.configService.get<string>('SCHEDULER_SECRET') ||
      this.configService.get<string>('CRON_SECRET') ||
      'mindora_scheduler_secret_2026';
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const isAuthorized =
      secretHeader === expectedSecret ||
      bearerToken === expectedSecret ||
      role === 'ADMIN' ||
      role === 'SUPERADMIN';

    if (!isAuthorized) {
      throw new UnauthorizedException('Invalid scheduler secret token');
    }

    return this.remindersService.processDueReminders();
  }
}
