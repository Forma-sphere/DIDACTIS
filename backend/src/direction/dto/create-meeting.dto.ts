import { IsNotEmpty, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateMeetingDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsDateString()
  date: string;
}
