import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Post('extract')
  async extractContext(
    @Body('content') content: string,
    @CurrentUser('id') userId?: string,
    @CurrentUser('subscriptionTier') tier?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.extractContext(content, effectiveUserId, tier === 'PRO');
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('summarize')
  async summarizeNote(
    @Body('content') content: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return { summary: await this.aiService.summarizeNote(content, effectiveUserId) };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('rewrite')
  async rewriteNote(
    @Body('content') content: string,
    @Body('style') style: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return { result: await this.aiService.rewriteNote(content, style || 'professional', effectiveUserId) };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('distill-meeting')
  async distillMeeting(
    @Body('transcript') transcript: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.distillMeeting(transcript, effectiveUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('briefing')
  async generateDailyBriefing(@CurrentUser('id') userId?: string) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.generateDailyBriefing(effectiveUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('ask')
  async askNotes(
    @Body('query') query: string,
    @Body('notes') notes: Array<{ id: string; title: string; content: string }>,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.askNotes(query, notes, effectiveUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('search')
  async searchNotes(
    @Query('query') query: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.semanticSearch(query, effectiveUserId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  async transcribeAudio(
    @UploadedFile() file: Express.Multer.File,
    @Body('transcript') transcript: string,
    @Body('audioUrl') audioUrl: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.transcribeAudio(transcript, effectiveUserId, file?.buffer, audioUrl);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('transcription/session')
  async createTranscriptionSession(
    @Body('voiceNoteId') voiceNoteId?: string,
    @Body('meetingId') meetingId?: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.createTranscriptionSession(effectiveUserId, voiceNoteId, meetingId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('transcription/finalize')
  async finalizeTranscriptionSession(
    @Body()
    body: {
      sessionId: string;
      durationSec: number;
      transcript?: string;
      voiceNoteId?: string;
      meetingId?: string;
      speakers?: any[];
      segments?: any[];
      audioUrl?: string;
    },
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.finalizeTranscriptionSession(effectiveUserId, body);
  }

  // ==========================================
  // AI CHAT & TOOL EXECUTION CONVERSATIONS
  // ==========================================

  @UseGuards(OptionalJwtAuthGuard)
  @Post('chat')
  async chatWithAssistant(
    @Body('message') message: string,
    @Body('conversationId') conversationId: string,
    @CurrentUser('id') userId?: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.aiService.chatWithTools(effectiveUserId, message, conversationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  async getConversations(@CurrentUser('id') userId: string) {
    return this.aiService.getConversations(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id')
  async getConversation(
    @Param('id') paramId: string,
    @Query('id') queryId: string,
    @CurrentUser('id') userId: string,
  ) {
    const id = paramId || queryId;
    return this.aiService.getConversation(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('conversations/:id')
  async deleteConversation(
    @Param('id') paramId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.deleteConversation(paramId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('conversations/:id/delete')
  async deleteConversationLegacy(
    @Param('id') paramId: string,
    @Query('id') queryId: string,
    @CurrentUser('id') userId: string,
  ) {
    const id = paramId || queryId;
    return this.aiService.deleteConversation(id, userId);
  }
}
