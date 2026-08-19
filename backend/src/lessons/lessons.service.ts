import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';

const lessonInclude = {
  sequence: {
    select: {
      id: true, title: true,
      progression: {
        select: {
          id: true, title: true,
          school: { select: { id: true, name: true } },
        },
      },
    },
  },
  class: {
    select: {
      id: true, name: true, level: true, cycle: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  competencies: {
    include: { competency: { select: { id: true, code: true, name: true, domain: true } } },
  },
} satisfies Prisma.LessonInclude;

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; sequenceId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, sequenceId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.LessonWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (sequenceId) where.sequenceId = sequenceId;

    const [data, total] = await Promise.all([
      this.prisma.lesson.findMany({
        where,
        include: lessonInclude,
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.lesson.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: lessonInclude,
    });
    if (!lesson) throw new NotFoundException('Préparation introuvable');
    return lesson;
  }

  async create(dto: CreateLessonDto) {
    const { competencyIds, ...data } = dto;
    return this.prisma.lesson.create({
      data: {
        ...data,
        order: data.order ?? 0,
        competencies: {
          create: competencyIds.map((competencyId) => ({ competencyId })),
        },
      },
      include: lessonInclude,
    });
  }

  async update(id: string, dto: UpdateLessonDto) {
    await this.findOne(id);
    const { competencyIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (competencyIds) {
        await tx.lessonCompetency.deleteMany({ where: { lessonId: id } });
        await tx.lessonCompetency.createMany({
          data: competencyIds.map((competencyId) => ({
            lessonId: id,
            competencyId,
          })),
        });
      }

      return tx.lesson.update({
        where: { id },
        data,
        include: lessonInclude,
      });
    });
  }

  async archive(id: string) {
    const lesson = await this.findOne(id);
    return this.prisma.lesson.update({
      where: { id },
      data: { isArchived: !lesson.isArchived },
      include: lessonInclude,
    });
  }
}
