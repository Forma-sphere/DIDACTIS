import { IsString, IsOptional, IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { Level, Cycle } from '@prisma/client';

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsUUID('4', { message: 'École invalide' })
  schoolId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Année scolaire invalide' })
  schoolYearId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Enseignant invalide' })
  teacherId?: string;

  @IsOptional()
  @IsEnum(Level, { message: 'Niveau invalide' })
  level?: Level;

  @IsOptional()
  @IsEnum(Cycle, { message: 'Cycle invalide' })
  cycle?: Cycle;

  @IsOptional()
  @IsInt({ message: 'La capacité doit être un nombre entier' })
  @Min(1, { message: 'La capacité doit être supérieure à 0' })
  capacity?: number;
}
