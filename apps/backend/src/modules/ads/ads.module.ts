import { Module } from '@nestjs/common';
import { AdsService } from './ads.service';
import { AdsController, AdminAdsController } from './ads.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdsController, AdminAdsController],
  providers: [AdsService],
  exports: [AdsService],
})
export class AdsModule {}
