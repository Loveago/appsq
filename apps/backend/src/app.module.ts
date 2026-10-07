import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { NotesModule } from './modules/notes/notes.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AiModule } from './modules/ai/ai.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { BriefingsModule } from './modules/briefings/briefings.module';
import { BillingModule } from './modules/billing/billing.module';
import { AdminModule } from './modules/admin/admin.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    NotesModule,
    TasksModule,
    ProjectsModule,
    AiModule,
    MeetingsModule,
    BriefingsModule,
    BillingModule,
    AdminModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
