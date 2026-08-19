import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCompetencyDto {
  @IsString()
  @IsNotEmpty({ message: 'Le code est requis' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Le domaine est requis' })
  domain: string;

  @IsOptional()
  @IsString()
  description?: string;
}
