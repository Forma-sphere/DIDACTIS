import { IsString, IsNotEmpty, IsUUID, IsOptional, IsArray, ArrayMinSize, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompetencyItemDto {
  @IsUUID('4', { message: 'Compétence invalide' })
  competencyId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class CreateProgressionDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID('4', { message: "L'école est requise" })
  schoolId: string;

  @IsUUID('4', { message: 'La classe est requise' })
  classId: string;

  @IsUUID('4', { message: "L'année scolaire est requise" })
  schoolYearId: string;

  @IsArray({ message: 'Au moins une compétence est requise' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @ValidateNested({ each: true })
  @Type(() => CompetencyItemDto)
  competencies: CompetencyItemDto[];
}
