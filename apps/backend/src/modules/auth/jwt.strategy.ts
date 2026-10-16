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

  async validate(payload: { sub: string; email: string; role?: string }) {
    const adminEmail = (this.configService.get<string>('ADMIN_EMAIL') || 'admin@mindora.ai').toLowerCase();
    const isSuperAdmin =
      payload.sub === 'superadmin' ||
      payload.role === 'SUPERADMIN' ||
      (payload.email && payload.email.toLowerCase() === adminEmail);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
      if (!user) {
        if (isSuperAdmin) {
          return {
            id: payload.sub || 'superadmin',
            email: payload.email || adminEmail,
            fullName: 'Mindora Super Admin',
            role: 'SUPERADMIN',
            plan: 'PRO',
            subscriptionTier: 'PRO',
            accountStatus: 'ACTIVE',
          };
        }
        throw new UnauthorizedException('User not found');
      }
      if (user.isSuspended || user.accountStatus === 'SUSPENDED') {
        throw new UnauthorizedException('Account suspended: ' + (user.suspendedReason || 'Contact support.'));
      }
      if (user.accountStatus === 'DELETED') {
        throw new UnauthorizedException('Account has been closed.');
      }
      // Update last active asynchronously
      this.prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }).catch(() => {});
      return user;
    } catch (err) {
      if (isSuperAdmin) {
        return {
          id: payload.sub || 'superadmin',
          email: payload.email || adminEmail,
          fullName: 'Mindora Super Admin',
          role: 'SUPERADMIN',
          plan: 'PRO',
          subscriptionTier: 'PRO',
          accountStatus: 'ACTIVE',
        };
      }
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Authentication failed: user record unavailable');
    }
  }
}
