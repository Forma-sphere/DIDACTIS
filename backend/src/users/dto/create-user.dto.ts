import { IsEmail, IsNotEmpty, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Le prénom est requis' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Le nom est requis' })
  @IsString()
  lastName: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(Role, { message: 'Le rôle est requis' })
  role: Role;

  @IsUUID('4', { message: 'L\'école est requise' })
  schoolId: string;
}
