import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: string, userRole: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, role: true, schoolId: true },
    });

    const activeClass = await this.getActiveClass(userId, userRole);
    const todaySchedule = await this.getTodaySchedule(userId, userRole, today);
    const recentActivities = await this.getRecentActivities(userId, userRole);
    const notifications = this.buildNotifications(activeClass, todaySchedule, recentActivities);

    return {
      user: {
        firstName: user?.firstName ?? '',
        lastName: user?.lastName ?? '',
        role: user?.role ?? userRole,
      },
      activeClass,
      todaySchedule,
      recentActivities,
      notifications,
      shortcuts: [
        { label: 'Préparations', path: '/preparations', icon: 'BookOpen' },
        { label: 'Progressions', path: '/progressions', icon: 'TrendingUp' },
        { label: 'Séquences', path: '/sequences', icon: 'Layers' },
        { label: 'Cahier-journal', path: '/journal', icon: 'Calendar' },
        { label: 'Évaluations', path: '/assessments', icon: 'ClipboardCheck' },
        { label: 'Ressources', path: '/resources', icon: 'FolderOpen' },
      ],
    };
  }

  private async getActiveClass(userId: string, userRole: string) {
    if (userRole === 'TEACHER') {
      const cls = await this.prisma.class.findFirst({
        where: { teacherId: userId, isArchived: false },
        select: {
          id: true, name: true, level: true, cycle: true,
          _count: { select: { students: { where: { isArchived: false } } } },
          school: { select: { id: true, name: true } },
          schoolYear: { select: { id: true, name: true, isCurrent: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!cls) return null;

      return {
        id: cls.id,
        name: cls.name,
        level: cls.level,
        cycle: cls.cycle,
        studentCount: cls._count.students,
        school: cls.school,
        schoolYear: cls.schoolYear,
      };
    }

    return null;
  }

  private async getTodaySchedule(userId: string, userRole: string, today: Date) {
    const classIds = await this.getUserClassIds(userId, userRole);
    if (classIds.length === 0) return [];

    const journalDay = await this.prisma.journalDay.findFirst({
      where: {
        classId: { in: classIds },
        date: today,
      },
      include: {
        class: { select: { id: true, name: true } },
        lessons: {
          include: {
            lesson: {
              select: {
                id: true, title: true, duration: true,
                sequence: { select: { id: true, title: true } },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!journalDay) return [];

    return journalDay.lessons.map((jl) => ({
      lessonId: jl.lessonId,
      title: jl.lesson.title,
      startTime: jl.startTime,
      endTime: jl.endTime,
      duration: jl.lesson.duration,
      sequence: jl.lesson.sequence
        ? { id: jl.lesson.sequence.id, title: jl.lesson.sequence.title }
        : null,
      className: journalDay.class.name,
    }));
  }

  private async getRecentActivities(userId: string, userRole: string) {
    const classIds = await this.getUserClassIds(userId, userRole);
    if (classIds.length === 0) return [];

    const [lessons, sequences, progressions, assessments] = await Promise.all([
      this.prisma.lesson.findMany({
        where: { classId: { in: classIds }, isArchived: false },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.sequence.findMany({
        where: { progression: { classId: { in: classIds } }, isArchived: false },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.progression.findMany({
        where: { classId: { in: classIds }, isArchived: false },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      this.prisma.assessment.findMany({
        where: { classId: { in: classIds }, isArchived: false },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    const activities = [
      ...lessons.map((l) => ({ id: l.id, title: l.title, type: 'LESSON' as const, updatedAt: l.updatedAt })),
      ...sequences.map((s) => ({ id: s.id, title: s.title, type: 'SEQUENCE' as const, updatedAt: s.updatedAt })),
      ...progressions.map((p) => ({ id: p.id, title: p.title, type: 'PROGRESSION' as const, updatedAt: p.updatedAt })),
      ...assessments.map((a) => ({ id: a.id, title: a.title, type: 'ASSESSMENT' as const, updatedAt: a.updatedAt })),
    ];

    activities.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return activities.slice(0, 10);
  }

  private buildNotifications(
    activeClass: Awaited<ReturnType<typeof this.getActiveClass>>,
    todaySchedule: Awaited<ReturnType<typeof this.getTodaySchedule>>,
    recentActivities: Awaited<ReturnType<typeof this.getRecentActivities>>,
  ) {
    const notifications: { type: string; message: string }[] = [];

    if (!activeClass) {
      notifications.push({
        type: 'info',
        message: 'Aucune classe active. Créez ou rejoignez une classe pour commencer.',
      });
    }

    if (todaySchedule.length === 0) {
      notifications.push({
        type: 'info',
        message: 'Aucune séance prévue aujourd\'hui dans le cahier-journal.',
      });
    } else {
      notifications.push({
        type: 'success',
        message: `${todaySchedule.length} séance${todaySchedule.length > 1 ? 's' : ''} prévue${todaySchedule.length > 1 ? 's' : ''} aujourd'hui.`,
      });
    }

    if (recentActivities.length > 0) {
      const lastActivity = recentActivities[0];
      const typeLabels: Record<string, string> = {
        LESSON: 'Préparation',
        SEQUENCE: 'Séquence',
        PROGRESSION: 'Progression',
        ASSESSMENT: 'Évaluation',
      };
      notifications.push({
        type: 'info',
        message: `Dernière activité : ${typeLabels[lastActivity.type]} « ${lastActivity.title} »`,
      });
    }

    return notifications;
  }

  private async getUserClassIds(userId: string, userRole: string): Promise<string[]> {
    if (userRole === 'TEACHER') {
      const classes = await this.prisma.class.findMany({
        where: { teacherId: userId, isArchived: false },
        select: { id: true },
      });
      return classes.map((c) => c.id);
    }

    if (userRole === 'ADMIN' || userRole === 'DIRECTOR') {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { schoolId: true },
      });
      if (user?.schoolId) {
        const classes = await this.prisma.class.findMany({
          where: { schoolId: user.schoolId, isArchived: false },
          select: { id: true },
        });
        return classes.map((c) => c.id);
      }
    }

    return [];
  }
}
