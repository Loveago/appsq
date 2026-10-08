import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly billingService: BillingService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  async seedDefaultAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@mindora.ai';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@Mindora2026!';
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: adminEmail },
      });
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      if (!existing) {
        await this.prisma.user.create({
          data: {
            email: adminEmail,
            passwordHash,
            fullName: 'Mindora Super Admin',
            role: 'SUPERADMIN',
            plan: 'PRO',
            subscriptionTier: 'PRO',
            accountStatus: 'ACTIVE',
            emailVerified: true,
          },
        });
        this.logger.log(`Created default Super Admin user: ${adminEmail}`);
      } else if (existing.role !== 'SUPERADMIN' && existing.role !== 'ADMIN') {
        await this.prisma.user.update({
          where: { email: adminEmail },
          data: {
            role: 'SUPERADMIN',
            plan: 'PRO',
            subscriptionTier: 'PRO',
            accountStatus: 'ACTIVE',
          },
        });
        this.logger.log(`Promoted user ${adminEmail} to SUPERADMIN`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed default admin: ${err.message}`);
    }
  }

  /**
   * Authoritative user registration against Postgres.
   * Zero mock users.
   */
  async register(email: string, password: string, fullName?: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new BadRequestException('Please provide a valid email address');
    }

    if (password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash,
        fullName: fullName?.trim() || 'Mindora User',
        plan: 'FREE',
        subscriptionTier: 'FREE',
        accountStatus: 'ACTIVE',
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        plan: true,
        subscriptionTier: true,
        accountStatus: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    const tokens = this.generateTokens(user.id, user.email, user.role);
    const entitlements = await this.billingService.getUserEntitlements(user.id);
    return { user, ...tokens, entitlements };
  }

  /**
   * Authoritative database login.
   * Zero mock fallbacks.
   */
  async login(email: string, password: string) {
    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isSuspended || user.accountStatus === 'SUSPENDED') {
      throw new UnauthorizedException(
        `Account suspended: ${user.suspendedReason || 'Contact support.'}`,
      );
    }

    if (user.accountStatus === 'DELETED') {
      throw new UnauthorizedException('This account has been closed.');
    }

    await this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date(), lastActiveAt: new Date() },
      })
      .catch(() => {});

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      plan: user.plan,
      subscriptionTier: user.subscriptionTier,
      accountStatus: user.accountStatus || 'ACTIVE',
      createdAt: user.createdAt,
      lastLoginAt: new Date(),
    };

    const tokens = this.generateTokens(user.id, user.email, user.role);
    const entitlements = await this.billingService.getUserEntitlements(user.id);

    return { user: safeUser, ...tokens, entitlements };
  }

  async guestLogin(deviceId?: string) {
    const id = deviceId
      ? `guest_${deviceId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`
      : `guest_${Date.now()}`;
    const email = `${id}@guest.mindora.ai`;

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          fullName: 'Guest Executive',
          role: 'USER',
          plan: 'FREE',
          subscriptionTier: 'FREE',
          accountStatus: 'ACTIVE',
        },
      });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      plan: user.plan,
      subscriptionTier: user.subscriptionTier,
      accountStatus: user.accountStatus || 'ACTIVE',
      createdAt: user.createdAt,
    };

    const tokens = this.generateTokens(user.id, user.email, user.role);
    const entitlements = await this.billingService.getUserEntitlements(user.id);
    return { user: safeUser, ...tokens, entitlements };
  }

  /**
   * Get user profile + full entitlements
   */
  async getProfile(userId: string) {
    const entitlements = await this.billingService.getUserEntitlements(userId);
    return {
      user: entitlements.user,
      entitlements,
    };
  }

  /**
   * Update Profile (Name, Avatar, Timezone, Locale)
   */
  async updateProfile(
    userId: string,
    data: {
      fullName?: string;
      avatarUrl?: string;
      timezone?: string;
      locale?: string;
    },
  ) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName !== undefined ? data.fullName.trim() : undefined,
        avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : undefined,
        timezone: data.timezone !== undefined ? data.timezone : undefined,
        locale: data.locale !== undefined ? data.locale : undefined,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        plan: true,
        accountStatus: true,
        timezone: true,
        locale: true,
        createdAt: true,
      },
    });

    const entitlements = await this.billingService.getUserEntitlements(userId);
    return { user: updated, entitlements };
  }

  /**
   * Change Email with password check and uniqueness verification
   */
  async changeEmail(
    userId: string,
    newEmail: string,
    currentPassword?: string,
  ) {
    if (!newEmail || !newEmail.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    const cleanEmail = newEmail.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Current password required to change email');
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Current password does not match');
      }
    }

    const inUse = await this.prisma.user.findUnique({
      where: { email: cleanEmail },
    });
    if (inUse && inUse.id !== userId) {
      throw new BadRequestException('Email is already registered to another account');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: cleanEmail,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        plan: true,
        accountStatus: true,
        createdAt: true,
      },
    });

    const tokens = this.generateTokens(updated.id, updated.email, updated.role);
    const entitlements = await this.billingService.getUserEntitlements(userId);
    return { user: updated, ...tokens, entitlements };
  }

  /**
   * Change Password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    if (!newPassword || newPassword.length < 6) {
      throw new BadRequestException(
        'New password must be at least 6 characters long',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.passwordHash) {
      if (!currentPassword) {
        throw new BadRequestException('Current password is required');
      }
      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Current password does not match');
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        lastActiveAt: new Date(),
      },
    });

    return { success: true, message: 'Password updated successfully' };
  }

  /**
   * Delete Account (soft delete / deactivation with retention cleanup)
   */
  async deleteAccount(userId: string, password?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.passwordHash && password) {
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException('Password does not match');
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'DELETED',
        isSuspended: true,
        suspendedReason: 'Account closed by user',
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
      message: 'Account successfully closed and deactivated',
    };
  }

  generateTokens(userId: string, email: string, role: string) {
    const payload = { sub: userId, email, role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRATION') || '30d',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION') || '90d',
    });
    return { accessToken, refreshToken };
  }
}
