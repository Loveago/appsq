import { Module } from '@nestjs/common';
import { VoiceNotesService } from './voice-notes.service';
import { VoiceNotesController } from './voice-notes.controller';
import { BillingModule } from '../billing/billing.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BillingModule, AiModule],
  controllers: [VoiceNotesController],
  providers: [VoiceNotesService],
  exports: [VoiceNotesService],
})
export class VoiceNotesModule {}
