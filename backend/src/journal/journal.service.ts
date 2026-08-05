import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateJournalDayDto } from './dto/create-journal-day.dto';
import { UpdateJournalDayDto } from './dto/update-journal-day.dto';

const journalDayInclude = {
  class: {
    select: {
      id: true, name: true, level: true, cycle: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  lessons: {
    include: {
      lesson: {
        select: {
          id: true, title: true, duration: true,
          sequence: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { order: 'asc' as const },
  },
} satisfies Prisma.JournalDayInclude;

@Injectable()
export class JournalService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: {
    classId?: string; month?: string; year?: string;
    page?: number; limit?: number;
  }) {
    const { classId, month, year, page = 1, limit = 50 } = params;

    const where: Prisma.JournalDayWhereInput = {};

    if (classId) where.classId = classId;

    if (year && month) {
      const y = parseInt(year);
      const m = parseInt(month);
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0);
      where.date = { gte: startDate, lte: endDate };
    }

    const [data, total] = await Promise.all([
      this.prisma.journalDay.findMany({
        where,
        include: journalDayInclude,
        orderBy: { date: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.journalDay.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const journalDay = await this.prisma.journalDay.findUnique({
      where: { id },
      include: journalDayInclude,
    });
    if (!journalDay) throw new NotFoundException('Journée introuvable');
    return journalDay;
  }

  async create(dto: CreateJournalDayDto) {
    const { lessons, ...data } = dto;

    this.validateLessons(lessons);

    return this.prisma.journalDay.create({
      data: {
        classId: data.classId,
        date: new Date(data.date),
        notes: data.notes,
        lessons: {
          create: lessons.map((l, i) => ({
            lessonId: l.lessonId,
            startTime: l.startTime,
            endTime: l.endTime,
            order: l.order ?? i,
          })),
        },
      },
      include: journalDayInclude,
    });
  }

  async update(id: string, dto: UpdateJournalDayDto) {
    await this.findOne(id);
    const { lessons, ...data } = dto;

    if (lessons) {
      this.validateLessons(lessons);
    }

    return this.prisma.$transaction(async (tx) => {
      if (lessons) {
        await tx.journalLesson.deleteMany({ where: { journalDayId: id } });
        await tx.journalLesson.createMany({
          data: lessons.map((l, i) => ({
            journalDayId: id,
            lessonId: l.lessonId,
            startTime: l.startTime,
            endTime: l.endTime,
            order: l.order ?? i,
          })),
        });
      }

      const updateData: Prisma.JournalDayUpdateInput = {};
      if (data.classId !== undefined) updateData.class = { connect: { id: data.classId } };
      if (data.date !== undefined) updateData.date = new Date(data.date);
      if (data.notes !== undefined) updateData.notes = data.notes;

      return tx.journalDay.update({
        where: { id },
        data: updateData,
        include: journalDayInclude,
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.journalDay.delete({
      where: { id },
    });
  }

  private validateLessons(lessons: { lessonId: string; startTime: string; endTime: string }[]) {
    const lessonIds = lessons.map((l) => l.lessonId);
    const uniqueIds = new Set(lessonIds);
    if (uniqueIds.size !== lessonIds.length) {
      throw new BadRequestException('Une préparation ne peut apparaître qu\'une seule fois dans une même journée');
    }

    for (const l of lessons) {
      if (l.startTime >= l.endTime) {
        throw new BadRequestException("L'heure de fin doit être postérieure à l'heure de début");
      }
    }
  }
}
