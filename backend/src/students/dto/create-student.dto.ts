import { IsString, IsNotEmpty, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { Gender } from '@prisma/client';

export class CreateStudentDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est requis' })
  lastName: string;

  @IsString()
  @IsNotEmpty({ message: 'Le prénom est requis' })
  firstName: string;

  @IsDateString({}, { message: 'La date de naissance est requise' })
  birthDate: string;

  @IsEnum(Gender, { message: 'Le sexe est requis' })
  gender: Gender;

  @IsUUID('4', { message: "L'école est requise" })
  schoolId: string;

  @IsUUID('4', { message: 'La classe est requise' })
  classId: string;
}
