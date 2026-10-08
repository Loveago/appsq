import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { VoiceNotesService } from './voice-notes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('voice-notes')
export class VoiceNotesController {
  constructor(private readonly voiceNotesService: VoiceNotesService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.voiceNotesService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.voiceNotesService.findOne(id, userId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() body: {
      id?: string;
      title?: string;
      audioUrl?: string;
      localPath?: string;
      durationSec?: number;
      transcript?: string;
      detectedTasks?: string[];
      detectedDue?: string;
    },
  ) {
    return this.voiceNotesService.create(userId, body);
  }

  @Post(':id/transcribe')
  async transcribe(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.voiceNotesService.transcribeVoiceNote(id, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: { title?: string },
  ) {
    return this.voiceNotesService.update(id, userId, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.voiceNotesService.delete(id, userId);
  }
}
