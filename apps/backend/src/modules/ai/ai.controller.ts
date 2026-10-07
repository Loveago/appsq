import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(JwtAuthGuard)
  @Post('extract')
  async extractContext(
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('subscriptionTier') tier: string,
  ) {
    return this.aiService.extractContext(content, userId, tier === 'PRO');
  }

  @UseGuards(JwtAuthGuard)
  @Post('summarize')
  async summarizeNote(
    @Body('content') content: string,
    @CurrentUser('id') userId: string,
  ) {
    return { summary: await this.aiService.summarizeNote(content, userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rewrite')
  async rewriteNote(
    @Body('content') content: string,
    @Body('style') style: string,
    @CurrentUser('id') userId: string,
  ) {
    return { result: await this.aiService.rewriteNote(content, style || 'professional', userId) };
  }

  @UseGuards(JwtAuthGuard)
  @Post('distill-meeting')
  async distillMeeting(
    @Body('transcript') transcript: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.distillMeeting(transcript, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('briefing')
  async generateDailyBriefing(@CurrentUser('id') userId: string) {
    return this.aiService.generateDailyBriefing(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ask')
  async askNotes(
    @Body('query') query: string,
    @Body('notes') notes: Array<{ id: string; title: string; content: string }>,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.askNotes(query, notes, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchNotes(
    @Query('query') query: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.semanticSearch(query, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('transcribe')
  async transcribeAudio(
    @Body('transcript') transcript: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.transcribeAudio(transcript, userId);
  }
}
