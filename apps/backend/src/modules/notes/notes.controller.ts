import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string, @Query('category') category?: string) {
    return this.notesService.findAll(userId, category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notesService.findOne(id, userId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: { id?: string; title?: string; content: string; projectId?: string },
  ) {
    return this.notesService.create(userId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { title?: string; content?: string; isPinned?: boolean; version?: number },
  ) {
    return this.notesService.update(id, userId, body);
  }

  @Put(':id/pin')
  async togglePin(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notesService.togglePin(id, userId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notesService.delete(id, userId);
  }
}
