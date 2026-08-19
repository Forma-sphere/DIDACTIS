'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen, TrendingUp, Layers, Calendar, ClipboardCheck, FolderOpen,
  Clock, Bell, Activity, Users, School, ArrowRight,
  FileText, Info, CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import type {
  DashboardData, DashboardScheduleItem, DashboardActivity,
  DashboardNotification, DashboardShortcut,
} from '@/types';

const iconMap: Record<string, typeof BookOpen> = {
  BookOpen, TrendingUp, Layers, Calendar, ClipboardCheck, FolderOpen,
};

const activityTypeLabels: Record<string, string> = {
  LESSON: 'Préparation',
  SEQUENCE: 'Séquence',
  PROGRESSION: 'Progression',
  ASSESSMENT: 'Évaluation',
};

const activityTypeColors: Record<string, string> = {
  LESSON: 'bg-blue-100 text-blue-700',
  SEQUENCE: 'bg-purple-100 text-purple-700',
  PROGRESSION: 'bg-green-100 text-green-700',
  ASSESSMENT: 'bg-orange-100 text-orange-700',
};

const activityTypePaths: Record<string, string> = {
  LESSON: '/preparations',
  SEQUENCE: '/sequences',
  PROGRESSION: '/progressions',
  ASSESSMENT: '/assessments',
};

const cycleLabels: Record<string, string> = {
  CYCLE_1: 'Cycle 1',
  CYCLE_2: 'Cycle 2',
  CYCLE_3: 'Cycle 3',
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data: d } = await api.get<DashboardData>('/dashboard');
        setData(d);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Impossible de charger le tableau de bord.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <WelcomeSection
        firstName={data.user.firstName}
        lastName={data.user.lastName}
        date={today}
        activeClass={data.activeClass}
      />
      <ShortcutsSection shortcuts={data.shortcuts} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ScheduleSection schedule={data.todaySchedule} />
        <NotificationsSection notifications={data.notifications} />
      </div>
      <RecentActivitiesSection activities={data.recentActivities} />
    </div>
  );
}

function WelcomeSection({
  firstName, lastName, date, activeClass,
}: {
  firstName: string; lastName: string; date: string;
  activeClass: DashboardData['activeClass'];
}) {
  return (
    <Card className="bg-gradient-to-r from-primary-800 to-primary-900 text-white border-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour, {firstName} {lastName}
          </h1>
          <p className="mt-1 text-sm text-primary-200 capitalize">{date}</p>
        </div>
        {activeClass && (
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
            <School className="h-5 w-5 text-accent-300" />
            <div>
              <p className="text-sm font-medium">{activeClass.name}</p>
              <div className="flex items-center gap-2 text-xs text-primary-200">
                <span>{activeClass.level} — {cycleLabels[activeClass.cycle] || activeClass.cycle}</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {activeClass.studentCount} élève{activeClass.studentCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function ShortcutsSection({ shortcuts }: { shortcuts: DashboardShortcut[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {shortcuts.map((shortcut) => {
        const Icon = iconMap[shortcut.icon] || FileText;
        return (
          <Link key={shortcut.path} href={shortcut.path}>
            <Card className="flex flex-col items-center gap-2 p-4 text-center transition-all hover:shadow-md hover:border-accent-300 cursor-pointer">
              <div className="rounded-lg bg-accent-50 p-2.5">
                <Icon className="h-5 w-5 text-accent-600" />
              </div>
              <span className="text-xs font-medium text-primary-900">{shortcut.label}</span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

function ScheduleSection({ schedule }: { schedule: DashboardScheduleItem[] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-accent-500" />
        <h2 className="text-lg font-semibold text-primary-900">Agenda du jour</h2>
      </div>

      {schedule.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Calendar className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Aucune séance prévue aujourd&apos;hui.</p>
          <Link
            href="/journal"
            className="mt-2 text-xs font-medium text-accent-600 hover:text-accent-700"
          >
            Ouvrir le cahier-journal
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {schedule.map((item) => (
            <div
              key={item.lessonId}
              className="flex items-start gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
            >
              <div className="shrink-0 rounded bg-accent-50 px-2 py-1 text-center">
                <p className="text-xs font-semibold text-accent-700">{item.startTime}</p>
                <p className="text-xs text-accent-500">{item.endTime}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-primary-900 truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {item.sequence && (
                    <span className="text-xs text-gray-500 truncate">{item.sequence.title}</span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {item.duration} min
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotificationsSection({ notifications }: { notifications: DashboardNotification[] }) {
  const notifIcons: Record<string, typeof Info> = {
    info: Info,
    success: CheckCircle,
    warning: Bell,
  };

  const notifColors: Record<string, string> = {
    info: 'bg-blue-50 text-blue-700 border-blue-100',
    success: 'bg-green-50 text-green-700 border-green-100',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-100',
  };

  return (
    <Card>
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-accent-500" />
        <h2 className="text-lg font-semibold text-primary-900">Notifications</h2>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Bell className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Aucune notification.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = notifIcons[notif.type] || Info;
            const colors = notifColors[notif.type] || notifColors.info;
            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 rounded-lg border p-3 ${colors}`}
              >
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-sm">{notif.message}</p>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function RecentActivitiesSection({ activities }: { activities: DashboardActivity[] }) {
  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-accent-500" />
          <h2 className="text-lg font-semibold text-primary-900">Activités récentes</h2>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <Activity className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Aucune activité récente.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Élément</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Dernière modification</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activities.map((activity) => (
                <tr key={`${activity.type}-${activity.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-primary-900">{activity.title}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${activityTypeColors[activity.type]}`}>
                      {activityTypeLabels[activity.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(activity.updatedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`${activityTypePaths[activity.type]}/${activity.id}`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:text-accent-700"
                    >
                      Voir <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
