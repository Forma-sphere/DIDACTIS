import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const studentInclude = {
  school: { select: { id: true, name: true } },
  class: {
    select: {
      id: true, name: true, level: true, cycle: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    search?: string; schoolId?: string; classId?: string;
    archived?: string; page?: number; limit?: number;
  }) {
    const { search, schoolId, classId, archived, page = 1, limit = 20 } = params;

    const where: Prisma.StudentWhereInput = {};

    if (archived !== 'true') where.isArchived = false;
    if (search) {
      where.OR = [
        { lastName: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (schoolId) where.schoolId = schoolId;
    if (classId) where.classId = classId;

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: studentInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: studentInclude,
    });
    if (!student) throw new NotFoundException('Élève introuvable');
    return student;
  }

  async create(dto: CreateStudentDto) {
    return this.prisma.student.create({
      data: {
        ...dto,
        birthDate: new Date(dto.birthDate),
      },
      include: studentInclude,
    });
  }

  async update(id: string, dto: UpdateStudentDto) {
    await this.findOne(id);
    const data: any = { ...dto };
    if (dto.birthDate) data.birthDate = new Date(dto.birthDate);
    return this.prisma.student.update({
      where: { id },
      data,
      include: studentInclude,
    });
  }

  async archive(id: string) {
    const student = await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { isArchived: !student.isArchived },
      include: studentInclude,
    });
  }
}
