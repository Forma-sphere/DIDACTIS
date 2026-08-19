import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateSecurityDto } from './dto/update-security.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Profile ---

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, createdAt: true, updatedAt: true,
        school: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    await this.getProfile(userId);
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
      },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, createdAt: true, updatedAt: true,
        school: { select: { id: true, name: true } },
      },
    });
  }

  // --- Preferences ---

  async getPreferences(userId: string) {
    let pref = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await this.prisma.userPreference.create({
        data: { userId },
      });
    }

    return {
      theme: pref.theme,
      language: pref.language,
      notificationsEnabled: pref.notificationsEnabled,
    };
  }

  async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
    const pref = await this.prisma.userPreference.upsert({
      where: { userId },
      update: {
        theme: dto.theme,
        language: dto.language,
        notificationsEnabled: dto.notificationsEnabled ?? true,
      },
      create: {
        userId,
        theme: dto.theme,
        language: dto.language,
        notificationsEnabled: dto.notificationsEnabled ?? true,
      },
    });

    return {
      theme: pref.theme,
      language: pref.language,
      notificationsEnabled: pref.notificationsEnabled,
    };
  }

  // --- Security ---

  async getSecurity(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, emailVerified: true,
        createdAt: true, updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async updateSecurity(userId: string, dto: UpdateSecurityDto) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Les mots de passe ne correspondent pas');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Mot de passe modifié avec succès' };
  }

  // --- Access ---

  async getAccess(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, isActive: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const permissions = this.getRolePermissions(user.role);

    return {
      role: user.role,
      email: user.email,
      isActive: user.isActive,
      permissions,
    };
  }

  private getRolePermissions(role: string): string[] {
    const base = [
      'Consulter le tableau de bord',
      'Consulter son profil',
      'Modifier ses paramètres',
    ];

    if (role === 'TEACHER') {
      return [
        ...base,
        'Gérer ses préparations',
        'Gérer ses séquences',
        'Gérer ses progressions',
        'Gérer son cahier-journal',
        'Gérer ses évaluations',
        'Gérer ses ressources',
        'Utiliser l\'assistant IA',
      ];
    }

    if (role === 'DIRECTOR') {
      return [
        ...base,
        'Accéder au module Direction',
        'Gérer les réunions',
        'Gérer les projets',
        'Consulter les indicateurs',
        'Gérer les classes de l\'école',
        'Consulter les élèves',
      ];
    }

    if (role === 'ADMIN') {
      return [
        ...base,
        'Accès complet à toutes les fonctionnalités',
        'Gérer les utilisateurs',
        'Gérer les écoles',
        'Gérer les compétences',
        'Accéder au module Direction',
        'Supprimer des conversations IA',
        'Supprimer des documents',
      ];
    }

    return base;
  }
}
