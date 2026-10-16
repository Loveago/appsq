import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface BrevoConfig {
  isEnabled: boolean;
  apiKey: string;
  senderEmail: string;
  senderName: string;
}

export const DEFAULT_BREVO_CONFIG: BrevoConfig = {
  isEnabled: false,
  apiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@vynotes.ai',
  senderName: process.env.BREVO_SENDER_NAME || 'VyNotes Security',
};

interface OtpEntry {
  code: string;
  expiresAt: number;
  attempts: number;
}

const SETTING_KEY = 'brevo_config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly otpCache = new Map<string, OtpEntry>();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loads Brevo configuration from database SystemSetting or defaults
   */
  async getConfig(): Promise<BrevoConfig> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: SETTING_KEY },
      });

      if (!setting || !setting.value) {
        return { ...DEFAULT_BREVO_CONFIG };
      }

      const val = setting.value as any;
      return {
        isEnabled: val.isEnabled ?? DEFAULT_BREVO_CONFIG.isEnabled,
        apiKey: val.apiKey || DEFAULT_BREVO_CONFIG.apiKey,
        senderEmail: val.senderEmail || DEFAULT_BREVO_CONFIG.senderEmail,
        senderName: val.senderName || DEFAULT_BREVO_CONFIG.senderName,
      };
    } catch (err) {
      this.logger.warn(`Could not load brevo_config: ${err.message}`);
      return { ...DEFAULT_BREVO_CONFIG };
    }
  }

  /**
   * Admin: Update Brevo configuration
   */
  async updateConfig(admin: any, dto: Partial<BrevoConfig>) {
    const current = await this.getConfig();
    const updated: BrevoConfig = {
      ...current,
      ...dto,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: SETTING_KEY },
      update: { value: updated as any, description: 'Brevo transactional email configuration for password resets' },
      create: { key: SETTING_KEY, value: updated as any, description: 'Brevo transactional email configuration for password resets' },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId: admin?.id || 'system',
        adminEmail: admin?.email || 'admin@vynotes.ai',
        action: 'UPDATE_BREVO_EMAIL_CONFIG',
        targetType: 'SETTING',
        targetId: SETTING_KEY,
        details: { isEnabled: updated.isEnabled, senderEmail: updated.senderEmail } as any,
      },
    }).catch(() => {});

    return {
      success: true,
      config: {
        isEnabled: updated.isEnabled,
        senderEmail: updated.senderEmail,
        senderName: updated.senderName,
        apiKeyMasked: updated.apiKey ? `${updated.apiKey.slice(0, 8)}...${updated.apiKey.slice(-4)}` : '',
      },
    };
  }

  /**
   * Generates a 6-digit numeric OTP and caches it for 15 minutes
   */
  createOtp(email: string): string {
    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    this.otpCache.set(cleanEmail, {
      code,
      expiresAt,
      attempts: 0,
    });

    return code;
  }

  /**
   * Validates submitted OTP code
   */
  validateOtp(email: string, code: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const entry = this.otpCache.get(cleanEmail);

    if (!entry) {
      throw new BadRequestException('No password reset requested for this email, or code has expired.');
    }

    if (Date.now() > entry.expiresAt) {
      this.otpCache.delete(cleanEmail);
      throw new BadRequestException('Verification code has expired. Please request a new one.');
    }

    entry.attempts++;
    if (entry.attempts > 5) {
      this.otpCache.delete(cleanEmail);
      throw new BadRequestException('Too many incorrect attempts. Please request a new code.');
    }

    if (entry.code !== code.trim()) {
      throw new BadRequestException('Invalid verification code.');
    }

    // Success - consume OTP
    this.otpCache.delete(cleanEmail);
    return true;
  }

  /**
   * Sends transactional email via Brevo API
   */
  async sendEmail(toEmail: string, subject: string, htmlContent: string): Promise<boolean> {
    const config = await this.getConfig();

    if (!config.isEnabled || !config.apiKey) {
      this.logger.warn(`Brevo email is not configured or disabled. Suppressing outbound email to ${toEmail}`);
      return false;
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'api-key': config.apiKey.trim(),
        },
        body: JSON.stringify({
          sender: {
            name: config.senderName || 'VyNotes Security',
            email: config.senderEmail || 'noreply@vynotes.ai',
          },
          to: [{ email: toEmail.trim() }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo API returned error status ${response.status}: ${errorText}`);
        return false;
      }

      this.logger.log(`Brevo transactional email sent successfully to ${toEmail}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email via Brevo: ${err.message}`);
      return false;
    }
  }

  /**
   * Sends a styled Password Reset OTP email
   */
  async sendPasswordResetOtpEmail(toEmail: string, otp: string, userName?: string): Promise<boolean> {
    const displayName = userName || 'VyNotes User';
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Reset Your VyNotes Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d13; color: #e2e8f0; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #131722; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { font-size: 20px; font-weight: 800; letter-spacing: 2px; color: #a855f7; margin-bottom: 24px; text-transform: uppercase; }
    .heading { font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
    .text { font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }
    .code-container { background: #1e1b4b; border: 1px solid #6366f1; border-radius: 12px; padding: 18px; text-align: center; margin-bottom: 24px; }
    .otp-code { font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c084fc; }
    .footer { font-size: 11px; color: #64748b; line-height: 1.5; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 20px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">⚡ VyNotes</div>
    <div class="heading">Password Reset Verification</div>
    <p class="text">Hello ${displayName},</p>
    <p class="text">We received a request to reset your password. Use the verification code below to authorize this change:</p>
    <div class="code-container">
      <div class="otp-code">${otp}</div>
    </div>
    <p class="text" style="font-size: 12px; color: #cbd5e1;">This code is valid for <strong>15 minutes</strong>. If you did not make this request, you can safely disregard this email.</p>
    <div class="footer">
      VyNotes • Your AI Second Brain Platform<br>
      Automated Security Notification
    </div>
  </div>
</body>
</html>
    `;

    return this.sendEmail(toEmail, 'Reset your VyNotes password', html);
  }
}
