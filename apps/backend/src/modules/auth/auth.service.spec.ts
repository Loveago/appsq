import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';

import { BillingService } from '../billing/billing.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate access and refresh tokens', () => {
    const tokens = service.generateTokens('user-1', 'test@mindora.ai', 'USER');
    expect(tokens.accessToken).toBe('mock-jwt-token');
    expect(tokens.refreshToken).toBe('mock-jwt-token');
  });
});
