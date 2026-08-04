import { IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  refreshToken: string;
}
