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
import { SequencesModule } from './sequences/sequences.module';
import { LessonsModule } from './lessons/lessons.module';
import { JournalModule } from './journal/journal.module';
import { ResourcesModule } from './resources/resources.module';
import { AssessmentsModule } from './assessments/assessments.module';
import { DocumentsModule } from './documents/documents.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SchoolsModule,
    ClassesModule,
    StudentsModule,
    CompetenciesModule,
    ProgressionsModule,
    SequencesModule,
    LessonsModule,
    JournalModule,
    ResourcesModule,
    AssessmentsModule,
    DocumentsModule,
  ],
})
export class AppModule {}
