import { IsString, IsOptional } from 'class-validator';

export class UpdateCompetencyDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
