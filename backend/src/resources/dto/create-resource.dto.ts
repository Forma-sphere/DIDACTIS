import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ResourceType } from '@prisma/client';

export class CreateResourceDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ResourceType, { message: 'Le type est requis' })
  type: ResourceType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
