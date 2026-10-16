import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CloudSyncService } from './cloud-sync.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncPullDto, SyncPushDto } from './dto/cloud-sync.dto';

@UseGuards(JwtAuthGuard)
@Controller('notes/sync')
export class CloudSyncController {
  constructor(private readonly syncService: CloudSyncService) {}

  @Get('status')
  async getStatus(@CurrentUser('id') userId: string) {
    return this.syncService.getStatus(userId);
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  async enableSync(@CurrentUser('id') userId: string) {
    return this.syncService.enableSync(userId);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  async disableSync(@CurrentUser('id') userId: string) {
    return this.syncService.disableSync(userId);
  }

  @Post('delete-cloud-data')
  @HttpCode(HttpStatus.OK)
  async deleteCloudData(@CurrentUser('id') userId: string) {
    return this.syncService.deleteCloudData(userId);
  }

  @Post('pull')
  @HttpCode(HttpStatus.OK)
  async pullChanges(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncPullDto,
  ) {
    return this.syncService.pullChanges(userId, dto);
  }

  @Post('push')
  @HttpCode(HttpStatus.OK)
  async pushChanges(
    @CurrentUser('id') userId: string,
    @Body() dto: SyncPushDto,
  ) {
    return this.syncService.pushChanges(userId, dto);
  }

  @Get('devices')
  async listDevices(@CurrentUser('id') userId: string) {
    return this.syncService.listDevices(userId);
  }

  @Delete('devices/:id')
  async revokeDevice(
    @CurrentUser('id') userId: string,
    @Param('id') deviceId: string,
  ) {
    return this.syncService.revokeDevice(userId, deviceId);
  }
}
