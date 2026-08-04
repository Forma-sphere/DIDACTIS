import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const emailVerificationToken = randomBytes(32).toString('hex');

    const user = await this.usersService.create({
      ...dto,
      password: hashedPassword,
      emailVerificationToken,
    });

    await this.mailService.sendVerificationEmail(user.email, emailVerificationToken);

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = await this.createRefreshToken(user.id);

    return { user: this.sanitize(user), accessToken, refreshToken };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = await this.createRefreshToken(user.id);

    return { user: this.sanitize(user), accessToken, refreshToken };
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.sanitize(user);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: { emailVerificationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token de vérification invalide');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerificationToken: null },
    });

    return { message: 'Adresse e-mail vérifiée avec succès' };
  }

  async resendVerification(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) {
      throw new BadRequestException('Adresse e-mail déjà vérifiée');
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerificationToken: token },
    });

    await this.mailService.sendVerificationEmail(user.email, token);
    return { message: 'E-mail de vérification envoyé' };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      return { message: 'Si un compte existe, un e-mail a été envoyé' };
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    await this.mailService.sendPasswordResetEmail(user.email, token);
    return { message: 'Si un compte existe, un e-mail a été envoyé' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpires: { gte: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  async refresh(dto: RefreshTokenDto) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Session expirée, veuillez vous reconnecter');
    }

    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = this.generateAccessToken(stored.user.id, stored.user.role);
    const refreshToken = await this.createRefreshToken(stored.user.id);

    return { accessToken, refreshToken, user: this.sanitize(stored.user) };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    return { message: 'Déconnexion réussie' };
  }

  private generateAccessToken(userId: string, role: string) {
    return this.jwtService.sign({ sub: userId, role });
  }

  private async createRefreshToken(userId: string): Promise<string> {
    const token = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600000); // 30 days

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  private sanitize(user: any) {
    const { password, emailVerificationToken, passwordResetToken, passwordResetExpires, ...result } = user;
    return result;
  }
}
