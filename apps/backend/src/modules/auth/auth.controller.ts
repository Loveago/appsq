import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('fullName') fullName?: string,
  ) {
    return this.authService.register(email, password, fullName);
  }

  @Post('login')
  async login(
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    return this.authService.login(email, password);
  }

  @Post('guest')
  async guestLogin(@Body('deviceId') deviceId?: string) {
    return this.authService.guestLogin(deviceId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/entitlements')
  async getEntitlements(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body()
    body: {
      fullName?: string;
      avatarUrl?: string;
      timezone?: string;
      locale?: string;
    },
  ) {
    return this.authService.updateProfile(userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/email')
  async changeEmail(
    @CurrentUser('id') userId: string,
    @Body('newEmail') newEmail: string,
    @Body('currentPassword') currentPassword?: string,
  ) {
    return this.authService.changeEmail(userId, newEmail, currentPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/password')
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body('currentPassword') currentPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  async deleteAccount(
    @CurrentUser('id') userId: string,
    @Body('password') password?: string,
  ) {
    return this.authService.deleteAccount(userId, password);
  }
}
