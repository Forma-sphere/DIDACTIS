import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class DirectionService {
  constructor(private readonly prisma: PrismaService) {}

  private async getSchoolId(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { schoolId: true },
    });
    if (!user?.schoolId) throw new ForbiddenException('Aucune école associée');
    return user.schoolId;
  }

  async getDashboard(userId: string) {
    const schoolId = await this.getSchoolId(userId);

    const [classCount, studentCount, teacherCount, assessmentCount, lessonCount] = await Promise.all([
      this.prisma.class.count({ where: { schoolId, isArchived: false } }),
      this.prisma.student.count({ where: { schoolId, isArchived: false } }),
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.assessment.count({
        where: { class: { schoolId }, isArchived: false },
      }),
      this.prisma.lesson.count({
        where: { class: { schoolId }, isArchived: false },
      }),
    ]);

    return { classCount, studentCount, teacherCount, assessmentCount, lessonCount };
  }

  // --- Meetings ---

  async findAllMeetings(userId: string, params: { search?: string; page?: number; limit?: number }) {
    const schoolId = await this.getSchoolId(userId);
    const { search, page = 1, limit = 20 } = params;

    const where: Prisma.MeetingWhereInput = { schoolId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.meeting.findMany({
        where,
        include: { school: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.meeting.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneMeeting(id: string, userId: string) {
    const schoolId = await this.getSchoolId(userId);
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: { school: { select: { id: true, name: true } } },
    });
    if (!meeting) throw new NotFoundException('Réunion introuvable');
    if (meeting.schoolId !== schoolId) throw new ForbiddenException('Accès refusé');
    return meeting;
  }

  async createMeeting(dto: CreateMeetingDto, userId: string) {
    const schoolId = await this.getSchoolId(userId);
    return this.prisma.meeting.create({
      data: {
        schoolId,
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
      },
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async updateMeeting(id: string, dto: UpdateMeetingDto, userId: string) {
    await this.findOneMeeting(id, userId);
    const data: Prisma.MeetingUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.date !== undefined) data.date = new Date(dto.date);

    return this.prisma.meeting.update({
      where: { id },
      data,
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async deleteMeeting(id: string, userId: string) {
    await this.findOneMeeting(id, userId);
    return this.prisma.meeting.delete({ where: { id } });
  }

  // --- Projects ---

  async findAllProjects(userId: string, params: { search?: string; page?: number; limit?: number }) {
    const schoolId = await this.getSchoolId(userId);
    const { search, page = 1, limit = 20 } = params;

    const where: Prisma.ProjectWhereInput = { schoolId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: { school: { select: { id: true, name: true } } },
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOneProject(id: string, userId: string) {
    const schoolId = await this.getSchoolId(userId);
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { school: { select: { id: true, name: true } } },
    });
    if (!project) throw new NotFoundException('Projet introuvable');
    if (project.schoolId !== schoolId) throw new ForbiddenException('Accès refusé');
    return project;
  }

  async createProject(dto: CreateProjectDto, userId: string) {
    const schoolId = await this.getSchoolId(userId);
    return this.prisma.project.create({
      data: {
        schoolId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async updateProject(id: string, dto: UpdateProjectDto, userId: string) {
    await this.findOneProject(id, userId);
    const data: Prisma.ProjectUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = dto.endDate ? new Date(dto.endDate) : null;

    return this.prisma.project.update({
      where: { id },
      data,
      include: { school: { select: { id: true, name: true } } },
    });
  }

  async deleteProject(id: string, userId: string) {
    await this.findOneProject(id, userId);
    return this.prisma.project.delete({ where: { id } });
  }
}
