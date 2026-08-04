import { IsNotEmpty } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Le token est requis' })
  token: string;
}
