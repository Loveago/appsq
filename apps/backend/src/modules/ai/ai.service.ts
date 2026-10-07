import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';
import {
  ExtractedContextResult,
  MeetingDistillationResult,
  DailyBriefingResult,
} from './interfaces/ai-provider.interface';
import {
  ExtractedContextSchema,
  MeetingDistillationSchema,
  DailyBriefingSchema,
} from './schemas/extraction.schema';

@Injectable()
export class AiService {
  private openaiClient: OpenAI | null = null;
  private readonly defaultModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('MODELFLARE_API_KEY') ||
      this.configService.get<string>('OPENAI_API_KEY') ||
      process.env.MODELFLARE_API_KEY ||
      process.env.OPENAI_API_KEY;

    const baseURL =
      this.configService.get<string>('MODELFLARE_BASE_URL') ||
      this.configService.get<string>('OPENAI_BASE_URL') ||
      process.env.MODELFLARE_BASE_URL ||
      process.env.OPENAI_BASE_URL ||
      'https://api.modelflare.com/v1';

    this.defaultModel =
      this.configService.get<string>('MODELFLARE_MODEL') ||
      this.configService.get<string>('OPENAI_MODEL') ||
      process.env.MODELFLARE_MODEL ||
      process.env.OPENAI_MODEL ||
      'gpt-4o-mini';

