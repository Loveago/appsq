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

    if (this.openaiClient) {
      try {
        const prompt = `You are Mindora AI, an executive context extraction system.
Analyze the following user input and return a pure JSON object adhering strictly to this schema:
{
  "people": ["Name1", "Name2"],
  "projects": ["Project Name"],
  "deadlines": ["Due Date/Time or Tomorrow"],
  "tasks": [
    {
      "title": "Clear action verb task description",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dueDate": "YYYY-MM-DD or readable deadline or null"
    }
  ],
  "relatedTopics": ["Topic1", "Topic2"],
  "suggestedTitle": "Short punchy executive title"
}

User input:
"""${content}"""

Return ONLY valid JSON without markdown formatting or codeblocks.`;

        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 800,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          const parsed = JSON.parse(cleaned);
          return ExtractedContextSchema.parse(parsed) as unknown as ExtractedContextResult;
        }
      } catch (err) {
        console.warn('LLM extractContext failed, falling back to heuristic parsing:', err);
      }
    }

    // Dynamic heuristic parser based on user's actual text
    const words = content.toLowerCase();
    const people: string[] = [];
    const tasks: Array<{ title: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; dueDate: string | null }> = [];
    const projects: string[] = [];
    const deadlines: string[] = [];

    // Extract dynamic capitalised names if present
    const nameMatches = content.match(/\b([A-Z][a-z]{2,})\b/g) || [];
    for (const name of nameMatches) {
      if (!['The', 'This', 'That', 'With', 'From', 'Need', 'Have', 'Will', 'Must', 'Tomorrow', 'Today'].includes(name) && !people.includes(name)) {
        people.push(name);
      }
    }

    if (words.includes('website') || words.includes('web')) projects.push('Website Project');
    if (words.includes('delivery')) projects.push('Delivery App');
    if (words.includes('stripe') || words.includes('payment')) projects.push('Finance');

    if (words.includes('september')) deadlines.push('Before September 01');
    if (words.includes('tomorrow')) deadlines.push('Tomorrow');

    // Detect tasks from lines or keywords
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim().replace(/^[-*•\d.]\s*/, '');
      if (
        trimmed.toLowerCase().includes('need to') ||
        trimmed.toLowerCase().includes('finish') ||
        trimmed.toLowerCase().includes('call') ||
        trimmed.toLowerCase().includes('review') ||
        trimmed.toLowerCase().includes('send') ||
        trimmed.toLowerCase().includes('create') ||
        trimmed.toLowerCase().includes('do')
      ) {
        tasks.push({
          title: trimmed.replace(/^(i need to|we need to|please|todo:)\s+/i, '').trim(),
          priority: isPro ? 'HIGH' : 'MEDIUM',
          dueDate: words.includes('tomorrow') ? 'Tomorrow' : words.includes('today') ? 'Today' : null,
        });
      }
    }

    if (tasks.length === 0 && lines.length > 0 && lines[0].trim().length > 3) {
      tasks.push({
        title: lines[0].trim().slice(0, 80),
        priority: 'MEDIUM',
        dueDate: null,
      });
    }

    const firstLine = lines[0]?.trim() || '';
    const suggestedTitle = firstLine.length > 5 && firstLine.length < 50
      ? firstLine
      : people.length > 0
      ? `Notes with ${people.slice(0, 2).join(' & ')}`
      : 'Quick Capture';

    const rawResult = {
      people,
      projects: projects.length > 0 ? projects : ['General'],
      deadlines: deadlines.length > 0 ? deadlines : ['No fixed deadline'],
      tasks,
      relatedTopics: ['Productivity', 'Action Items'],
      suggestedTitle,
    };

    return ExtractedContextSchema.parse(rawResult) as unknown as ExtractedContextResult;
  }

  async summarizeNote(content: string, userId?: string): Promise<string> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 400);
    }

    if (this.openaiClient) {
      try {
        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: 'You are Mindora AI. Provide a concise, clear 1-2 sentence TL;DR summary of the note.',
            },
            {
              role: 'user',
              content,
            },
          ],
          temperature: 0.3,
          max_tokens: 150,
        });

        const sum = completion.choices[0]?.message?.content?.trim();
        if (sum) return sum;
      } catch (err) {
        console.warn('LLM summarize failed, falling back:', err);
      }
    }

    const sentences = content
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    if (sentences.length <= 2) {
      return `TL;DR: ${content.trim()}`;
    }

    return `TL;DR: ${sentences.slice(0, 2).join('. ')}.`;
  }

  async distillMeeting(transcript: string, userId?: string): Promise<MeetingDistillationResult> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 1500);
    }

    if (this.openaiClient) {
      try {
        const prompt = `You are Mindora AI, an executive meeting intelligence system.
Analyze the following meeting transcript and return a pure JSON object adhering strictly to this schema:
{
  "summary": "Executive summary of what was discussed",
  "decisions": ["Clear key decision 1", "Key decision 2"],
  "actionItems": [
    {
      "assignee": "Name or Self",
      "task": "Specific actionable task",
      "deadline": "Deadline or Upcoming"
    }
  ],
  "sentiment": "Productive / Strategic / Urgent / etc."
}

Transcript:
"""${transcript}"""

Return ONLY valid JSON without markdown formatting or codeblocks.`;

        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 900,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
          const parsed = JSON.parse(cleaned);
          return MeetingDistillationSchema.parse(parsed) as unknown as MeetingDistillationResult;
        }
      } catch (err) {
        console.warn('LLM distillMeeting failed, falling back to heuristic parsing:', err);
      }
    }

    const sentences = transcript.split(/[.!?\n]/).map((s) => s.trim()).filter((s) => s.length > 5);
    const summary = sentences.length > 0
      ? sentences.slice(0, 2).join('. ')
      : 'Executive meeting notes and discussion.';

    let actionItems = sentences
      .filter((s) => s.toLowerCase().includes('need to') || s.toLowerCase().includes('todo') || s.toLowerCase().includes('action') || s.toLowerCase().includes('checks') || s.toLowerCase().includes('review') || s.toLowerCase().includes('finish') || s.toLowerCase().includes('send'))
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

    const decisions = sentences
      .filter((s) => s.toLowerCase().includes('decid') || s.toLowerCase().includes('will') || s.toLowerCase().includes('agreed') || s.toLowerCase().includes('roadmap') || s.toLowerCase().includes('plan'))
      .slice(0, 3);

    const result = {
      summary,
      decisions: decisions.length > 0 ? decisions : ['Key topics reviewed and noted for execution.'],
      actionItems,
      sentiment: 'Productive and actionable',
    };

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
  ): Promise<{ answer: string; citedNoteIds: string[]; action?: any }> {
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
        const systemPrompt = `You are Mindora, an ultra-smart executive AI Second Brain assistant.
You can converse naturally, brainstorm, give strategic advice, and help organize thoughts.
${hasNotes ? 'You have access to the user\'s indexed notes context below. Cite note titles accurately when answering.' : 'The user does not have specific saved notes for this query yet.'}

IMPORTANT CAPABILITIES:
If the user asks you to create, save, or write a note or task (e.g. "Create a note about...", "Save a task to...", "Remind me to..."), you MUST fulfill the request and also output a special JSON action block at the VERY END of your response inside <<<ACTION>>> and <<</ACTION>>> tags, like:
<<<ACTION>>>
{
  "createNote": {
    "title": "Title of the note",
    "content": "Content or details of the note",
    "category": "Ideas" | "Meetings" | "Daily" | "Work",
    "tag": "NOTE" | "ACTION" | "PROJECT"
  },
  "createTasks": [
    {
      "title": "Task title",
      "priority": "high" | "medium" | "low",
      "dueTime": "Tomorrow" or "Today" or readable date
    }
  ]
}
<<</ACTION>>>
If the user is chatting, asking questions, or brainstorming, provide a brilliant, clear, concise response without the action block. Always be proactive and helpful.`;

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
          max_tokens: 800,
        });

        const answer = completion.choices[0]?.message?.content?.trim();
        if (answer) {
          // If action tag exists, extract and potentially create note/task in db if userId exists
          const actionMatch = answer.match(/<<<ACTION>>>([\s\S]*?)<<<\/ACTION>>>/);
          let cleanedAnswer = answer.replace(/<<<ACTION>>>[\s\S]*?<<<\/ACTION>>>/, '').trim();
          let createdNoteData: any = null;
          let createdTasksData: any[] = [];

          if (actionMatch && actionMatch[1]) {
            try {
              const actionJson = JSON.parse(actionMatch[1].trim());
              if (actionJson.createNote) {
                createdNoteData = actionJson.createNote;
                if (userId) {
                  await this.prisma.note.create({
                    data: {
                      userId,
                      title: createdNoteData.title || 'AI Note',
                      content: createdNoteData.content || '',
                      summary: createdNoteData.content?.slice(0, 80) || '',
                    },
                  });
                }
              }
              if (actionJson.createTasks && Array.isArray(actionJson.createTasks)) {
                createdTasksData = actionJson.createTasks;
                if (userId) {
                  for (const t of createdTasksData) {
                    await this.prisma.task.create({
                      data: {
                        userId,
                        title: t.title,
                        priority: t.priority?.toUpperCase() === 'HIGH' ? 'HIGH' : 'MEDIUM',
                        isAiExtracted: true,
                      },
                    });
                  }
                }
              }
            } catch (err) {
              console.warn('Failed to parse AI action block:', err);
            }
          }

          return {
            answer: cleanedAnswer,
            citedNoteIds,
            action: createdNoteData || createdTasksData.length > 0 ? { note: createdNoteData, tasks: createdTasksData } : null,
          };
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
    const text = transcript && transcript.trim().length > 0
      ? transcript.trim()
      : 'Voice memo recording captured.';
    const context = await this.extractContext(text, userId);
    return {
      transcript: text,
      detectedTasks: context.tasks.map((t) => t.title),
      detectedDue: context.deadlines[0] || 'Tomorrow',
      suggestedTitle: context.suggestedTitle,
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
