import { Controller, Get, UseGuards } from '@nestjs/common';
import { BriefingsService } from './briefings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('briefings')
export class BriefingsController {
  constructor(private readonly briefingsService: BriefingsService) {}

  @Get('today')
  async getTodayBriefing(@CurrentUser('id') userId: string) {
    return this.briefingsService.getTodayBriefing(userId);
  }
}
