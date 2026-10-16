import { Module } from '@nestjs/common';
import { CloudSyncController } from './cloud-sync.controller';
import { CloudSyncService } from './cloud-sync.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CloudSyncController],
  providers: [CloudSyncService],
  exports: [CloudSyncService],
})
export class CloudSyncModule {}
