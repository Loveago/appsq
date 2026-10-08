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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('scan')
  async saveScannedDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveScannedDocumentDto,
  ) {
    return this.documentsService.saveScannedDocument(userId, dto);
  }

  @Get()
  async listDocuments(@CurrentUser('id') userId: string) {
    return this.documentsService.listDocuments(userId);
  }

  @Get(':id')
  async getDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.getDocument(userId, id);
  }

  @Put(':id')
  async updateDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body()
    dto: {
      title?: string;
      extractedText?: string;
      structuredData?: any;
      documentType?: string;
    },
  ) {
    return this.documentsService.updateDocument(userId, id, dto);
  }

  @Delete(':id')
  async deleteDocument(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.documentsService.deleteDocument(userId, id);
  }
}
