import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ResourceType, { message: 'Type invalide' })
  type?: ResourceType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
