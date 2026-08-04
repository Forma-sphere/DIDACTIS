import { IsString, IsOptional, IsEmail, IsEnum, IsNotEmpty } from 'class-validator';
import { SchoolType } from '@prisma/client';

export class CreateSchoolDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email?: string;

  @IsOptional()
  @IsString()
  uaiCode?: string;

  @IsOptional()
  @IsEnum(SchoolType, { message: 'Type d\'école invalide' })
  type?: SchoolType;
}
