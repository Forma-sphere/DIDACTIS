'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, BookOpen, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Lesson, Sequence, ClassItem, Competency, PaginatedResponse } from '@/types';

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'resources', label: 'Ressources liées' },
  { key: 'ai', label: 'IA' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function PreparationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchLesson = async () => {
    try {
      const { data } = await api.get<Lesson>(`/lessons/${id}`);
      setLesson(data);
    } catch {
      router.push('/preparations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLesson(); }, [id]);

  if (loading || !lesson) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/preparations">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{lesson.title}</h1>
          <p className="text-sm text-gray-500">
            {lesson.sequence?.title} · {lesson.class?.name} · {lesson.duration} min
          </p>
        </div>
        <Badge variant="info">{lesson.competencies.length} compétence{lesson.competencies.length > 1 ? 's' : ''}</Badge>
        <Badge variant={lesson.isArchived ? 'warning' : 'success'}>
          {lesson.isArchived ? 'Archivée' : 'Active'}
        </Badge>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-700'
                  : 'border-transparent text-gray-500 hover:text-primary-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'info' && <LessonInfoTab lesson={lesson} canWrite={canWrite} onUpdated={fetchLesson} />}
      {activeTab === 'resources' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-primary-900">Ressources liées</h3>
            <p className="mt-1 text-sm text-gray-500">Cette section sera disponible prochainement.</p>
          </div>
        </Card>
      )}
      {activeTab === 'ai' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Sparkles className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-primary-900">IA</h3>
            <p className="mt-1 text-sm text-gray-500">Cette section sera disponible prochainement.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function LessonInfoTab({ lesson, canWrite, onUpdated }: { lesson: Lesson; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
  const [form, setForm] = useState({
    sequenceId: lesson.sequenceId, classId: lesson.classId,
    title: lesson.title, objective: lesson.objective,
    content: lesson.content, duration: lesson.duration,
    order: lesson.order,
    competencyIds: lesson.competencies.map((c) => c.competencyId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      sequenceId: lesson.sequenceId, classId: lesson.classId,
      title: lesson.title, objective: lesson.objective,
      content: lesson.content, duration: lesson.duration,
      order: lesson.order,
      competencyIds: lesson.competencies.map((c) => c.competencyId),
    });
    setEditing(false);
  }, [lesson]);

  const startEdit = async () => {
    const [seqRes, classRes, compRes] = await Promise.all([
      api.get<PaginatedResponse<Sequence>>('/sequences?limit=200'),
      api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
      api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
    ]);
    setSequences(seqRes.data.data);
    setClasses(classRes.data.data);
    setAllCompetencies(compRes.data.data);
    setEditing(true);
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/lessons/${lesson.id}`, {
        sequenceId: form.sequenceId,
        classId: form.classId,
        title: form.title,
        objective: form.objective,
        content: form.content,
        duration: form.duration,
        order: form.order,
        competencyIds: form.competencyIds,
      });
      setEditing(false);
      onUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-900">Informations générales</h2>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={startEdit}>
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ['Titre', lesson.title],
              ['Séquence', lesson.sequence?.title],
              ['Classe', lesson.class?.name],
              ['Enseignant', lesson.class?.teacher ? `${lesson.class.teacher.firstName} ${lesson.class.teacher.lastName}` : null],
              ['École', lesson.sequence?.progression?.school?.name],
              ['Durée', `${lesson.duration} min`],
              ['Ordre', String(lesson.order)],
              ['Statut', lesson.isArchived ? 'Archivée' : 'Active'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Objectif</h2>
          <p className="text-sm text-primary-900 whitespace-pre-line">{lesson.objective}</p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Déroulement</h2>
          <p className="text-sm text-primary-900 whitespace-pre-line">{lesson.content}</p>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Compétences ({lesson.competencies.length})
          </h2>
          {lesson.competencies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune compétence associée.</p>
          ) : (
            <div className="space-y-1">
              {lesson.competencies.map((lc) => (
                <div key={lc.competencyId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <Badge variant="info">{lc.competency.code}</Badge>
                  <span className="text-primary-900">{lc.competency.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{lc.competency.domain}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const sequenceOptions = [
    { value: '', label: 'Sélectionner' },
    ...sequences.filter((s) => !s.isArchived).map((s) => ({ value: s.id, label: s.title })),
  ];

  const classOptions = [
    { value: '', label: 'Sélectionner' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la préparation</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Select id="sequenceId" label="Séquence" value={form.sequenceId} onChange={(e) => { setForm((p) => ({ ...p, sequenceId: e.target.value })); setErrors((p) => ({ ...p, sequenceId: '' })); }} options={sequenceOptions} error={errors.sequenceId} />

        <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />

        <Input id="title" label="Titre" value={form.title} onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }} error={errors.title} autoFocus />

        <div>
          <label htmlFor="objective" className="mb-1 block text-sm font-medium text-primary-900">Objectif</label>
          <textarea id="objective" rows={2} value={form.objective} onChange={(e) => { setForm((p) => ({ ...p, objective: e.target.value })); setErrors((p) => ({ ...p, objective: '' })); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
          {errors.objective && <p className="mt-1 text-xs text-red-600">{errors.objective}</p>}
        </div>

        <div>
          <label htmlFor="content" className="mb-1 block text-sm font-medium text-primary-900">Déroulement</label>
          <textarea id="content" rows={4} value={form.content} onChange={(e) => { setForm((p) => ({ ...p, content: e.target.value })); setErrors((p) => ({ ...p, content: '' })); }} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
          {errors.content && <p className="mt-1 text-xs text-red-600">{errors.content}</p>}
        </div>

        <Input id="duration" label="Durée (minutes)" type="number" min={1} value={String(form.duration)} onChange={(e) => { setForm((p) => ({ ...p, duration: parseInt(e.target.value) || 0 })); setErrors((p) => ({ ...p, duration: '' })); }} error={errors.duration} />

        <Input id="order" label="Ordre" type="number" min={0} value={String(form.order)} onChange={(e) => { setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 })); setErrors((p) => ({ ...p, order: '' })); }} />

        <div>
          <label className="mb-1 block text-sm font-medium text-primary-900">Compétences</label>
          {errors.competencies && <p className="mb-1 text-xs text-red-600">{errors.competencies}</p>}
          {form.competencyIds.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {form.competencyIds.map((cid) => {
                const comp = allCompetencies.find((c) => c.id === cid);
                return comp ? (
                  <span key={cid} className="inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-xs text-accent-700">
                    {comp.code}
                    <button type="button" onClick={() => toggleCompetency(cid)} className="hover:text-accent-900"><X className="h-3 w-3" /></button>
                  </span>
                ) : null;
              })}
            </div>
          )}
          <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-300 p-2">
            {allCompetencies.filter((c) => !c.isArchived).map((comp) => (
              <label key={comp.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={form.competencyIds.includes(comp.id)} onChange={() => toggleCompetency(comp.id)} className="rounded border-gray-300 text-accent-500 focus:ring-accent-500" />
                <span className="font-medium text-accent-700">{comp.code}</span>
                <span className="text-gray-600">{comp.name}</span>
                <span className="ml-auto text-xs text-gray-400">{comp.domain}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => setEditing(false)}>Annuler</Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
