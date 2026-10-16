import { z } from 'zod';

export const ExtractedTaskItemSchema = z.object({
  title: z.string(),
  description: z.string().nullable().default(null),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  dueDate: z.string().nullable().default(null),
  category: z.string().default('General'),
  taskType: z.enum(['EXPLICIT', 'PROCEDURAL', 'PURCHASE', 'PREPARATION', 'FOLLOWUP', 'SUGGESTION']).default('EXPLICIT'),
  stepNumber: z.number().nullable().default(null),
  dependencies: z.array(z.string()).default([]),
  quantity: z.string().nullable().default(null),
  isPrerequisite: z.boolean().default(false),
  isSuggestion: z.boolean().default(false),
  confidence: z.number().default(0.9),
});

export const ExtractedContextSchema = z.object({
  people: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  tasks: z.array(ExtractedTaskItemSchema).default([]),
  relatedTopics: z.array(z.string()).default([]),
  suggestedTitle: z.string().default('Untitled Thought'),
  summary: z.string().default(''),
});

export const MeetingDistillationSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  actionItems: z
    .array(
      z.object({
        assignee: z.string(),
        task: z.string(),
        deadline: z.string(),
      }),
    )
    .default([]),
  openQuestions: z.array(z.string()).default([]),
  participants: z.array(z.string()).default([]),
  cleanedTranscript: z.string().optional(),
  sentiment: z.string().default('Focused'),
});

export const DailyBriefingSchema = z.object({
  greeting: z.string(),
  topTasks: z.array(z.string()).default([]),
  upcomingMeetings: z.array(z.string()).default([]),
  contextualInsight: z.string(),
});

export const RecipeIngredientSchema = z.object({
  raw: z.string(),
  name: z.string(),
  quantity: z.string().nullable().default(null),
  unit: z.string().nullable().default(null),
  preparation: z.string().nullable().default(null), // e.g. "finely chopped", "sifted"
  isOptional: z.boolean().default(false),
  alternatives: z.array(z.string()).default([]),
});

export const RecipeTaskSchema = z.object({
  stepNumber: z.number().default(1),
  instruction: z.string(),
  phase: z.enum(['PREP', 'COOK', 'REST', 'SERVE']).default('PREP'),
  estimatedMinutes: z.number().nullable().default(null),
  temperature: z.string().nullable().default(null),
  equipment: z.array(z.string()).default([]),
  canRunInParallel: z.boolean().default(false),
  safetyWarning: z.string().nullable().default(null),
});

export const SmartDocumentExtractionSchema = z.object({
  documentType: z.enum([
    'RECIPE',
    'COOKBOOK',
    'SHOPPING_LIST',
    'MEETING_NOTES',
    'STUDY_NOTES',
    'PROJECT_PLAN',
    'RECEIPT_EXPENSES',
    'GENERAL_NOTE',
  ]).default('GENERAL_NOTE'),
  title: z.string().default('Scanned Document'),
  summary: z.string().default(''),
  confidenceScore: z.number().default(0.9),
  
  // Specific for Recipes & Cookbooks
  isRecipe: z.boolean().default(false),
  servings: z.string().nullable().default(null),
  prepTimeMinutes: z.number().nullable().default(null),
  cookTimeMinutes: z.number().nullable().default(null),
  ingredients: z.array(RecipeIngredientSchema).default([]),
  shoppingListItems: z.array(z.string()).default([]),
  prepTasks: z.array(RecipeTaskSchema).default([]),
  cookingTasks: z.array(RecipeTaskSchema).default([]),

  // In case multiple recipes are present (e.g. from cookbook)
  detectedRecipes: z.array(
    z.object({
      title: z.string(),
      description: z.string().default(''),
      pageOrSection: z.string().nullable().default(null),
    })
  ).default([]),

  // Structured General Tasks with clarity between commitments vs suggestions
  actionableTasks: z.array(
    z.object({
      title: z.string(),
      category: z.enum(['SHOPPING', 'PREPARATION', 'COOKING', 'WORK', 'STUDY', 'ERRAND', 'GENERAL']).default('GENERAL'),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      dueDate: z.string().nullable().default(null),
      isExplicitCommitment: z.boolean().default(true), // false if merely an ambient suggestion or idea
      dependencies: z.array(z.string()).default([]),
    })
  ).default([]),

  // Review flags for low-confidence or illegible handwritten elements
  uncertainItems: z.array(
    z.object({
      originalSnippet: z.string(),
      bestGuess: z.string(),
      field: z.string(),
      reason: z.string(),
    })
  ).default([]),

  metadata: z.record(z.any()).default({}),
});
