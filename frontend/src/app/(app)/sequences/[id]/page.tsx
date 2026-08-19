'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, BookOpen, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Sequence, Progression, Competency, PaginatedResponse } from '@/types';

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'preparations', label: 'Préparations liées' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchSequence = async () => {
    try {
      const { data } = await api.get<Sequence>(`/sequences/${id}`);
      setSequence(data);
    } catch {
      router.push('/sequences');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSequence(); }, [id]);

  if (loading || !sequence) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sequences">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{sequence.title}</h1>
          <p className="text-sm text-gray-500">
            {sequence.progression?.title} · {sequence.progression?.class?.name}
          </p>
        </div>
        <Badge variant="info">{sequence.competencies.length} compétence{sequence.competencies.length > 1 ? 's' : ''}</Badge>
        <Badge variant={sequence.isArchived ? 'warning' : 'success'}>
          {sequence.isArchived ? 'Archivée' : 'Active'}
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

      {activeTab === 'info' && <SequenceInfoTab sequence={sequence} canWrite={canWrite} onUpdated={fetchSequence} />}
      {activeTab === 'preparations' && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-medium text-primary-900">Préparations liées</h3>
            <p className="mt-1 text-sm text-gray-500">Cette section sera disponible prochainement.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function SequenceInfoTab({ sequence, canWrite, onUpdated }: { sequence: Sequence; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [progressions, setProgressions] = useState<Progression[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
  const [form, setForm] = useState({
    progressionId: sequence.progressionId, title: sequence.title,
    description: sequence.description || '', order: sequence.order,
    competencyIds: sequence.competencies.map((c) => c.competencyId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      progressionId: sequence.progressionId, title: sequence.title,
      description: sequence.description || '', order: sequence.order,
      competencyIds: sequence.competencies.map((c) => c.competencyId),
    });
    setEditing(false);
  }, [sequence]);

  const startEdit = async () => {
    const [progsRes, compsRes] = await Promise.all([
      api.get<PaginatedResponse<Progression>>('/progressions?limit=200'),
      api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
    ]);
    setProgressions(progsRes.data.data);
    setAllCompetencies(compsRes.data.data);
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
    if (!form.progressionId) errs.progressionId = 'La progression est requise';
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    if (form.order < 0) errs.order = "L'ordre est requis";
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
      await api.patch(`/sequences/${sequence.id}`, {
        progressionId: form.progressionId,
        title: form.title,
        description: form.description || undefined,
        order: form.order,
        competencies: form.competencyIds.map((competencyId, i) => ({ competencyId, order: i })),
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
              ['Titre', sequence.title],
              ['Progression', sequence.progression?.title],
              ['Classe', sequence.progression?.class?.name],
              ['École', sequence.progression?.school?.name],
              ['Année scolaire', sequence.progression?.schoolYear?.name],
              ['Ordre', String(sequence.order)],
              ['Statut', sequence.isArchived ? 'Archivée' : 'Active'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {sequence.description && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{sequence.description}</dd>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Compétences ({sequence.competencies.length})
          </h2>
          {sequence.competencies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune compétence associée.</p>
          ) : (
            <div className="space-y-1">
              {sequence.competencies.map((sc) => (
                <div key={sc.competencyId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <Badge variant="info">{sc.competency.code}</Badge>
                  <span className="text-primary-900">{sc.competency.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{sc.competency.domain}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const progressionOptions = [
    { value: '', label: 'Sélectionner' },
    ...progressions.filter((p) => !p.isArchived).map((p) => ({ value: p.id, label: p.title })),
  ];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la séquence</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Select id="progressionId" label="Progression" value={form.progressionId} onChange={(e) => { setForm((p) => ({ ...p, progressionId: e.target.value })); setErrors((p) => ({ ...p, progressionId: '' })); }} options={progressionOptions} error={errors.progressionId} />

        <Input id="title" label="Titre" value={form.title} onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }} error={errors.title} autoFocus />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
          <textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>

        <Input id="order" label="Ordre" type="number" min={0} value={String(form.order)} onChange={(e) => { setForm((p) => ({ ...p, order: parseInt(e.target.value) || 0 })); setErrors((p) => ({ ...p, order: '' })); }} error={errors.order} />

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
