import { IsString, IsOptional, IsUUID, IsArray, ArrayMinSize, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CompetencyItemDto {
  @IsUUID('4', { message: 'Compétence invalide' })
  competencyId: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}

export class UpdateSequenceDto {
  @IsOptional()
  @IsUUID('4', { message: 'Progression invalide' })
  progressionId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsArray({ message: 'Les compétences doivent être un tableau' })
  @ArrayMinSize(1, { message: 'Au moins une compétence est requise' })
  @ValidateNested({ each: true })
  @Type(() => CompetencyItemDto)
  competencies?: CompetencyItemDto[];
}
