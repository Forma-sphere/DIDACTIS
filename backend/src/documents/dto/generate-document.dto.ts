import { IsEnum, IsUUID } from 'class-validator';
import { DocumentType, SourceModule } from '@prisma/client';

export class GenerateDocumentDto {
  @IsEnum(SourceModule, { message: 'Module source invalide' })
  sourceModule: SourceModule;

  @IsUUID('4', { message: 'Source invalide' })
  sourceId: string;

  @IsEnum(DocumentType, { message: 'Type invalide (PDF ou WORD)' })
  type: DocumentType;
}
