import { IsString, IsNotEmpty, IsDateString, IsOptional, IsBoolean } from 'class-validator';

export class CreateSchoolYearDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsDateString({}, { message: 'Date de début invalide' })
  startDate: string;

  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate: string;

  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
