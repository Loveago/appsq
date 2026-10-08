import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';

export interface SaveScannedDocumentDto {
  title?: string;
  imageUrl?: string;
  extractedText: string;
  structuredData?: any;
  confidenceScore?: number;
  documentType?: string;
  createNote?: boolean;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  async saveScannedDocument(userId: string, dto: SaveScannedDocumentDto) {
    // 1. Authoritative quota verification & usage recording
    await this.billingService.checkAndRecordUsage(userId, 'DOCUMENT_SCAN');

    const title = dto.title || 'Scanned Document';
    const documentType = dto.documentType || 'GENERAL';

    // 2. Persist scanned document record
    const document = await this.prisma.scannedDocument.create({
      data: {
        userId,
        title,
        imageUrl: dto.imageUrl || null,
        extractedText: dto.extractedText,
        structuredData: dto.structuredData || {},
        confidenceScore: dto.confidenceScore ?? 0.95,
        documentType,
      },
    });

    // 3. If requested, also create a structured note in Second Brain
    let noteId: string | null = null;
    if (dto.createNote) {
      const createdNote = await this.prisma.note.create({
        data: {
          userId,
          title: `[Scan] ${title}`,
          content: dto.extractedText,
          summary: dto.extractedText.slice(0, 100),
        },
      });
      noteId = createdNote.id;
    }

    return {
      document,
      associatedNoteId: noteId,
    };
  }

  async listDocuments(userId: string) {
    return this.prisma.scannedDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(userId: string, id: string) {
    const doc = await this.prisma.scannedDocument.findFirst({
      where: { id, userId },
    });
    if (!doc) {
      throw new NotFoundException('Scanned document not found');
    }
    return doc;
  }

  async updateDocument(
    userId: string,
    id: string,
    dto: { title?: string; extractedText?: string; structuredData?: any; documentType?: string },
  ) {
    const existing = await this.prisma.scannedDocument.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Scanned document not found');
    }

    return this.prisma.scannedDocument.update({
      where: { id },
      data: {
        title: dto.title ?? existing.title,
        extractedText: dto.extractedText ?? existing.extractedText,
        structuredData: dto.structuredData ?? existing.structuredData,
        documentType: dto.documentType ?? existing.documentType,
      },
    });
  }

  async deleteDocument(userId: string, id: string) {
    const existing = await this.prisma.scannedDocument.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('Scanned document not found');
    }

    await this.prisma.scannedDocument.delete({
      where: { id },
    });

    return { success: true };
  }
}
