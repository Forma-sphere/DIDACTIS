import { IsString, IsOptional, IsUUID, IsArray, ArrayMinSize, IsInt, Min } from 'class-validator';

export class UpdateLessonDto {
  @IsOptional()
  @IsUUID('4', { message: 'Séquence invalide' })
  sequenceId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Classe invalide' })
  classId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt({ message: 'La durée doit être un nombre entier' })
  @Min(1, { message: 'La durée doit être supérieure à 0' })
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray({ message: 'Les compétences doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @IsUUID('4', { each: true, message: 'Compétence invalide' })
  competencyIds?: string[];
}
