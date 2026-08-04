import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly frontendUrl: string;

  constructor(config: ConfigService) {
    this.frontendUrl = config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  async sendVerificationEmail(email: string, token: string) {
    const url = `${this.frontendUrl}/verify-email?token=${token}`;
    this.logger.log(`[DEV] Verification email → ${email}: ${url}`);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = `${this.frontendUrl}/reset-password?token=${token}`;
    this.logger.log(`[DEV] Password reset email → ${email}: ${url}`);
  }
}
