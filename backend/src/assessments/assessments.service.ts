import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { SaveResultsDto } from './dto/save-results.dto';

const assessmentInclude = {
  class: {
    select: {
      id: true, name: true, level: true, cycle: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  competencies: {
    include: { competency: { select: { id: true, code: true, name: true, domain: true } } },
  },
  results: {
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      competency: { select: { id: true, code: true, name: true, domain: true } },
    },
  },
} satisfies Prisma.AssessmentInclude;

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; classId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, classId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.AssessmentWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (classId) where.classId = classId;

    const [data, total] = await Promise.all([
      this.prisma.assessment.findMany({
        where,
        include: assessmentInclude,
        orderBy: [{ date: 'desc' }, { title: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: assessmentInclude,
    });
    if (!assessment) throw new NotFoundException('Évaluation introuvable');
    return assessment;
  }

  async create(dto: CreateAssessmentDto) {
    const { competencyIds, ...data } = dto;
    return this.prisma.assessment.create({
      data: {
        ...data,
        competencies: {
          create: competencyIds.map((competencyId) => ({ competencyId })),
        },
      },
      include: assessmentInclude,
    });
  }

  async update(id: string, dto: UpdateAssessmentDto) {
    await this.findOne(id);
    const { competencyIds, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (competencyIds) {
        await tx.assessmentCompetency.deleteMany({ where: { assessmentId: id } });
        await tx.assessmentCompetency.createMany({
          data: competencyIds.map((competencyId) => ({
            assessmentId: id,
            competencyId,
          })),
        });
      }

      return tx.assessment.update({
        where: { id },
        data,
        include: assessmentInclude,
      });
    });
  }

  async archive(id: string) {
    const assessment = await this.findOne(id);
    return this.prisma.assessment.update({
      where: { id },
      data: { isArchived: !assessment.isArchived },
      include: assessmentInclude,
    });
  }

  async saveResults(id: string, dto: SaveResultsDto) {
    await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.results) {
        await tx.assessmentResult.upsert({
          where: {
            assessmentId_studentId_competencyId: {
              assessmentId: id,
              studentId: item.studentId,
              competencyId: item.competencyId,
            },
          },
          update: {
            status: item.status,
            comment: item.comment ?? null,
          },
          create: {
            assessmentId: id,
            studentId: item.studentId,
            competencyId: item.competencyId,
            status: item.status,
            comment: item.comment ?? null,
          },
        });
      }

      return tx.assessment.findUnique({
        where: { id },
        include: assessmentInclude,
      });
    });
  }
}
