import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, ArrayMinSize, IsDateString } from 'class-validator';

export class CreateAssessmentDto {
  @IsUUID('4', { message: 'La classe est requise' })
  classId: string;

  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString({}, { message: 'La date est requise' })
  date: string;

  @IsArray({ message: 'Au moins une compétence est requise' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @IsUUID('4', { each: true, message: 'Compétence invalide' })
  competencyIds: string[];
}
