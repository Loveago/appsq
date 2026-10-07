import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'super_secret_mindora_jwt_key_2026',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      if (user.isSuspended) {
        throw new UnauthorizedException('Account suspended: ' + (user.suspendedReason || 'Contact support.'));
      }
      // Update last active asynchronously
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }).catch(() => {});
      return user;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      // In offline / mock dev mode, return fallback mock user
      return {
        id: payload.sub,
        email: payload.email,
        role: 'USER',
        subscriptionTier: 'FREE',
      };
    }
  }
}
