import { IsString, IsNotEmpty, IsOptional, IsUUID, IsArray, ArrayMinSize, ValidateNested, IsInt, Min, Matches } from 'class-validator';
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

export class UpdateJournalDayDto {
  @IsOptional()
  @IsUUID('4', { message: 'Classe invalide' })
  classId?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray({ message: 'Les préparations doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins une préparation est requise' })
  @ValidateNested({ each: true })
  @Type(() => JournalLessonItemDto)
  lessons?: JournalLessonItemDto[];
}
