export interface AiCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json_object' | 'text';
  systemPrompt: string;
  userPrompt: string;
}

export interface ExtractedTaskItem {
  title: string;
  description?: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string | null;
  category?: string;
  taskType?: 'EXPLICIT' | 'PROCEDURAL' | 'PURCHASE' | 'PREPARATION' | 'FOLLOWUP' | 'SUGGESTION';
  stepNumber?: number | null;
  dependencies?: string[];
  quantity?: string | null;
  isPrerequisite?: boolean;
  isSuggestion?: boolean;
  confidence?: number;
}

export interface ExtractedContextResult {
  people: string[];
  projects: string[];
  deadlines: string[];
  tasks: ExtractedTaskItem[];
  relatedTopics: string[];
  suggestedTitle: string;
  summary?: string;
}

export interface MeetingDistillationResult {
  summary: string;
  decisions: string[];
  actionItems: Array<{
    assignee: string;
    task: string;
    deadline: string;
  }>;
  keyPoints?: string[];
  openQuestions?: string[];
  participants?: string[];
  cleanedTranscript?: string;
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
  sources?: Array<{ id: string; title: string; snippet?: string; tag?: string }>;
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
