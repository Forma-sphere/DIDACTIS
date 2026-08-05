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

export class CreateSequenceDto {
  @IsUUID('4', { message: 'La progression est requise' })
  progressionId: string;

  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt({ message: "L'ordre est requis" })
  @Min(0)
  order: number;

  @IsArray({ message: 'Au moins une compétence est requise' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @ValidateNested({ each: true })
  @Type(() => CompetencyItemDto)
  competencies: CompetencyItemDto[];
}
