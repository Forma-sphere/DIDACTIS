import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

const classInclude = {
  school: { select: { id: true, name: true } },
  schoolYear: { select: { id: true, name: true } },
  teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.ClassInclude;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; schoolId?: string; schoolYearId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, schoolId, schoolYearId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.ClassWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { teacher: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (schoolId) where.schoolId = schoolId;
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        include: classInclude,
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.class.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      include: classInclude,
    });
    if (!cls) throw new NotFoundException('Classe introuvable');
    return cls;
  }

  async create(dto: CreateClassDto) {
    return this.prisma.class.create({
      data: dto,
      include: classInclude,
    });
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.findOne(id);
    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: classInclude,
    });
  }

  async archive(id: string) {
    const cls = await this.findOne(id);
    return this.prisma.class.update({
      where: { id },
      data: { isArchived: !cls.isArchived },
      include: classInclude,
    });
  }
}
