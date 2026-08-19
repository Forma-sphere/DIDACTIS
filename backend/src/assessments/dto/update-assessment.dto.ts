import { IsString, IsOptional, IsUUID, IsArray, ArrayMinSize, IsDateString } from 'class-validator';

export class UpdateAssessmentDto {
  @IsOptional()
  @IsUUID('4', { message: 'Classe invalide' })
  classId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date invalide' })
  date?: string;

  @IsOptional()
  @IsArray({ message: 'Les compétences doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @IsUUID('4', { each: true, message: 'Compétence invalide' })
  competencyIds?: string[];
}
