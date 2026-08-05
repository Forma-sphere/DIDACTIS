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
import type { Lesson, Sequence, ClassItem, Competency, PaginatedResponse } from '@/types';

type FormData = {
  sequenceId: string; classId: string; title: string;
  objective: string; content: string; duration: number;
  order: number; competencyIds: string[];
};

const emptyForm: FormData = {
  sequenceId: '', classId: '', title: '',
  objective: '', content: '', duration: 45,
  order: 0, competencyIds: [],
};

export default function PreparationsPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canArchive = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<Lesson> | null>(null);
  const [loading, setLoading] = useState(true);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [search, setSearch] = useState('');
  const [filterSequenceId, setFilterSequenceId] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchLessons = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterSequenceId) params.set('sequenceId', filterSequenceId);
      if (showArchived) params.set('archived', 'true');
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Lesson>>(`/lessons?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [seqRes, classRes, compRes] = await Promise.all([
        api.get<PaginatedResponse<Sequence>>('/sequences?limit=200'),
        api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
        api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
      ]);
      setSequences(seqRes.data.data);
      setClasses(classRes.data.data);
      setCompetencies(compRes.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchReferenceData(); }, []);
  useEffect(() => { fetchLessons(); }, [search, filterSequenceId, showArchived, page]);

  const sequenceOptions = [
    { value: '', label: 'Toutes les séquences' },
    ...sequences.filter((s) => !s.isArchived).map((s) => ({ value: s.id, label: s.title })),
  ];

  const sequenceFormOptions = [
    { value: '', label: 'Sélectionner une séquence' },
    ...sequences.filter((s) => !s.isArchived).map((s) => ({ value: s.id, label: s.title })),
  ];

  const classOptions = [
    { value: '', label: 'Sélectionner une classe' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  const openCreate = () => {
    setEditingLesson(null);
    setForm(emptyForm);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setForm({
      sequenceId: lesson.sequenceId,
      classId: lesson.classId,
      title: lesson.title,
      objective: lesson.objective,
      content: lesson.content,
      duration: lesson.duration,
      order: lesson.order,
      competencyIds: lesson.competencies.map((c) => c.competencyId),
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
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
    if (!form.sequenceId) errs.sequenceId = 'La séquence est requise';
    if (!form.classId) errs.classId = 'La classe est requise';
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    if (!form.objective.trim()) errs.objective = "L'objectif est requis";
    if (!form.content.trim()) errs.content = 'Le déroulement est requis';
    if (!form.duration || form.duration < 1) errs.duration = 'La durée est requise';
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
        sequenceId: form.sequenceId,
        classId: form.classId,
        title: form.title,
        objective: form.objective,
        content: form.content,
        duration: form.duration,
        order: form.order,
        competencyIds: form.competencyIds,
      };
      if (editingLesson) {
        await api.patch(`/lessons/${editingLesson.id}`, payload);
      } else {
        await api.post('/lessons', payload);
      }
      setModalOpen(false);
      fetchLessons();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (lesson: Lesson) => {
    try {
      await api.delete(`/lessons/${lesson.id}`);
      fetchLessons();
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

  const lessons = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Préparations</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle préparation
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
          <div className="min-w-[200px]">
            <Select
              id="filterSequence"
              value={filterSequenceId}
              onChange={(e) => { setFilterSequenceId(e.target.value); setPage(1); }}
              options={sequenceOptions}
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

        {lessons.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucune préparation enregistrée.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Séquence</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Durée</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lessons.map((lesson) => (
                  <tr key={lesson.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{lesson.title}</td>
                    <td className="px-4 py-3 text-gray-600">{lesson.sequence?.title || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{lesson.class?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{lesson.duration} min</td>
                    <td className="px-4 py-3">
                      <Badge variant={lesson.isArchived ? 'warning' : 'success'}>
                        {lesson.isArchived ? 'Archivée' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/preparations/${lesson.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(lesson)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(lesson)}>
                            {lesson.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
            <p className="text-sm text-gray-500">{result.total} préparation{result.total > 1 ? 's' : ''} au total</p>
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
        title={editingLesson ? 'Modifier la préparation' : 'Nouvelle préparation'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Select
            id="sequenceId"
            label="Séquence"
            value={form.sequenceId}
            onChange={(e) => { setForm((p) => ({ ...p, sequenceId: e.target.value })); setErrors((p) => ({ ...p, sequenceId: '' })); }}
            options={sequenceFormOptions}
            error={errors.sequenceId}
          />

          <Select
            id="classId"
            label="Classe"
            value={form.classId}
            onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }}
            options={classOptions}
            error={errors.classId}
          />

          <Input
            id="title"
            label="Titre"
            value={form.title}
            onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }}
            error={errors.title}
            autoFocus
          />

          <div>
            <label htmlFor="objective" className="mb-1 block text-sm font-medium text-primary-900">Objectif</label>
            <textarea
              id="objective"
              rows={2}
              value={form.objective}
              onChange={(e) => { setForm((p) => ({ ...p, objective: e.target.value })); setErrors((p) => ({ ...p, objective: '' })); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {errors.objective && <p className="mt-1 text-xs text-red-600">{errors.objective}</p>}
          </div>

          <div>
            <label htmlFor="content" className="mb-1 block text-sm font-medium text-primary-900">Déroulement</label>
            <textarea
              id="content"
              rows={4}
              value={form.content}
              onChange={(e) => { setForm((p) => ({ ...p, content: e.target.value })); setErrors((p) => ({ ...p, content: '' })); }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
            {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
          </div>

          <Input
            id="duration"
            label="Durée (minutes)"
            type="number"
            min={1}
            value={String(form.duration)}
            onChange={(e) => { setForm((p) => ({ ...p, duration: parseInt(e.target.value) || 0 })); setErrors((p) => ({ ...p, duration: '' })); }}
            error={errors.duration}
          />

          <Input
            id="order"
            label="Ordre"
            type="number"
            min={0}
            value={String(form.order)}
            onChange={(e) => { setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 })); setErrors((p) => ({ ...p, order: '' })); }}
          />

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
              {saving ? 'Enregistrement...' : editingLesson ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
