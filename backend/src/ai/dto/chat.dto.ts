import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ChatDto {
  @IsUUID('4', { message: 'La conversation est requise' })
  conversationId: string;

  @IsString()
  @IsNotEmpty({ message: 'Le message est requis' })
  message: string;
}
