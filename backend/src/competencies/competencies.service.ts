import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { UpdateCompetencyDto } from './dto/update-competency.dto';

@Injectable()
export class CompetenciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; domain?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, domain, archived, page = 1, limit = 20 } = params;

    const where: Prisma.CompetencyWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (domain) where.domain = domain;

    const [data, total] = await Promise.all([
      this.prisma.competency.findMany({
        where,
        orderBy: [{ domain: 'asc' }, { code: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.competency.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const competency = await this.prisma.competency.findUnique({ where: { id } });
    if (!competency) throw new NotFoundException('Compétence introuvable');
    return competency;
  }

  async create(dto: CreateCompetencyDto) {
    const existing = await this.prisma.competency.findUnique({ where: { code: dto.code } });
    if (existing) throw new ConflictException('Ce code de compétence existe déjà');
    return this.prisma.competency.create({ data: dto });
  }

  async update(id: string, dto: UpdateCompetencyDto) {
    await this.findOne(id);
    if (dto.code) {
      const existing = await this.prisma.competency.findUnique({ where: { code: dto.code } });
      if (existing && existing.id !== id) throw new ConflictException('Ce code de compétence existe déjà');
    }
    return this.prisma.competency.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    const competency = await this.findOne(id);
    return this.prisma.competency.update({
      where: { id },
      data: { isArchived: !competency.isArchived },
    });
  }

  async getDomains() {
    const results = await this.prisma.competency.findMany({
      where: { isArchived: false },
      select: { domain: true },
      distinct: ['domain'],
      orderBy: { domain: 'asc' },
    });
    return results.map((r) => r.domain);
  }
}
