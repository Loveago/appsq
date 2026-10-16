import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  async findAll(@CurrentUser('id') userId?: string, @Query('status') status?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.tasksService.findAll(effectiveUserId, status);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string | undefined,
    @Body()
    body: {
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      dueDate?: string;
      dueTimeStr?: string;
      noteId?: string;
      projectId?: string;
      isAiExtracted?: boolean;
    },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.tasksService.create(effectiveUserId, body);
  }

  @Put(':id/toggle')
  async toggleStatus(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.tasksService.toggleStatus(id, effectiveUserId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.tasksService.delete(id, effectiveUserId);
  }
}
