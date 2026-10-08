import { Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from './database/prisma.service';
import { SCHEMA_SQL } from './database/schema-ddl';
import * as bcrypt from 'bcryptjs';

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

  @Get('health/migrate')
  @Post('health/migrate')
  @ApiOperation({ summary: 'Execute Schema Migration DDL and Seed Defaults' })
  async migrateDb() {
    const results: Array<{ step: string; status: string; error?: string }> = [];

    // Split SQL by statement
    const rawStatements = SCHEMA_SQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (let i = 0; i < rawStatements.length; i++) {
      let stmt = rawStatements[i];
      try {
        await this.prisma.$executeRawUnsafe(stmt);
        results.push({ step: `stmt_${i + 1}`, status: 'OK' });
      } catch (err: any) {
        // If vector extension fails or vector type fails, retry with text embedding
        if (stmt.includes('vector(1536)')) {
          try {
            const fallbackStmt = stmt.replace('"embedding" vector(1536)', '"embedding" TEXT');
            await this.prisma.$executeRawUnsafe(fallbackStmt);
            results.push({ step: `stmt_${i + 1}`, status: 'OK_FALLBACK' });
            continue;
          } catch (inner: any) {
            results.push({ step: `stmt_${i + 1}`, status: 'ERROR', error: inner.message });
            continue;
          }
        }
        // If already exists, ignore
        if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
          results.push({ step: `stmt_${i + 1}`, status: 'SKIPPED_EXISTS' });
        } else {
          results.push({ step: `stmt_${i + 1}`, status: 'WARN', error: err.message });
        }
      }
    }

    // Seed default Admin User if none exists
    let adminCreated = false;
    try {
      const existingAdmin = await this.prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('AdminPassword123!', 10);
        await this.prisma.user.create({
          data: {
            email: 'admin@mindora.ai',
            fullName: 'Executive Administrator',
            passwordHash,
            role: 'ADMIN',
            plan: 'PRO',
            subscriptionTier: 'PRO',
            accountStatus: 'ACTIVE',
            emailVerified: true,
          },
        });
        adminCreated = true;
      }
    } catch (e: any) {
      results.push({ step: 'seed_admin', status: 'ERROR', error: e.message });
    }

    // Verify created tables
    let currentTables: any = [];
    try {
      currentTables = await this.prisma.$queryRaw`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `;
    } catch (_) {}

    return {
      status: 'MIGRATION_COMPLETED',
      adminCreated,
      totalStatements: rawStatements.length,
      currentTables,
      summary: results.filter((r) => r.status === 'ERROR' || r.status === 'WARN').slice(0, 5),
    };
  }
}
