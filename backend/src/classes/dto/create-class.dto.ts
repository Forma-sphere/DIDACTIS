import { IsString, IsNotEmpty, IsUUID, IsEnum, IsInt, Min, IsOptional } from 'class-validator';
import { Level, Cycle } from '@prisma/client';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsUUID('4', { message: 'L\'école est requise' })
  schoolId: string;

  @IsUUID('4', { message: 'L\'année scolaire est requise' })
  schoolYearId: string;

  @IsUUID('4', { message: 'L\'enseignant est requis' })
  teacherId: string;

  @IsEnum(Level, { message: 'Le niveau est requis' })
  level: Level;

  @IsEnum(Cycle, { message: 'Le cycle est requis' })
  cycle: Cycle;

  @IsOptional()
  @IsInt({ message: 'La capacité doit être un nombre entier' })
  @Min(1, { message: 'La capacité doit être supérieure à 0' })
  capacity?: number;
}
