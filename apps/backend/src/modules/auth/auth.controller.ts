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

  @Post('google')
  async googleLogin(
    @Body('idToken') idToken?: string,
    @Body('email') email?: string,
    @Body('fullName') fullName?: string,
    @Body('avatarUrl') avatarUrl?: string,
  ) {
    return this.authService.googleLogin({ idToken, email: email || '', fullName, avatarUrl });
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body('code') code: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(email, code, newPassword);
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
