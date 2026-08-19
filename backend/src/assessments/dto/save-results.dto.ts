import { IsArray, ValidateNested, IsUUID, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { AssessmentStatus } from '@prisma/client';

export class ResultItemDto {
  @IsUUID('4', { message: "L'élève est requis" })
  studentId: string;

  @IsUUID('4', { message: 'La compétence est requise' })
  competencyId: string;

  @IsEnum(AssessmentStatus, { message: 'Statut invalide' })
  status: AssessmentStatus;

  @IsOptional()
  @IsString()
  comment?: string;
}

export class SaveResultsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultItemDto)
  results: ResultItemDto[];
}
