export interface AiCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  systemPrompt: string;
  userPrompt: string;
}

export interface ExtractedContextResult {
  people: string[];
  projects: string[];
  deadlines: string[];
  tasks: Array<{
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    dueDate: string | null;
  }>;
  relatedTopics: string[];
  suggestedTitle: string;
}

export interface MeetingDistillationResult {
  summary: string;
  decisions: string[];
  actionItems: Array<{
    assignee: string;
    task: string;
    deadline: string;
  }>;
  sentiment: string;
}

export interface DailyBriefingResult {
  greeting: string;
  topTasks: string[];
  upcomingMeetings: string[];
  contextualInsight: string;
}

export interface ExecutedToolAction {
  tool: string;
  parameters: any;
  result: any;
  success: boolean;
  message?: string;
}

export interface AiChatResult {
  answer: string;
  conversationId: string;
  citedNoteIds: string[];
  actionsExecuted: ExecutedToolAction[];
  suggestedTitle?: string;
  tokensUsed?: number;
}

export interface IAiProvider {
  generateText(options: AiCompletionOptions): Promise<string>;
  generateStructuredJson<T>(options: AiCompletionOptions, schema: any): Promise<T>;
  generateEmbedding(text: string): Promise<number[]>;
  transcribeAudio(fileBuffer: Buffer, mimeType: string): Promise<string>;
}
