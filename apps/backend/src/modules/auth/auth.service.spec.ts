import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

import { BillingService } from '../billing/billing.service';
import { EmailService } from './email.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('15m'),
  };

  const mockBillingService = {
    canTranscribe: jest.fn().mockResolvedValue({ allowed: true }),
    recordTranscriptionUsage: jest.fn().mockResolvedValue(true),
    canUseAiTokens: jest.fn().mockResolvedValue({ allowed: true }),
    recordAiTokensUsage: jest.fn().mockResolvedValue(true),
    getUserEntitlements: jest.fn().mockResolvedValue({ plan: 'FREE', subscriptionTier: 'FREE' }),
  };

  const mockEmailService = {
    createOtp: jest.fn().mockReturnValue('123456'),
    validateOtp: jest.fn().mockReturnValue(true),
    sendPasswordResetOtpEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BillingService, useValue: mockBillingService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate access and refresh tokens', () => {
    const tokens = service.generateTokens('user-1', 'test@vynotes.ai', 'USER');
    expect(tokens.accessToken).toBe('mock-jwt-token');
    expect(tokens.refreshToken).toBe('mock-jwt-token');
  });

  it('should authenticate and create new user on googleLogin', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
    mockPrismaService.user.create.mockResolvedValueOnce({
      id: 'g-user-1',
      email: 'alex@vynotes.ai',
      fullName: 'Alex Google',
      avatarUrl: 'https://avatar.url',
      role: 'USER',
      plan: 'FREE',
      subscriptionTier: 'FREE',
      accountStatus: 'ACTIVE',
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });

    const result = await service.googleLogin({
      email: 'alex@vynotes.ai',
      fullName: 'Alex Google',
      avatarUrl: 'https://avatar.url',
    });

    expect(result.user.email).toBe('alex@vynotes.ai');
    expect(result.accessToken).toBe('mock-jwt-token');
    expect(mockPrismaService.user.create).toHaveBeenCalled();
  });

  it('should trigger forgotPassword email when user exists', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'u-1',
      email: 'alex@vynotes.ai',
      fullName: 'Alex User',
      accountStatus: 'ACTIVE',
    });

    const res = await service.forgotPassword('alex@vynotes.ai');
    expect(res.success).toBe(true);
    expect(mockEmailService.createOtp).toHaveBeenCalledWith('alex@vynotes.ai');
    expect(mockEmailService.sendPasswordResetOtpEmail).toHaveBeenCalledWith(
      'alex@vynotes.ai',
      '123456',
      'Alex User',
    );
  });

  it('should reset password with verified code', async () => {
    mockPrismaService.user.findUnique.mockResolvedValueOnce({
      id: 'u-1',
      email: 'alex@vynotes.ai',
    });
    mockPrismaService.user.update.mockResolvedValueOnce({ id: 'u-1' });

    const res = await service.resetPassword('alex@vynotes.ai', '123456', 'NewPassword123!');
    expect(res.success).toBe(true);
    expect(mockEmailService.validateOtp).toHaveBeenCalledWith('alex@vynotes.ai', '123456');
    expect(mockPrismaService.user.update).toHaveBeenCalled();
  });
});
