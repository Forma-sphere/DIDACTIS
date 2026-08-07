import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class UpdateProfileDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
