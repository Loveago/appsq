import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Backend Health Check and System Status' })
  @ApiResponse({ status: 200, description: 'Mindora API is running healthy' })
  getHealth() {
    return {
      status: 'ok',
      service: 'Mindora AI Second Brain API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      docs: '/api/docs',
    };
  }

  @Get('health/db')
  @ApiOperation({ summary: 'Database Connectivity & Diagnostics' })
  async getDbHealth() {
    const rawUrl = process.env.DATABASE_URL || '';
    const hasDbUrl = Boolean(rawUrl);
    const masked = rawUrl.replace(/:([^:@]+)@/, ':***@');
    try {
      const tables: any = await this.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
      let userCount = -1;
      let userError: string | null = null;
      try {
        userCount = await this.prisma.user.count();
      } catch (e: any) {
        userError = e.message || String(e);
      }
      return {
        status: 'CONNECTED',
        hasDbUrl,
        dbUrl: masked,
        tables,
        userCount,
        userError,
      };
    } catch (err: any) {
      return {
        status: 'DISCONNECTED',
        hasDbUrl,
        dbUrl: masked,
        error: err.message || String(err),
      };
    }
  }
}
