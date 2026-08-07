import { IsNotEmpty, IsEnum, IsBoolean, IsOptional } from 'class-validator';
import { Theme, Language } from '@prisma/client';

export class UpdatePreferencesDto {
  @IsNotEmpty()
  @IsEnum(Theme)
  theme: Theme;

  @IsNotEmpty()
  @IsEnum(Language)
  language: Language;

  @IsOptional()
  @IsBoolean()
  notificationsEnabled?: boolean;
}
