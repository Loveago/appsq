import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Get()
  async findAll(@CurrentUser('id') userId: string) {
    return this.meetingsService.findAll(userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.meetingsService.findOne(id, userId);
  }

  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      title?: string;
      durationSec?: number;
      transcript: string;
      audioUrl?: string;
      speakers?: any[];
      segments?: any[];
    },
  ) {
    return this.meetingsService.create(userId, body);
  }

  @Patch(':id/speakers')
  async updateSpeakers(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      speakerKey?: string;
      newName?: string;
      mergeSpeakerKey?: string;
      intoSpeakerKey?: string;
    },
  ) {
    return this.meetingsService.updateSpeakers(id, userId, body);
  }

  @Post(':id/ask')
  async askQuestion(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('question') question: string,
  ) {
    return this.meetingsService.askQuestion(id, userId, question);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.meetingsService.delete(id, userId);
  }
}
