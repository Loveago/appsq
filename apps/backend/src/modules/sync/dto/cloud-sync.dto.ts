import { IsString, IsOptional, IsBoolean, IsNumber, IsArray, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { BadRequestException } from '@nestjs/common';

// List of strictly prohibited keys in cloud sync payload
export const FORBIDDEN_MEDIA_KEYS = [
  'audioPath',
  'audioUrl',
  'recording',
  'voiceNote',
  'imagePaths',
  'images',
  'attachments',
  'binaryData',
  'transcriptionUrl',
  'mediaUrl',
  'scannedDocument',
  'pdfPath',
  'videoPath',
  'fileData',
  'audio',
  'photo',
  'attachment',
] as const;

export function validateNoMediaFields(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const forbidden of FORBIDDEN_MEDIA_KEYS) {
    if (forbidden in obj && obj[forbidden] !== null && obj[forbidden] !== undefined) {
      throw new BadRequestException(
        `Cloud sync supports text notes only. Unsupported media or attachment field detected: "${forbidden}". Audio, images, and binary attachments must remain strictly local.`,
      );
    }
  }

  // Check nested properties
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string') {
      // Check for base64 encoded audio/image data URIs
      if (val.startsWith('data:audio/') || val.startsWith('data:image/') || val.startsWith('data:video/')) {
        throw new BadRequestException(
          `Cloud sync supports text notes only. Embedded media data URI detected in "${key}".`,
        );
      }
    }
  }
}

export class SyncPullDto {
  @IsOptional()
  @IsString()
  lastSyncTimestamp?: string;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class SyncNoteItemDto {
  @IsString()
  id: string;

  @IsString()
  @MaxLength(500)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsNumber()
  clientRevision?: number;

  @IsOptional()
  @IsString()
  clientModifiedAt?: string;

  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class SyncPushDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncNoteItemDto)
  items: SyncNoteItemDto[];

  @IsOptional()
  @IsString()
  deviceToken?: string;
}
