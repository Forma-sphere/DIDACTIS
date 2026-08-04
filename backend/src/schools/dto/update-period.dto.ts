import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class UpdatePeriodDto {
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
  @IsInt({ message: 'L\'ordre doit être un nombre entier' })
  @Min(1, { message: 'L\'ordre doit être supérieur à 0' })
  order?: number;
}
