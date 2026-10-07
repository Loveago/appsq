import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @Query('status') status?: string) {
    return this.tasksService.findAll(userId, status);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
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
    return this.tasksService.create(userId, body);
  }

  @Put(':id/toggle')
  async toggleStatus(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.toggleStatus(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.tasksService.delete(id, userId);
  }
}
