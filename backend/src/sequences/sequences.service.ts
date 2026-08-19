import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateSequenceDto } from './dto/create-sequence.dto';
import { UpdateSequenceDto } from './dto/update-sequence.dto';

const sequenceInclude = {
  progression: {
    select: {
      id: true, title: true,
      school: { select: { id: true, name: true } },
      class: { select: { id: true, name: true } },
      schoolYear: { select: { id: true, name: true } },
    },
  },
  competencies: {
    include: { competency: { select: { id: true, code: true, name: true, domain: true } } },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.SequenceInclude;

@Injectable()
export class SequencesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; progressionId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, progressionId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.SequenceWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (progressionId) where.progressionId = progressionId;

    const [data, total] = await Promise.all([
      this.prisma.sequence.findMany({
        where,
        include: sequenceInclude,
        orderBy: [{ order: 'asc' }, { title: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sequence.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const sequence = await this.prisma.sequence.findUnique({
      where: { id },
      include: sequenceInclude,
    });
    if (!sequence) throw new NotFoundException('Séquence introuvable');
    return sequence;
  }

  async create(dto: CreateSequenceDto) {
    const { competencies, ...data } = dto;
    return this.prisma.sequence.create({
      data: {
        ...data,
        competencies: {
          create: competencies.map((c, i) => ({
            competencyId: c.competencyId,
            order: c.order ?? i,
          })),
        },
      },
      include: sequenceInclude,
    });
  }

  async update(id: string, dto: UpdateSequenceDto) {
    await this.findOne(id);
    const { competencies, ...data } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (competencies) {
        await tx.sequenceCompetency.deleteMany({ where: { sequenceId: id } });
        await tx.sequenceCompetency.createMany({
          data: competencies.map((c, i) => ({
            sequenceId: id,
            competencyId: c.competencyId,
            order: c.order ?? i,
          })),
        });
      }

      return tx.sequence.update({
        where: { id },
        data,
        include: sequenceInclude,
      });
    });
  }

  async archive(id: string) {
    const sequence = await this.findOne(id);
    return this.prisma.sequence.update({
      where: { id },
      data: { isArchived: !sequence.isArchived },
      include: sequenceInclude,
    });
  }
}
