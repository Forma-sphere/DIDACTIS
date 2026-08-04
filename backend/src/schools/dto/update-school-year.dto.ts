import { IsString, IsOptional, IsDateString, IsBoolean } from 'class-validator';

export class UpdateSchoolYearDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de début invalide' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
