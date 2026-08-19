'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Eye, Pencil, Archive, ArchiveRestore, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { ClassItem, School, SchoolYear, User, PaginatedResponse, Level, Cycle } from '@/types';

const levelLabels: Record<Level, string> = {
  TPS: 'TPS', PS: 'PS', MS: 'MS', GS: 'GS',
  CP: 'CP', CE1: 'CE1', CE2: 'CE2', CM1: 'CM1', CM2: 'CM2',
};

const cycleLabels: Record<Cycle, string> = {
  CYCLE_1: 'Cycle 1', CYCLE_2: 'Cycle 2', CYCLE_3: 'Cycle 3',
};

const levelOptions = [
  { value: 'TPS', label: 'TPS' }, { value: 'PS', label: 'PS' },
  { value: 'MS', label: 'MS' }, { value: 'GS', label: 'GS' },
  { value: 'CP', label: 'CP' }, { value: 'CE1', label: 'CE1' },
  { value: 'CE2', label: 'CE2' }, { value: 'CM1', label: 'CM1' },
  { value: 'CM2', label: 'CM2' },
];

const cycleOptions = [
  { value: 'CYCLE_1', label: 'Cycle 1' },
  { value: 'CYCLE_2', label: 'Cycle 2' },
  { value: 'CYCLE_3', label: 'Cycle 3' },
];

const levelToCycle: Record<Level, Cycle> = {
  TPS: 'CYCLE_1', PS: 'CYCLE_1', MS: 'CYCLE_1', GS: 'CYCLE_1',
  CP: 'CYCLE_2', CE1: 'CYCLE_2', CE2: 'CYCLE_2',
  CM1: 'CYCLE_3', CM2: 'CYCLE_3',
};

type FormData = {
  name: string; schoolId: string; schoolYearId: string; teacherId: string;
  level: Level; cycle: Cycle; capacity: number;
};

const emptyForm: FormData = {
  name: '', schoolId: '', schoolYearId: '', teacherId: '',
  level: 'CP', cycle: 'CYCLE_2', capacity: 30,
};

