import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, ArrayMinSize, IsInt, Min } from 'class-validator';

export class CreateLessonDto {
  @IsUUID('4', { message: 'La séquence est requise' })
  sequenceId: string;

  @IsUUID('4', { message: 'La classe est requise' })
  classId: string;

  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: "L'objectif est requis" })
  objective: string;

  @IsString()
  @IsNotEmpty({ message: 'Le déroulement est requis' })
  content: string;

  @IsInt({ message: 'La durée est requise' })
  @Min(1, { message: 'La durée doit être supérieure à 0' })
  duration: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsArray({ message: 'Au moins une compétence est requise' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @IsUUID('4', { each: true, message: 'Compétence invalide' })
  competencyIds: string[];
}
