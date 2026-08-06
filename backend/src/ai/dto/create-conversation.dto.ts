import { IsString, IsNotEmpty } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @IsNotEmpty({ message: 'Le titre est requis' })
  title: string;
}