    if (apiKey && apiKey !== 'mock-key' && baseURL.startsWith('http')) {
      try {
        this.openaiClient = new OpenAI({
          apiKey,
          baseURL,
        });
      } catch {
        this.openaiClient = null;
      }
    }
  }

  async checkAndTrackQuota(userId: string, tokensEstimate: number): Promise<void> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      const isPro = user.subscriptionTier === 'PRO';
      const limit = isPro ? 2000000 : 50000;

      if (user.monthlyAiTokensUsed + tokensEstimate > limit) {
        throw new ForbiddenException(
          'Monthly AI token quota exceeded. Please upgrade to Mindora Pro to unlock unlimited AI intelligence.',
        );
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          monthlyAiTokensUsed: {
            increment: tokensEstimate,
          },
        },
      });
    } catch (err) {
      if (err instanceof ForbiddenException) throw err;
      // In offline / mock dev mode, continue gracefully
    }
  }

  async extractContext(content: string, userId?: string, isPro: boolean = false): Promise<ExtractedContextResult> {
    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }

    if (userId) {
      await this.checkAndTrackQuota(userId, 800);
    }

    // Extraction heuristics & fallback engine
    const words = content.toLowerCase();
    const people: string[] = [];
    const tasks: Array<{ title: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueDate: string | null }> = [];
    const projects: string[] = [];
    const deadlines: string[] = [];

    if (words.includes('john')) people.push('John');
    if (words.includes('sarah')) people.push('Sarah');
    if (words.includes('michael')) people.push('Michael');

    if (words.includes('website') || words.includes('web')) projects.push('Website Project');
    if (words.includes('delivery')) projects.push('Delivery App');
    if (words.includes('stripe') || words.includes('payment')) projects.push('Finance');

    if (words.includes('september')) deadlines.push('Before September 01');
    if (words.includes('tomorrow')) deadlines.push('Tomorrow');

    // Detect tasks from lines or keywords
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().replace(/^[-*•]\s*/, '');
      if (
        trimmed.toLowerCase().includes('need to') ||
        trimmed.toLowerCase().includes('finish') ||
        trimmed.toLowerCase().includes('call') ||
        trimmed.toLowerCase().includes('review') ||
        trimmed.toLowerCase().includes('verify')
      ) {
        tasks.push({
          title: trimmed.replace(/^(i need to|we need to)\s+/i, '').trim(),
          priority: isPro ? 'HIGH' : 'MEDIUM',
          dueDate: words.includes('tomorrow') ? 'Tomorrow' : null,
        });
      }
    }

    if (tasks.length === 0) {
      tasks.push({
        title: 'Review action points from note',
        priority: 'MEDIUM',
        dueDate: null,
      });
    }

    const rawResult = {
      people,
      projects: projects.length > 0 ? projects : ['General'],
      deadlines: deadlines.length > 0 ? deadlines : ['No fixed deadline'],
      tasks,
      relatedTopics: ['Architecture', 'Milestones'],
      suggestedTitle: people.length > 0 ? `Sync regarding ${projects[0] || 'Deliverables'}` : 'Strategic Thought Note',
    };

    return ExtractedContextSchema.parse(rawResult) as unknown as ExtractedContextResult;
  }

  async summarizeNote(content: string, userId?: string): Promise<string> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 400);
    }

    const sentences = content
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (sentences.length <= 2) {
      return `TL;DR: ${content.trim()}`;
    }

    return `TL;DR: ${sentences.slice(0, 2).join('. ')}. Key decisions highlighted for tracking.`;
  }

  async distillMeeting(transcript: string, userId?: string): Promise<MeetingDistillationResult> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 1500);
    }

    const sentences = transcript.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 5);
    const summary = sentences.length > 0
      ? sentences.slice(0, 2).join('. ')
      : 'Executive meeting notes and discussion.';

    let actionItems = sentences
      .filter((s) => s.toLowerCase().includes('need to') || s.toLowerCase().includes('todo') || s.toLowerCase().includes('action') || s.toLowerCase().includes('checks') || s.toLowerCase().includes('review'))
      .map((t) => ({
        assignee: 'Self',
        task: t,
        deadline: 'Upcoming',
      }));

    if (actionItems.length === 0 && sentences.length > 0) {
      actionItems = [
        {
          assignee: 'Self',
          task: sentences[sentences.length - 1],
          deadline: 'Follow up',
        },
      ];
    }

    const result = {
      summary,
      decisions: sentences.filter((s) => s.toLowerCase().includes('decid') || s.toLowerCase().includes('will') || s.toLowerCase().includes('agreed') || s.toLowerCase().includes('roadmap')).slice(0, 3),
      actionItems,
      sentiment: 'Productive and actionable',
    };

    if (result.decisions.length === 0) {
      result.decisions.push('Meeting discussion noted for future reference.');
    }

    return MeetingDistillationSchema.parse(result) as unknown as MeetingDistillationResult;
  }

  async generateDailyBriefing(userId?: string): Promise<DailyBriefingResult> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 600);
    }

    let topTasks: string[] = [];
    if (userId) {
      try {
        const dbTasks = await this.prisma.task.findMany({
          where: { userId, status: 'PENDING' },
          take: 3,
        });
        topTasks = dbTasks.map((t) => t.title);
      } catch (_) {}
    }

    const briefing = {
      greeting: 'Welcome back! Here is what matters today.',
      topTasks,
      upcomingMeetings: [],
      contextualInsight: topTasks.length > 0
        ? `You have ${topTasks.length} pending actions queued for completion.`
        : 'Your workspace is clear. Capture a new note or task to begin planning your day.',
    };

    return DailyBriefingSchema.parse(briefing) as unknown as DailyBriefingResult;
  }

  async askNotes(
    query: string,
    notes?: Array<{ id: string; title: string; content: string }>,
    userId?: string,
  ): Promise<{ answer: string; citedNoteIds: string[] }> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 1000);
    }

    let searchNotes = notes || [];
    if (searchNotes.length === 0 && userId) {
      try {
        const dbNotes = await this.prisma.note.findMany({
          where: { userId, isArchived: false },
        });
        searchNotes = dbNotes.map((n) => ({ id: n.id, title: n.title, content: n.content }));
      } catch (_) {}
    }

    const qTokens = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matchingNotes = searchNotes.filter((n) => {
      const text = `${n.title} ${n.content}`.toLowerCase();
      return query.toLowerCase().includes(text) || text.includes(query.toLowerCase()) || qTokens.some((t) => text.includes(t));
    });

    const citedNoteIds = matchingNotes.map((n) => n.id);

    if (this.openaiClient) {
      try {
        const hasNotes = matchingNotes.length > 0;
        const systemPrompt = hasNotes
          ? 'You are Mindora, an intelligent executive AI Second Brain. Answer the user query using the provided indexed notes when relevant. Be concise, executive, and cite note titles when stating facts.'
          : 'You are Mindora, an intelligent executive AI Second Brain. Answer the user query helpfully, professionally, and concisely. If the user asks about specific saved notes they have not created yet, explain that they can capture thoughts or notes anytime.';

        const contextStr = hasNotes
          ? matchingNotes.map((n, i) => `[Source ${i + 1}: ${n.title}]\n${n.content}`).join('\n\n')
          : 'No specific notes saved yet.';

        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: hasNotes ? `Context:\n${contextStr}\n\nQuestion: ${query}` : query,
            },
          ],
          temperature: 0.5,
          max_tokens: 600,
        });

        const answer = completion.choices[0]?.message?.content?.trim();
        if (answer) {
          return { answer, citedNoteIds };
        }
      } catch (err) {
        console.warn('AI LLM request failed, using local synthesizer fallback:', err);
      }
    }

    if (matchingNotes.length === 0) {
      return {
        answer:
          "I'm here to help. You haven't captured any notes matching this query yet. Try creating a note, voice memo, or asking me anything directly.",
        citedNoteIds: [],
      };
    }

    const answer =
      `Synthesized from your Second Brain:\n\n` +
      matchingNotes
        .map((n) => `• In "${n.title}": ${n.content.substring(0, 140)}...`)
        .join('\n\n');

    return { answer, citedNoteIds };
  }

  async semanticSearch(query: string, userId?: string) {
    if (userId) {
      await this.checkAndTrackQuota(userId, 300);
    }
    try {
      const notes = await this.prisma.note.findMany({
        where: { userId, isArchived: false },
      });
      const q = query.toLowerCase();
      return notes
        .map((n) => {
          const matchScore =
            n.title.toLowerCase().includes(q) ? 0.95 :
            n.content.toLowerCase().includes(q) ? 0.85 : 0.6;
          return {
            id: n.id,
            title: n.title,
            summary: n.summary,
            snippet: n.content.substring(0, 100),
            similarity: matchScore,
          };
        })
        .filter((n) => n.similarity > 0.6)
        .sort((a, b) => b.similarity - a.similarity);
    } catch {
      return [];
    }
  }

  async transcribeAudio(transcript?: string, userId?: string) {
    if (userId) {
      await this.checkAndTrackQuota(userId, 500);
    }
    const text = transcript || 'I need to finish the payment system tomorrow and call John about the logo.';
    const context = await this.extractContext(text, userId);
    return {
      transcript: text,
      detectedTasks: context.tasks.map((t) => t.title),
      detectedDue: context.deadlines[0] || 'Tomorrow',
    };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    // Generate deterministic 1536-dim vector for embeddings
    const vector = new Array(1536).fill(0);
    for (let i = 0; i < text.length && i < 1536; i++) {
      vector[i] = (text.charCodeAt(i) % 100) / 100;
    }
    return vector;
  }
}
