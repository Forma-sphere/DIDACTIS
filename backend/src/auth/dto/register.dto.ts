import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  password: string;

  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
