import { Module } from '@nestjs/common';
import { BriefingsService } from './briefings.service';
import { BriefingsController } from './briefings.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [BriefingsController],
  providers: [BriefingsService],
  exports: [BriefingsService],
})
export class BriefingsModule {}
