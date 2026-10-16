import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BillingModule } from '../billing/billing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { CloudSyncModule } from '../sync/cloud-sync.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [BillingModule, NotificationsModule, AuthModule, CloudSyncModule, AiModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
