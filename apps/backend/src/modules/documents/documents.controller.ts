import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { DocumentsService, SaveScannedDocumentDto } from './documents.service';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AiService } from '../ai/ai.service';

@UseGuards(OptionalJwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly aiService: AiService,
  ) {}

  @Post('scan')
  async saveScannedDocument(
    @CurrentUser('id') userId: string | undefined,
    @Body() dto: SaveScannedDocumentDto,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.documentsService.saveScannedDocument(effectiveUserId, dto);
  }

  @Get()
  async listDocuments(@CurrentUser('id') userId: string | undefined) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.documentsService.listDocuments(effectiveUserId);
  }

  @Get(':id')
  async getDocument(
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.documentsService.getDocument(effectiveUserId, id);
  }

  @Put(':id')
  async updateDocument(
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      extractedText?: string;
      structuredData?: any;
      documentType?: string;
    },
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.documentsService.updateDocument(effectiveUserId, id, dto);
  }

  @Delete(':id')
  async deleteDocument(
    @CurrentUser('id') userId: string | undefined,
    @Param('id') id: string,
  ) {
    const effectiveUserId = userId || (await this.aiService.getOrCreateDefaultGuestId());
    return this.documentsService.deleteDocument(effectiveUserId, id);
  }
}
