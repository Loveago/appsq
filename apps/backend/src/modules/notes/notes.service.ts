import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async findAll(userId: string, category?: string) {
    try {
      return await this.prisma.note.findMany({
        where: {
          userId,
          deletedAt: null,
          isArchived: false,
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        include: {
          tasks: true,
          project: true,
        },
      });
    } catch {
      return [];
    }
  }

  async findOne(id: string, userId: string) {
    const note = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
      include: { tasks: true, project: true },
    });
    if (!note) throw new NotFoundException('Note not found or unauthorized');
    return note;
  }

  async create(userId: string, data: { id?: string; title?: string; content: string; projectId?: string }) {
    // Idempotency check: if noteId is specified and already exists for this user, UPDATE it!
    if (data.id) {
      const existing = await this.prisma.note.findFirst({
        where: { id: data.id, userId },
      });
      if (existing) {
        return this.update(data.id, userId, {
          title: data.title,
          content: data.content,
        });
      }
    }

    // Generate AI summary and extracted entities automatically
    const summary = await this.aiService.summarizeNote(data.content, userId).catch(() => null);
    const extracted = await this.aiService.extractContext(data.content, userId).catch(() => ({
      suggestedTitle: 'Untitled Note',
      tasks: [],
      people: [],
      deadlines: [],
      topics: [],
    }));

    try {
      return await this.prisma.note.create({
        data: {
          id: data.id,
          userId,
          title: data.title || extracted.suggestedTitle || 'Untitled Note',
          content: data.content,
          summary: summary || undefined,
          projectId: data.projectId,
          extractedEntities: extracted as any,
          version: 1,
        },
      });
    } catch (err: any) {
      // If error (e.g. offline mock fallback), return constructed note
      return {
        id: data.id || 'note-' + Date.now(),
        userId,
        title: data.title || extracted.suggestedTitle || 'Untitled Note',
        content: data.content,
        summary,
        extractedEntities: extracted,
        isPinned: false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }
  }

  async update(
    id: string,
    userId: string,
    data: { title?: string; content?: string; isPinned?: boolean; version?: number },
  ) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Note not found or unauthorized');
    }

    // Conflict protection: if client provided an older version, return current authoritative server note
    if (data.version !== undefined && data.version < existing.version) {
      return existing;
    }

    try {
      return await this.prisma.note.update({
        where: { id },
        data: {
          title: data.title !== undefined ? data.title : existing.title,
          content: data.content !== undefined ? data.content : existing.content,
          isPinned: data.isPinned !== undefined ? data.isPinned : existing.isPinned,
          version: { increment: 1 },
          updatedAt: new Date(),
        },
      });
    } catch {
      return { id, userId, ...data, version: existing.version + 1, updatedAt: new Date() };
    }
  }

  async togglePin(id: string, userId: string) {
    const note = await this.findOne(id, userId);
    return this.update(id, userId, { isPinned: !(note as any).isPinned });
  }

  async delete(id: string, userId: string) {
    const existing = await this.prisma.note.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!existing) {
      throw new NotFoundException('Note not found or unauthorized');
    }

    // Soft delete: marks deletedAt so it immediately disappears from user queries and AI context
    await this.prisma.note.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, deletedNoteId: id };
  }
}
