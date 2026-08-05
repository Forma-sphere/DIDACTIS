import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SchoolsModule } from './schools/schools.module';
import { ClassesModule } from './classes/classes.module';
import { StudentsModule } from './students/students.module';
import { CompetenciesModule } from './competencies/competencies.module';
import { ProgressionsModule } from './progressions/progressions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    ClassesModule,
    StudentsModule,
    CompetenciesModule,
    ProgressionsModule,
  ],
})
export class AppModule {}
