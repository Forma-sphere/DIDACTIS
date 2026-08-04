'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const labels: Record<string, string> = {
  dashboard: 'Tableau de bord',
  schools: 'Écoles',
  new: 'Nouveau',
  users: 'Utilisateurs',
  classes: 'Classes',
  students: 'Élèves',
  preparations: 'Préparations',
  sequences: 'Séquences',
  progressions: 'Progressions',
  journal: 'Cahier-journal',
  assessments: 'Évaluations',
  competencies: 'Compétences',
  resources: 'Ressources',
  documents: 'Documents',
  ai: 'IA',
  direction: 'Direction',
  settings: 'Paramètres',
};

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center gap-1 text-sm text-gray-500">
      <Link href="/dashboard" className="hover:text-primary-900">
        Accueil
      </Link>
      {segments.map((segment, i) => (
        <span key={segment} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {i === segments.length - 1 ? (
            <span className="font-medium text-primary-900">{labels[segment] || segment}</span>
          ) : (
            <Link href={`/${segments.slice(0, i + 1).join('/')}`} className="hover:text-primary-900">
              {labels[segment] || segment}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
