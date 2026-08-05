import { IsString, IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpdateStudentDto {
  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de naissance invalide' })
  birthDate?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Sexe invalide' })
  gender?: Gender;

  @IsOptional()
  @IsUUID('4', { message: 'École invalide' })
  schoolId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Classe invalide' })
  classId?: string;
}
