import { z } from 'zod';

export const ExtractedContextSchema = z.object({
  people: z.array(z.string()).default([]),
  projects: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  tasks: z
    .array(
      z.object({
        title: z.string(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        dueDate: z.string().nullable().default(null),
      }),
    )
    .default([]),
  relatedTopics: z.array(z.string()).default([]),
  suggestedTitle: z.string().default('Untitled Thought'),
});

export const MeetingDistillationSchema = z.object({
  summary: z.string(),
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
  sentiment: z.string().default('Focused'),
});

export const DailyBriefingSchema = z.object({
  greeting: z.string(),
  topTasks: z.array(z.string()).default([]),
  upcomingMeetings: z.array(z.string()).default([]),
  contextualInsight: z.string(),
});
