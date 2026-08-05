import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProgressionDto } from './dto/create-progression.dto';
import { UpdateProgressionDto } from './dto/update-progression.dto';

const progressionInclude = {
  school: { select: { id: true, name: true } },
  class: { select: { id: true, name: true, level: true, cycle: true } },
  schoolYear: {
    select: {
      id: true, name: true,
      periods: { select: { id: true, name: true, startDate: true, endDate: true, order: true }, orderBy: { order: 'asc' as const } },
    },
  },
  competencies: {
    include: { competency: { select: { id: true, code: true, name: true, domain: true } } },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.ProgressionInclude;

@Injectable()
export class ProgressionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; schoolId?: string; classId?: string; schoolYearId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, schoolId, classId, schoolYearId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.ProgressionWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const [data, total] = await Promise.all([
      this.prisma.progression.findMany({
        where,
        include: progressionInclude,
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.progression.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const progression = await this.prisma.progression.findUnique({
      where: { id },
      include: progressionInclude,
    });
    if (!progression) throw new NotFoundException('Progression introuvable');
    return progression;
  }

  async create(dto: CreateProgressionDto) {
    const { competencies, ...data } = dto;
    return this.prisma.progression.create({
      data: {
        ...data,
        competencies: {
          create: competencies.map((c, i) => ({
            competencyId: c.competencyId,
            order: c.order ?? i,
          })),
        },
      },
      include: progressionInclude,
    });
  }

  async update(id: string, dto: UpdateProgressionDto) {
    await this.findOne(id);
    const { competencies, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (competencies) {
        await tx.progressionCompetency.deleteMany({ where: { progressionId: id } });
        await tx.progressionCompetency.createMany({
          data: competencies.map((c, i) => ({
            progressionId: id,
            competencyId: c.competencyId,
            order: c.order ?? i,
          })),
        });
      }

      return tx.progression.update({
        where: { id },
        data,
        include: progressionInclude,
      });
    });
  }

  async archive(id: string) {
    const progression = await this.findOne(id);
    return this.prisma.progression.update({
      where: { id },
      data: { isArchived: !progression.isArchived },
      include: progressionInclude,
    });
  }
}
