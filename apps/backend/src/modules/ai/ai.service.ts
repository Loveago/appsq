import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { PrismaService } from '../../database/prisma.service';
import {
  ExtractedContextResult,
  MeetingDistillationResult,
  DailyBriefingResult,
  AiChatResult,
  ExecutedToolAction,
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

  async rewriteNote(content: string, style: string = 'professional', userId?: string): Promise<string> {
    if (userId) {
      await this.checkAndTrackQuota(userId, 400);
    }

    if (this.openaiClient) {
      try {
        let styleInstruction = 'Rewrite the following text with improved clarity, structure, and professional tone.';
        if (style === 'concise') {
          styleInstruction = 'Rewrite the following text to be concise, punchy, and eliminate all fluff.';
        } else if (style === 'checklist') {
          styleInstruction = 'Convert the key actionable points in the following text into a clean Markdown checklist with - [ ] items.';
        } else if (style === 'email') {
          styleInstruction = 'Transform the following note content into a well-crafted executive email draft with subject line and sign-off.';
        } else if (style === 'executive') {
          styleInstruction = 'Elevate the following note into high-level executive communication with clear strategic implications.';
        }

        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [
            {
              role: 'system',
              content: `You are Mindora AI, an elite second brain assistant. ${styleInstruction}`,
            },
            {
              role: 'user',
              content,
            },
          ],
          temperature: 0.4,
          max_tokens: 600,
        });

        const rewritten = completion.choices[0]?.message?.content?.trim();
        if (rewritten) return rewritten;
      } catch (err) {
        console.warn('LLM rewrite failed, falling back:', err);
      }
    }

    // Fallback transformations
    if (style === 'checklist') {
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      return lines.map((l) => `- [ ] ${l.replace(/^[-*•\d.]\s*/, '')}`).join('\n');
    }
    if (style === 'email') {
      return `Subject: Note Overview & Updates\n\nHi Team,\n\nHere is the latest update:\n\n${content}\n\nBest regards,\nExecutive Team`;
    }
    return `Structured Overview:\n\n${content}`;
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

  // ==========================================
  // CONVERSATION HISTORY & RETRIEVAL METHODS
  // ==========================================

  async getConversations(userId: string) {
    try {
      return await this.prisma.aiConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { content: true, createdAt: true, role: true },
          },
        },
      });
    } catch {
      return [];
    }
  }

  async getConversation(id: string, userId: string) {
    try {
      const conv = await this.prisma.aiConversation.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });
      if (!conv) {
        throw new BadRequestException('Conversation not found');
      }
      return conv;
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      return null;
    }
  }

  async deleteConversation(id: string, userId: string) {
    try {
      await this.prisma.aiConversation.deleteMany({
        where: { id, userId },
      });
      return { success: true };
    } catch {
      return { success: true };
    }
  }

  // ==========================================
  // GENERAL AI + SECOND BRAIN TOOL EXECUTION
  // ==========================================

  async chatWithTools(
    userId: string,
    query: string,
    conversationId?: string,
  ): Promise<AiChatResult> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Message cannot be empty');
    }

    await this.checkAndTrackQuota(userId, 1000);

    // 1. Resolve or create persistent conversation
    let conv = conversationId
      ? await this.prisma.aiConversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: {
              take: 8,
              orderBy: { createdAt: 'desc' },
            },
          },
        })
      : null;

    if (!conv) {
      const cleanTitle = query.length > 32 ? `${query.slice(0, 32)}...` : query;
      conv = await this.prisma.aiConversation.create({
        data: {
          userId,
          title: cleanTitle,
        },
        include: { messages: true },
      });
    }

    // Record the incoming user message
    await this.prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: 'user',
        content: query,
      },
    });

    // 2. Retrieve user context from database: Notes, Tasks, Projects, Meetings
    const [notes, tasks, projects, meetings] = await Promise.all([
      this.prisma.note.findMany({
        where: { userId, isArchived: false },
        take: 12,
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        select: { id: true, title: true, content: true, summary: true, createdAt: true },
      }),
      this.prisma.task.findMany({
        where: { userId, status: 'PENDING' },
        take: 12,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        select: { id: true, title: true, priority: true, dueDate: true, dueTimeStr: true },
      }),
      this.prisma.project.findMany({
        where: { userId },
        take: 6,
        select: { id: true, name: true, description: true, aiSummary: true },
      }),
      this.prisma.meeting.findMany({
        where: { userId },
        take: 4,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, summary: true, decisions: true, actionItems: true },
      }),
    ]);

    // Build context summary for second brain
    const notesContext = notes.length > 0
      ? notes.map((n) => `[Note ID: "${n.id}" | Title: "${n.title}"]\n${n.content}`).join('\n\n')
      : 'No stored notes yet.';

    const tasksContext = tasks.length > 0
      ? tasks.map((t) => `• [Task ID: "${t.id}"] ${t.title} (Priority: ${t.priority}${t.dueTimeStr ? `, Due: ${t.dueTimeStr}` : ''})`).join('\n')
      : 'No active pending tasks.';

    const projectsContext = projects.length > 0
      ? projects.map((p) => `• [Project ID: "${p.id}"] ${p.name}: ${p.description || 'No description'}`).join('\n')
      : 'No active projects.';

    const meetingsContext = meetings.length > 0
      ? meetings.map((m) => `• [Meeting: "${m.title}"] Summary: ${m.summary || 'Recorded'}`).join('\n')
      : 'No recorded meetings yet.';

    // 3. Assemble LLM prompt
    const systemPrompt = `You are Mindora, a premier Executive AI Personal Assistant and Second Brain.
You can converse naturally, answer general knowledge, write code, strategize, brainstorm, and manage the user's life and work.

PHILOSOPHY:
- Answer general questions directly and brilliantly using your broad intelligence (science, history, coding, creative, advice, etc.).
- When the user asks about their personal data, projects, delivery app, meetings, notes, or tasks, intelligently use their Second Brain Context below.
- Combine both general knowledge and personal context seamlessly when requested.
- CITE note titles when referring to private notes.

ACTION SYSTEM CAPABILITIES:
You can execute actions directly on the user's second brain.
When the user asks you to:
- create a note ("create a note", "save this as a note", "make a note of that", "turn this into a note", "remember this", "keep this idea")
- create or complete a task ("add a task", "remind me to...", "create task", "finish task")
- create a list ("create a checklist for...")
- create a project ("create a project called...")
- ask questions about a meeting or update information

You MUST return an action block at the VERY END of your response inside <<<ACTIONS>>> and <<<END_ACTIONS>>> containing a JSON array of commands.

SUPPORTED ACTIONS SCHEMA:
<<<ACTIONS>>>
[
  {
    "tool": "create_note",
    "parameters": {
      "title": "Title of Note",
      "content": "Rich markdown content of the note",
      "projectId": "optional-project-id"
    }
  },
  {
    "tool": "create_task",
    "parameters": {
      "title": "Task title",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "dueTimeStr": "Tomorrow" | "Friday" | "Today" | null,
      "projectId": "optional-project-id"
    }
  },
  {
    "tool": "create_list",
    "parameters": {
      "title": "Checklist Title",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  },
  {
    "tool": "create_project",
    "parameters": {
      "name": "Project Name",
      "description": "Project description"
    }
  }
]
<<<END_ACTIONS>>>

CRITICAL RULE:
If you return an action in <<<ACTIONS>>>, do not say "You can create a note..." Say "Done, I've created the note..." because the backend executes the tools immediately before displaying the result to the user!
If no action is required, do NOT include the <<<ACTIONS>>> block.`;

    let assistantAnswer = '';
    const executedActions: ExecutedToolAction[] = [];
    const citedNoteIds: string[] = [];

    // Filter cited notes based on query match
    const qLower = query.toLowerCase();
    for (const n of notes) {
      if (qLower.includes(n.title.toLowerCase()) || n.content.toLowerCase().includes(qLower)) {
        citedNoteIds.push(n.id);
      }
    }

    if (this.openaiClient) {
      try {
        const historyMessages = (conv.messages || []).slice(-6).reverse().map((m) => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'assistant' | 'user',
          content: m.content,
        }));

        const completion = await this.openaiClient.chat.completions.create({
          model: this.defaultModel,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'system',
              content: `--- USER SECOND BRAIN CONTEXT ---
NOTES:
${notesContext}

TASKS:
${tasksContext}

PROJECTS:
${projectsContext}

MEETINGS:
${meetingsContext}
---------------------------------`,
            },
            ...historyMessages,
            { role: 'user', content: query },
          ],
          temperature: 0.6,
          max_tokens: 1200,
        });

        const rawContent = completion.choices[0]?.message?.content?.trim() || '';
        const actionMatch = rawContent.match(/<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/);
        assistantAnswer = rawContent.replace(/<<<ACTIONS>>>[\s\S]*?<<<END_ACTIONS>>>/, '').trim();

        if (actionMatch && actionMatch[1]) {
          try {
            const parsedActions = JSON.parse(actionMatch[1].trim());
            if (Array.isArray(parsedActions)) {
              for (const act of parsedActions) {
                const executed = await this.executeToolAction(userId, act.tool, act.parameters);
                executedActions.push(executed);
              }
            }
          } catch (actionErr) {
            console.warn('Failed to parse and execute LLM actions:', actionErr);
          }
        }
      } catch (llmErr) {
        console.warn('LLM chat failed, using local fallback:', llmErr);
      }
    }

    // Offline / Fallback handling if LLM was unavailable or produced empty answer
    if (!assistantAnswer) {
      const fallback = await this.handleFallbackChatAndActions(userId, query, notes, tasks);
      assistantAnswer = fallback.answer;
      if (fallback.action) {
        executedActions.push(fallback.action);
      }
    }

    // Save assistant message to conversation history
    await this.prisma.aiMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: assistantAnswer,
        citedNoteIds: citedNoteIds.length > 0 ? (citedNoteIds as any) : undefined,
        toolCalls: executedActions.length > 0 ? (executedActions as any) : undefined,
      },
    });

    // Touch conversation updated timestamp
    await this.prisma.aiConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return {
      answer: assistantAnswer,
      conversationId: conv.id,
      citedNoteIds,
      actionsExecuted: executedActions,
      suggestedTitle: conv.title,
    };
  }

  // ==========================================
  // TOOL EXECUTION ENGINE
  // ==========================================

  private async executeToolAction(
    userId: string,
    toolName: string,
    params: any,
  ): Promise<ExecutedToolAction> {
    try {
      switch (toolName) {
        case 'create_note': {
          const title = params.title || 'AI Note';
          const content = params.content || '';
          const summary = content.length > 80 ? `${content.slice(0, 80)}...` : content;
          const note = await this.prisma.note.create({
            data: {
              userId,
              title,
              content,
              summary,
              projectId: params.projectId || null,
            },
          });
          return {
            tool: 'create_note',
            parameters: params,
            result: note,
            success: true,
            message: `Created note: "${title}"`,
          };
        }

        case 'create_task': {
          const title = params.title || 'New Task';
          const task = await this.prisma.task.create({
            data: {
              userId,
              title,
              priority: (params.priority as any) || 'MEDIUM',
              dueTimeStr: params.dueTimeStr || 'Upcoming',
              projectId: params.projectId || null,
              isAiExtracted: true,
            },
          });
          return {
            tool: 'create_task',
            parameters: params,
            result: task,
            success: true,
            message: `Created task: "${title}"`,
          };
        }

        case 'create_list': {
          const title = params.title || 'Checklist';
          const items = Array.isArray(params.items) ? params.items : [];
          const list = await this.prisma.smartList.create({
            data: {
              userId,
              title,
              isAiGenerated: true,
              items: {
                create: items.map((content: string, index: number) => ({
                  content,
                  position: index,
                })),
              },
            },
            include: { items: true },
          });
          return {
            tool: 'create_list',
            parameters: params,
            result: list,
            success: true,
            message: `Created list: "${title}" with ${items.length} items`,
          };
        }

        case 'create_project': {
          const name = params.name || 'New Project';
          const project = await this.prisma.project.create({
            data: {
              userId,
              name,
              description: params.description || '',
              aiSummary: `Initialized project for ${name}.`,
            },
          });
          return {
            tool: 'create_project',
            parameters: params,
            result: project,
            success: true,
            message: `Created project: "${name}"`,
          };
        }

        case 'complete_task': {
          if (params.id) {
            await this.prisma.task.update({
              where: { id: params.id },
              data: { status: 'COMPLETED' },
            });
            return {
              tool: 'complete_task',
              parameters: params,
              result: { id: params.id, status: 'COMPLETED' },
              success: true,
              message: `Completed task.`,
            };
          }
          return {
            tool: 'complete_task',
            parameters: params,
            result: null,
            success: false,
            message: 'Task ID not provided.',
          };
        }

        default:
          return {
            tool: toolName,
            parameters: params,
            result: null,
            success: false,
            message: `Unknown tool: ${toolName}`,
          };
      }
    } catch (err: any) {
      return {
        tool: toolName,
        parameters: params,
        result: null,
        success: false,
        message: err.message || 'Tool execution failed',
      };
    }
  }

  private async handleFallbackChatAndActions(
    userId: string,
    query: string,
    notes: any[],
    tasks: any[],
  ): Promise<{ answer: string; action?: ExecutedToolAction }> {
    const lower = query.toLowerCase();

    // 1. Natural Language Note Creation
    if (
      lower.startsWith('create a note') ||
      lower.startsWith('create note') ||
      lower.startsWith('save this as a note') ||
      lower.startsWith('save note') ||
      lower.startsWith('make a note') ||
      lower.startsWith('remember this')
    ) {
      const cleanContent = query
        .replace(/^(create a note|create note|save this as a note|save note|make a note of that|make a note|remember this|keep this idea)\s*(about|for|:)?\s*/i, '')
        .trim();
      const titleWords = cleanContent.split(' ');
      const title = titleWords.length > 5 ? `${titleWords.slice(0, 5).join(' ')}...` : cleanContent || 'Quick Note';
      const executed = await this.executeToolAction(userId, 'create_note', {
        title,
        content: cleanContent || query,
      });
      return {
        answer: `I've created a note titled "${title}" with your instructions.`,
        action: executed,
      };
    }

    // 2. Natural Language Task Creation
    if (
      lower.startsWith('add a task') ||
      lower.startsWith('add task') ||
      lower.startsWith('create a task') ||
      lower.startsWith('create task') ||
      lower.startsWith('remind me to')
    ) {
      const cleanTask = query
        .replace(/^(add a task|add task|create a task|create task|remind me to)\s*(to|:)?\s*/i, '')
        .trim();
      const executed = await this.executeToolAction(userId, 'create_task', {
        title: cleanTask || 'New Task',
        priority: 'MEDIUM',
        dueTimeStr: 'Tomorrow',
      });
      return {
        answer: `I've added the task "${cleanTask}" to your commitments.`,
        action: executed,
      };
    }

    // 3. Second Brain Query Search
    const matching = notes.filter((n) =>
      query.toLowerCase().includes(n.title.toLowerCase()) || n.content.toLowerCase().includes(query.toLowerCase())
    );

    if (matching.length > 0) {
      return {
        answer: `Here is what I found in your Second Brain:\n\n` +
          matching.map((n) => `• **${n.title}**: ${n.content.slice(0, 150)}...`).join('\n\n'),
      };
    }

    // 4. General AI response fallback
    return {
      answer: `I'm Mindora, your AI Second Brain. You asked: "${query}". I'm ready to organize your ideas, draft plans, manage your projects, or create notes and tasks directly whenever you need.`,
    };
  }
}
