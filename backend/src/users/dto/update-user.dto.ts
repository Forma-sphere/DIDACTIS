import { IsEmail, IsOptional, IsEnum, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(Role, { message: 'Rôle invalide' })
  role?: Role;

  @IsOptional()
  @IsUUID('4', { message: 'École invalide' })
  schoolId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
