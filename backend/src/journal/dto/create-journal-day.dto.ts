import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, ArrayMinSize, ValidateNested, IsInt, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class JournalLessonItemDto {
  @IsUUID('4', { message: 'Préparation invalide' })
  lessonId: string;

  @IsString()
  @IsNotEmpty({ message: "L'heure de début est requise" })
  @Matches(/^\d{2}:\d{2}$/, { message: "Format d'heure invalide (HH:MM)" })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: "L'heure de fin est requise" })
  @Matches(/^\d{2}:\d{2}$/, { message: "Format d'heure invalide (HH:MM)" })
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateJournalDayDto {
  @IsUUID('4', { message: 'La classe est requise' })
  classId: string;

  @IsString()
  @IsNotEmpty({ message: 'La date est requise' })
  date: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray({ message: 'Au moins une préparation est requise' })
  @ArrayMinSize(1, { message: 'Au moins une préparation est requise' })
  @ValidateNested({ each: true })
  @Type(() => JournalLessonItemDto)
  lessons: JournalLessonItemDto[];
}