export default function ClassesPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';
  const canArchive = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<ClassItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClasses = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showArchived) params.set('archived', 'true');
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<ClassItem>>(`/classes?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [schoolsRes, teachersRes] = await Promise.all([
        api.get<School[]>('/schools'),
        api.get<PaginatedResponse<User>>('/users?limit=200&isActive=true'),
      ]);
      setSchools(schoolsRes.data);
      setTeachers(teachersRes.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchReferenceData(); }, []);
  useEffect(() => { fetchClasses(); }, [search, showArchived, page]);

  const fetchYearsForSchool = async (schoolId: string) => {
    if (!schoolId) { setSchoolYears([]); return; }
    try {
      const { data } = await api.get<School>(`/schools/${schoolId}`);
      setSchoolYears(data.schoolYears || []);
    } catch {
      setSchoolYears([]);
    }
  };

  const schoolOptions = [{ value: '', label: 'Sélectionner une école' }, ...schools.map((s) => ({ value: s.id, label: s.name }))];
  const yearOptions = [{ value: '', label: 'Sélectionner une année' }, ...schoolYears.map((y) => ({ value: y.id, label: y.name }))];
  const teacherOptions = [{ value: '', label: 'Sélectionner un enseignant' }, ...teachers.map((t) => ({ value: t.id, label: `${t.lastName} ${t.firstName}` }))];

  const openCreate = () => {
    setEditingClass(null);
    setForm(emptyForm);
    setSchoolYears([]);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (cls: ClassItem) => {
    setEditingClass(cls);
    setForm({
      name: cls.name,
      schoolId: cls.schoolId,
      schoolYearId: cls.schoolYearId,
      teacherId: cls.teacherId,
      level: cls.level,
      cycle: cls.cycle,
      capacity: cls.capacity,
    });
    fetchYearsForSchool(cls.schoolId);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.schoolId) errs.schoolId = 'L\'école est requise';
    if (!form.schoolYearId) errs.schoolYearId = 'L\'année scolaire est requise';
    if (!form.teacherId) errs.teacherId = 'L\'enseignant est requis';
    if (!form.level) errs.level = 'Le niveau est requis';
    if (!form.cycle) errs.cycle = 'Le cycle est requis';
    if (form.capacity < 1) errs.capacity = 'La capacité doit être supérieure à 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingClass) {
        await api.patch(`/classes/${editingClass.id}`, form);
      } else {
        await api.post('/classes', form);
      }
      setModalOpen(false);
      fetchClasses();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (cls: ClassItem) => {
    try {
      await api.delete(`/classes/${cls.id}`);
      fetchClasses();
    } catch {
      // ignore
    }
  };

  const handleSchoolChange = (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, schoolYearId: '' }));
    setErrors((p) => ({ ...p, schoolId: '', schoolYearId: '' }));
    fetchYearsForSchool(schoolId);
  };

  const handleLevelChange = (level: Level) => {
    setForm((p) => ({ ...p, level, cycle: levelToCycle[level] }));
    setErrors((p) => ({ ...p, level: '', cycle: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const classes = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Classes</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle classe
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou enseignant..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => { setShowArchived(e.target.checked); setPage(1); }}
              className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
            />
            Afficher les archives
          </label>
        </div>

        {classes.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucune classe enregistrée.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Niveau</th>
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Enseignant</th>
                  <th className="px-4 py-3">École</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{cls.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{levelLabels[cls.level]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cycleLabels[cls.cycle]}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {cls.teacher ? `${cls.teacher.lastName} ${cls.teacher.firstName}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{cls.school?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={cls.isArchived ? 'warning' : 'success'}>
                        {cls.isArchived ? 'Archivée' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/classes/${cls.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(cls)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(cls)}>
                            {cls.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && result.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">{result.total} classe{result.total > 1 ? 's' : ''} au total</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">Page {result.page} / {result.totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= result.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingClass ? 'Modifier la classe' : 'Nouvelle classe'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Input
            id="className"
            label="Nom de la classe"
            value={form.name}
            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
            error={errors.name}
            autoFocus
          />

          <Select
            id="schoolId"
            label="École"
            value={form.schoolId}
            onChange={(e) => handleSchoolChange(e.target.value)}
            options={schoolOptions}
            error={errors.schoolId}
          />

          <Select
            id="schoolYearId"
            label="Année scolaire"
            value={form.schoolYearId}
            onChange={(e) => { setForm((p) => ({ ...p, schoolYearId: e.target.value })); setErrors((p) => ({ ...p, schoolYearId: '' })); }}
            options={yearOptions}
            error={errors.schoolYearId}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              id="level"
              label="Niveau"
              value={form.level}
              onChange={(e) => handleLevelChange(e.target.value as Level)}
              options={levelOptions}
              error={errors.level}
            />
            <Select
              id="cycle"
              label="Cycle"
              value={form.cycle}
              onChange={(e) => { setForm((p) => ({ ...p, cycle: e.target.value as Cycle })); setErrors((p) => ({ ...p, cycle: '' })); }}
              options={cycleOptions}
              error={errors.cycle}
            />
          </div>

          <Select
            id="teacherId"
            label="Enseignant"
            value={form.teacherId}
            onChange={(e) => { setForm((p) => ({ ...p, teacherId: e.target.value })); setErrors((p) => ({ ...p, teacherId: '' })); }}
            options={teacherOptions}
            error={errors.teacherId}
          />

          <Input
            id="capacity"
            label="Capacité"
            type="number"
            min={1}
            value={String(form.capacity)}
            onChange={(e) => { setForm((p) => ({ ...p, capacity: parseInt(e.target.value) || 1 })); setErrors((p) => ({ ...p, capacity: '' })); }}
            error={errors.capacity}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingClass ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
