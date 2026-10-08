import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { BillingModule } from '../billing/billing.module';
import { StreamingTranscriptionGateway } from './streaming-transcription.gateway';

@Module({
  imports: [ConfigModule, BillingModule, JwtModule.register({})],
  controllers: [AiController],
  providers: [AiService, StreamingTranscriptionGateway],
  exports: [AiService, StreamingTranscriptionGateway],
})
export class AiModule {}
