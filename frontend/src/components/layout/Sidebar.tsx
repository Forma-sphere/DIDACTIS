'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, School, Users, BookOpen, GraduationCap,
  FileText, Layers, TrendingUp, CalendarDays, ClipboardCheck,
  Award, FolderOpen, FileDown, Sparkles, BarChart3, Settings,
} from 'lucide-react';
import { cn } from '@/lib/cn';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'École', href: '/schools', icon: School },
  { name: 'Utilisateurs', href: '/users', icon: Users },
  { name: 'Classes', href: '/classes', icon: BookOpen },
  { name: 'Élèves', href: '/students', icon: GraduationCap },
  { name: 'Préparations', href: '/preparations', icon: FileText },
  { name: 'Séquences', href: '/sequences', icon: Layers },
  { name: 'Progressions', href: '/progressions', icon: TrendingUp },
  { name: 'Cahier-journal', href: '/journal', icon: CalendarDays },
  { name: 'Évaluations', href: '/assessments', icon: ClipboardCheck },
  { name: 'Compétences', href: '/competencies', icon: Award },
  { name: 'Ressources', href: '/resources', icon: FolderOpen },
  { name: 'Documents', href: '/documents', icon: FileDown },
  { name: 'IA', href: '/ai', icon: Sparkles },
  { name: 'Direction', href: '/direction', icon: BarChart3 },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500 text-white font-bold text-sm">
          D
        </div>
        <span className="text-lg font-bold text-primary-900">Didactys</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-accent-50 text-accent-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-primary-900',
                  )}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
