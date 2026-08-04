import { IsString, IsNotEmpty, IsDateString, IsInt, Min } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsDateString({}, { message: 'Date de début invalide' })
  startDate: string;

  @IsDateString({}, { message: 'Date de fin invalide' })
  endDate: string;

  @IsInt({ message: 'L\'ordre doit être un nombre entier' })
  @Min(1, { message: 'L\'ordre doit être supérieur à 0' })
  order: number;
}
