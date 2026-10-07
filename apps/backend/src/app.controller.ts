import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
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
}
