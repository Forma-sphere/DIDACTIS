import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { CreatePeriodDto } from './dto/create-period.dto';
import { UpdatePeriodDto } from './dto/update-period.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(includeArchived = false) {
    return this.prisma.school.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        schoolYears: {
          orderBy: { startDate: 'desc' },
          include: { periods: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!school) throw new NotFoundException('École introuvable');
    return school;
  }

  async create(dto: CreateSchoolDto) {
    if (dto.uaiCode) {
      const existing = await this.prisma.school.findUnique({ where: { uaiCode: dto.uaiCode } });
      if (existing) throw new ConflictException('Ce code UAI est déjà utilisé');
    }
    return this.prisma.school.create({ data: dto });
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findById(id);
    if (dto.uaiCode) {
      const existing = await this.prisma.school.findUnique({ where: { uaiCode: dto.uaiCode } });
      if (existing && existing.id !== id) throw new ConflictException('Ce code UAI est déjà utilisé');
    }
    return this.prisma.school.update({ where: { id }, data: dto });
  }

  async archive(id: string) {
    const school = await this.findById(id);
    return this.prisma.school.update({
      where: { id },
      data: { isArchived: !school.isArchived },
    });
  }

  // --- School Years ---

  async createYear(schoolId: string, dto: CreateSchoolYearDto) {
    await this.findById(schoolId);
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('La date de début doit précéder la date de fin');
    }
    if (dto.isCurrent) {
      await this.prisma.schoolYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      });
    }
    return this.prisma.schoolYear.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), schoolId },
      include: { periods: { orderBy: { order: 'asc' } } },
    });
  }

  async updateYear(schoolId: string, yearId: string, dto: UpdateSchoolYearDto) {
    const year = await this.prisma.schoolYear.findFirst({ where: { id: yearId, schoolId } });
    if (!year) throw new NotFoundException('Année scolaire introuvable');

    const startDate = dto.startDate ? new Date(dto.startDate) : year.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : year.endDate;
    if (startDate >= endDate) {
      throw new BadRequestException('La date de début doit précéder la date de fin');
    }

    if (dto.isCurrent) {
      await this.prisma.schoolYear.updateMany({
        where: { schoolId, isCurrent: true, id: { not: yearId } },
        data: { isCurrent: false },
      });
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.schoolYear.update({
      where: { id: yearId },
      data,
      include: { periods: { orderBy: { order: 'asc' } } },
    });
  }

  async deleteYear(schoolId: string, yearId: string) {
    const year = await this.prisma.schoolYear.findFirst({ where: { id: yearId, schoolId } });
    if (!year) throw new NotFoundException('Année scolaire introuvable');
    await this.prisma.schoolYear.delete({ where: { id: yearId } });
    return { message: 'Année scolaire supprimée' };
  }

  // --- Periods ---

  async createPeriod(schoolId: string, yearId: string, dto: CreatePeriodDto) {
    const year = await this.prisma.schoolYear.findFirst({ where: { id: yearId, schoolId } });
    if (!year) throw new NotFoundException('Année scolaire introuvable');
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException('La date de début doit précéder la date de fin');
    }
    return this.prisma.period.create({
      data: { ...dto, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate), schoolYearId: yearId },
    });
  }

  async updatePeriod(schoolId: string, yearId: string, periodId: string, dto: UpdatePeriodDto) {
    const period = await this.prisma.period.findFirst({
      where: { id: periodId, schoolYear: { id: yearId, schoolId } },
    });
    if (!period) throw new NotFoundException('Période introuvable');

    const startDate = dto.startDate ? new Date(dto.startDate) : period.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : period.endDate;
    if (startDate >= endDate) {
      throw new BadRequestException('La date de début doit précéder la date de fin');
    }

    const data: Record<string, unknown> = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.period.update({ where: { id: periodId }, data });
  }

  async deletePeriod(schoolId: string, yearId: string, periodId: string) {
    const period = await this.prisma.period.findFirst({
      where: { id: periodId, schoolYear: { id: yearId, schoolId } },
    });
    if (!period) throw new NotFoundException('Période introuvable');
    await this.prisma.period.delete({ where: { id: periodId } });
    return { message: 'Période supprimée' };
  }
}
