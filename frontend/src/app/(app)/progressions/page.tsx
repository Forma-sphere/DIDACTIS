'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Eye, Pencil, Archive, ArchiveRestore, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Progression, School, ClassItem, SchoolYear, Competency, PaginatedResponse } from '@/types';

type FormData = {
  title: string; description: string; schoolId: string;
  classId: string; schoolYearId: string; competencyIds: string[];
};

const emptyForm: FormData = {
  title: '', description: '', schoolId: '',
  classId: '', schoolYearId: '', competencyIds: [],
};

export default function ProgressionsPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canArchive = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<Progression> | null>(null);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProgression, setEditingProgression] = useState<Progression | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProgressions = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showArchived) params.set('archived', 'true');
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Progression>>(`/progressions?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [schoolsRes, classesRes, compsRes] = await Promise.all([
        api.get<School[]>('/schools'),
        api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
        api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
      ]);
      setSchools(schoolsRes.data);
      setClasses(classesRes.data.data);
      setCompetencies(compsRes.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchReferenceData(); }, []);
  useEffect(() => { fetchProgressions(); }, [search, showArchived, page]);

  const fetchYearsForSchool = async (schoolId: string) => {
    if (!schoolId) { setSchoolYears([]); return; }
    try {
      const { data } = await api.get<School>(`/schools/${schoolId}`);
      setSchoolYears(data.schoolYears || []);
    } catch {
      setSchoolYears([]);
    }
  };

  const filteredClasses = form.schoolId
    ? classes.filter((c) => c.schoolId === form.schoolId && !c.isArchived)
    : classes.filter((c) => !c.isArchived);

  const schoolOptions = [{ value: '', label: 'Sélectionner une école' }, ...schools.map((s) => ({ value: s.id, label: s.name }))];
  const classOptions = [{ value: '', label: 'Sélectionner une classe' }, ...filteredClasses.map((c) => ({ value: c.id, label: c.name }))];
  const yearOptions = [{ value: '', label: 'Sélectionner une année' }, ...schoolYears.map((y) => ({ value: y.id, label: y.name }))];

  const openCreate = () => {
    setEditingProgression(null);
    setForm(emptyForm);
    setSchoolYears([]);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (prog: Progression) => {
    setEditingProgression(prog);
    setForm({
      title: prog.title,
      description: prog.description || '',
      schoolId: prog.schoolId,
      classId: prog.classId,
      schoolYearId: prog.schoolYearId,
      competencyIds: prog.competencies.map((c) => c.competencyId),
    });
    fetchYearsForSchool(prog.schoolId);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const handleSchoolChange = (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, classId: '', schoolYearId: '' }));
    setErrors((p) => ({ ...p, schoolId: '', classId: '', schoolYearId: '' }));
    fetchYearsForSchool(schoolId);
  };

  const toggleCompetency = (compId: string) => {
    setForm((p) => ({
      ...p,
      competencyIds: p.competencyIds.includes(compId)
        ? p.competencyIds.filter((id) => id !== compId)
        : [...p.competencyIds, compId],
    }));
    setErrors((p) => ({ ...p, competencies: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    if (!form.schoolId) errs.schoolId = "L'école est requise";
    if (!form.classId) errs.classId = 'La classe est requise';
    if (!form.schoolYearId) errs.schoolYearId = "L'année scolaire est requise";
    if (form.competencyIds.length === 0) errs.competencies = 'Au moins une compétence est requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        schoolId: form.schoolId,
        classId: form.classId,
        schoolYearId: form.schoolYearId,
        competencies: form.competencyIds.map((competencyId, i) => ({ competencyId, order: i })),
      };
      if (editingProgression) {
        await api.patch(`/progressions/${editingProgression.id}`, payload);
      } else {
        await api.post('/progressions', payload);
      }
      setModalOpen(false);
      fetchProgressions();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (prog: Progression) => {
    try {
      await api.delete(`/progressions/${prog.id}`);
      fetchProgressions();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const progressions = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Progressions</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle progression
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre..."
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

        {progressions.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucune progression enregistrée.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Année scolaire</th>
                  <th className="px-4 py-3">Compétences</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {progressions.map((prog) => (
                  <tr key={prog.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{prog.title}</td>
                    <td className="px-4 py-3 text-gray-600">{prog.class?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{prog.schoolYear?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{prog.competencies.length}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={prog.isArchived ? 'warning' : 'success'}>
                        {prog.isArchived ? 'Archivée' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/progressions/${prog.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(prog)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(prog)}>
                            {prog.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
            <p className="text-sm text-gray-500">{result.total} progression{result.total > 1 ? 's' : ''} au total</p>
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
        title={editingProgression ? 'Modifier la progression' : 'Nouvelle progression'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Input
            id="title"
            label="Titre"
            value={form.title}
            onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }}
            error={errors.title}
            autoFocus
          />

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
            <textarea
              id="description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <Select id="schoolId" label="École" value={form.schoolId} onChange={(e) => handleSchoolChange(e.target.value)} options={schoolOptions} error={errors.schoolId} />
          <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />
          <Select id="schoolYearId" label="Année scolaire" value={form.schoolYearId} onChange={(e) => { setForm((p) => ({ ...p, schoolYearId: e.target.value })); setErrors((p) => ({ ...p, schoolYearId: '' })); }} options={yearOptions} error={errors.schoolYearId} />

          <div>
            <label className="mb-1 block text-sm font-medium text-primary-900">Compétences</label>
            {errors.competencies && <p className="mb-1 text-xs text-red-600">{errors.competencies}</p>}
            {form.competencyIds.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {form.competencyIds.map((id) => {
                  const comp = competencies.find((c) => c.id === id);
                  return comp ? (
                    <span key={id} className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-700">
                      {comp.code}
                      <button type="button" onClick={() => toggleCompetency(id)} className="hover:text-accent-900">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-2">
              {competencies.filter((c) => !c.isArchived).length === 0 ? (
                <p className="text-xs text-gray-400 py-2 text-center">Aucune compétence disponible</p>
              ) : (
                competencies.filter((c) => !c.isArchived).map((comp) => (
                  <label key={comp.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.competencyIds.includes(comp.id)}
                      onChange={() => toggleCompetency(comp.id)}
                      className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
                    />
                    <span className="font-medium text-accent-700">{comp.code}</span>
                    <span className="text-gray-600">{comp.name}</span>
                    <span className="ml-auto text-xs text-gray-400">{comp.domain}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingProgression ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
