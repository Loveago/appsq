import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { NotesService } from './notes.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('notes')
export class NotesController {
  constructor(
    private readonly notesService: NotesService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  async findAll(@CurrentUser('id') userId?: string, @Query('category') category?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.findAll(effectiveUserId, category);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.findOne(id, effectiveUserId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string | undefined,
    @Body() body: { id?: string; title?: string; content: string; projectId?: string },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.create(effectiveUserId, body);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @Body() body: { title?: string; content?: string; isPinned?: boolean; version?: number },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.update(id, effectiveUserId, body);
  }

  @Put(':id/pin')
  async togglePin(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.togglePin(id, effectiveUserId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.notesService.delete(id, effectiveUserId);
  }
}

