import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly aiService: AiService,
  ) {}

  @Get()
  async findAll(@CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.findAll(effectiveUserId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.findOne(id, effectiveUserId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string | undefined,
    @Body()
    body: {
      id?: string;
      title?: string;
      durationSec?: number;
      transcript: string;
      audioUrl?: string;
      summary?: string;
      decisions?: any[];
      actionItems?: any[];
      keyPoints?: any[];
      openQuestions?: any[];
      participants?: any[];
      speakers?: any[];
      segments?: any[];
    },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.create(effectiveUserId, body);
  }

  @Patch(':id/speakers')
  async updateSpeakers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @Body()
    body: {
      speakerKey?: string;
      newName?: string;
      mergeSpeakerKey?: string;
      intoSpeakerKey?: string;
    },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.updateSpeakers(id, effectiveUserId, body);
  }

  @Post(':id/ask')
  async askQuestion(
    @Param('id') id: string,
    @CurrentUser('id') userId: string | undefined,
    @Body('question') question: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.askQuestion(id, effectiveUserId, question);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.meetingsService.delete(id, effectiveUserId);
  }
}
