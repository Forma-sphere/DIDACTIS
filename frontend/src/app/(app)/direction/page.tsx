'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  BarChart3, Calendar, Users as UsersIcon, GraduationCap, BookOpen,
  ClipboardCheck, Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Briefcase, School,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import type {
  DirectionDashboard, Meeting, Project, ProjectStatus, PaginatedResponse,
} from '@/types';

const tabs = [
  { key: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { key: 'calendar', label: 'Calendrier', icon: Calendar },
  { key: 'meetings', label: 'Réunions', icon: UsersIcon },
  { key: 'projects', label: 'Projets', icon: Briefcase },
  { key: 'indicators', label: 'Indicateurs', icon: BarChart3 },
] as const;

type Tab = (typeof tabs)[number]['key'];

const statusLabels: Record<ProjectStatus, string> = {
  PLANNED: 'Planifié',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

const statusColors: Record<ProjectStatus, string> = {
  PLANNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export default function DirectionPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Direction</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-700'
                  : 'border-transparent text-gray-500 hover:text-primary-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'dashboard' && <DashboardTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'meetings' && <MeetingsTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'indicators' && <IndicatorsTab />}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────────────────────

function DashboardTab() {
  const [data, setData] = useState<DirectionDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: d } = await api.get<DirectionDashboard>('/direction/dashboard');
        setData(d);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="Impossible de charger les données." />;

  const stats = [
    { label: 'Classes', value: data.classCount, icon: School, color: 'bg-blue-50 text-blue-600' },
    { label: 'Élèves', value: data.studentCount, icon: GraduationCap, color: 'bg-green-50 text-green-600' },
    { label: 'Enseignants', value: data.teacherCount, icon: UsersIcon, color: 'bg-purple-50 text-purple-600' },
    { label: 'Évaluations', value: data.assessmentCount, icon: ClipboardCheck, color: 'bg-orange-50 text-orange-600' },
    { label: 'Préparations', value: data.lessonCount, icon: BookOpen, color: 'bg-accent-50 text-accent-600' },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label} className="flex items-center gap-4">
          <div className={`rounded-lg p-3 ${s.color}`}>
            <s.icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-900">{s.value}</p>
            <p className="text-sm text-gray-500">{s.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Calendar Tab ───────────────────────────────────────────────

function CalendarTab() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mRes, pRes] = await Promise.all([
          api.get<PaginatedResponse<Meeting>>('/direction/meetings?limit=100'),
          api.get<PaginatedResponse<Project>>('/direction/projects?limit=100'),
        ]);
        setMeetings(mRes.data.data);
        setProjects(pRes.data.data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= totalDays; d++) days.push(d);

  const fmt = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayMeetings = meetings.filter((m) => fmt(m.date) === dateStr);
    const dayProjects = projects.filter((p) => fmt(p.startDate) === dateStr || (p.endDate && fmt(p.endDate) === dateStr));
    return { meetings: dayMeetings, projects: dayProjects };
  };

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold text-primary-900 capitalize">{monthLabel}</h2>
        <Button variant="outline" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-gray-50 py-2 text-center text-xs font-medium text-gray-500">{d}</div>
        ))}
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`e-${i}`} className="bg-white min-h-[80px]" />;
          }
          const events = getEventsForDay(day);
          const today = new Date();
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

          return (
            <div key={day} className={`bg-white min-h-[80px] p-1 ${isToday ? 'ring-2 ring-inset ring-accent-500' : ''}`}>
              <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                isToday ? 'bg-accent-500 text-white font-bold' : 'text-gray-700'
              }`}>
                {day}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {events.meetings.map((m) => (
                  <div key={m.id} className="truncate rounded bg-blue-100 px-1 text-[10px] text-blue-700">{m.title}</div>
                ))}
                {events.projects.map((p) => (
                  <div key={p.id} className="truncate rounded bg-green-100 px-1 text-[10px] text-green-700">{p.title}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-blue-100 border border-blue-300" /> Réunions</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-100 border border-green-300" /> Projets</span>
      </div>
    </Card>
  );
}

// ─── Meetings Tab ───────────────────────────────────────────────

function MeetingsTab() {
  const [result, setResult] = useState<PaginatedResponse<Meeting> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

  const fetchMeetings = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Meeting>>(`/direction/meetings?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, [search, page]);

  const handleDelete = async (id: string) => {
    try { await api.delete(`/direction/meetings/${id}`); fetchMeetings(); } catch { /* ignore */ }
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    fetchMeetings();
  };

  if (loading) return <Spinner />;

  const meetings = result?.data || [];

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une réunion..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Nouvelle réunion
          </Button>
        </div>

        {meetings.length === 0 ? (
          <EmptyState message={result?.total === 0 ? 'Aucune réunion.' : 'Aucun résultat.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{m.title}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(m.date).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{m.description || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(m); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.totalPages > 1 && (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            label="réunion"
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
      </Card>

      <MeetingModal
        open={modalOpen}
        meeting={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />
    </>
  );
}

function MeetingModal({ open, meeting, onClose, onSaved }: {
  open: boolean; meeting: Meeting | null; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTitle(meeting?.title || '');
      setDescription(meeting?.description || '');
      setDate(meeting ? new Date(meeting.date).toISOString().split('T')[0] : '');
      setErrors({});
    }
  }, [open, meeting]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Le titre est obligatoire';
    if (!date) errs.date = 'La date est obligatoire';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = { title: title.trim(), description: description.trim() || undefined, date };
      if (meeting) {
        await api.patch(`/direction/meetings/${meeting.id}`, payload);
      } else {
        await api.post('/direction/meetings', payload);
      }
      onSaved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={meeting ? 'Modifier la réunion' : 'Nouvelle réunion'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="m-title" label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <div className="space-y-1">
          <label htmlFor="m-desc" className="block text-sm font-medium text-primary-900">Description</label>
          <textarea
            id="m-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <Input id="m-date" label="Date *" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Projects Tab ───────────────────────────────────────────────

function ProjectsTab() {
  const [result, setResult] = useState<PaginatedResponse<Project> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Project>>(`/direction/projects?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, [search, page]);

  const handleDelete = async (id: string) => {
    try { await api.delete(`/direction/projects/${id}`); fetchProjects(); } catch { /* ignore */ }
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditing(null);
    fetchProjects();
  };

  if (loading) return <Spinner />;

  const projects = result?.data || [];

  return (
    <>
      <Card>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un projet..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <Button onClick={() => { setEditing(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Nouveau projet
          </Button>
        </div>

        {projects.length === 0 ? (
          <EmptyState message={result?.total === 0 ? 'Aucun projet.' : 'Aucun résultat.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date début</th>
                  <th className="px-4 py-3">Date fin</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{p.title}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[p.status]}`}>
                        {statusLabels[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{new Date(p.startDate).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-gray-600">{p.endDate ? new Date(p.endDate).toLocaleDateString('fr-FR') : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => { setEditing(p); setModalOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.totalPages > 1 && (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            label="projet"
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
      </Card>

      <ProjectModal
        open={modalOpen}
        project={editing}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={handleSaved}
      />
    </>
  );
}

function ProjectModal({ open, project, onClose, onSaved }: {
  open: boolean; project: Project | null; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNED');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setTitle(project?.title || '');
      setDescription(project?.description || '');
      setStatus(project?.status || 'PLANNED');
      setStartDate(project ? new Date(project.startDate).toISOString().split('T')[0] : '');
      setEndDate(project?.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '');
      setErrors({});
    }
  }, [open, project]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Le titre est obligatoire';
    if (!status) errs.status = 'Le statut est obligatoire';
    if (!startDate) errs.startDate = 'La date de début est obligatoire';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        startDate,
        endDate: endDate || undefined,
      };
      if (project) {
        await api.patch(`/direction/projects/${project.id}`, payload);
      } else {
        await api.post('/direction/projects', payload);
      }
      onSaved();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={project ? 'Modifier le projet' : 'Nouveau projet'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input id="p-title" label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <div className="space-y-1">
          <label htmlFor="p-desc" className="block text-sm font-medium text-primary-900">Description</label>
          <textarea
            id="p-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="p-status" className="block text-sm font-medium text-primary-900">Statut *</label>
          <select
            id="p-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {(Object.keys(statusLabels) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{statusLabels[s]}</option>
            ))}
          </select>
          {errors.status && <p className="text-sm text-red-600">{errors.status}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input id="p-start" label="Date début *" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} error={errors.startDate} />
          <Input id="p-end" label="Date fin" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Indicators Tab ─────────────────────────────────────────────

function IndicatorsTab() {
  const [data, setData] = useState<DirectionDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data: d } = await api.get<DirectionDashboard>('/direction/dashboard');
        setData(d);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <EmptyState message="Impossible de charger les indicateurs." />;

  const max = Math.max(data.classCount, data.studentCount, data.teacherCount, data.lessonCount, data.assessmentCount, 1);

  const indicators = [
    { label: 'Classes', value: data.classCount, color: 'bg-blue-500' },
    { label: 'Élèves', value: data.studentCount, color: 'bg-green-500' },
    { label: 'Utilisateurs (enseignants)', value: data.teacherCount, color: 'bg-purple-500' },
    { label: 'Préparations', value: data.lessonCount, color: 'bg-accent-500' },
    { label: 'Évaluations', value: data.assessmentCount, color: 'bg-orange-500' },
  ];

  return (
    <Card>
      <h2 className="text-lg font-semibold text-primary-900 mb-6">Indicateurs de l&apos;école</h2>
      <div className="space-y-4">
        {indicators.map((ind) => (
          <div key={ind.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-primary-900">{ind.label}</span>
              <span className="text-sm font-bold text-primary-900">{ind.value}</span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100">
              <div
                className={`h-3 rounded-full ${ind.color} transition-all`}
                style={{ width: `${Math.max((ind.value / max) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-gray-500">{message}</p>;
}

function Pagination({ page, totalPages, total, label, onPrev, onNext }: {
  page: number; totalPages: number; total: number; label: string;
  onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
      <p className="text-sm text-gray-500">{total} {label}{total > 1 ? 's' : ''} au total</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-600">Page {page} / {totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
