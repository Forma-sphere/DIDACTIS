'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Save, Layers, BookOpen, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Progression, School, ClassItem, SchoolYear, Competency, PaginatedResponse } from '@/types';

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'annual', label: 'Vue annuelle' },
  { key: 'sequences', label: 'Séquences liées' },
  { key: 'preparations', label: 'Préparations liées' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function ProgressionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [progression, setProgression] = useState<Progression | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchProgression = async () => {
    try {
      const { data } = await api.get<Progression>(`/progressions/${id}`);
      setProgression(data);
    } catch {
      router.push('/progressions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProgression(); }, [id]);

  if (loading || !progression) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/progressions">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{progression.title}</h1>
          <p className="text-sm text-gray-500">
            {progression.class?.name} · {progression.schoolYear?.name}
          </p>
        </div>
        <Badge variant="info">{progression.competencies.length} compétence{progression.competencies.length > 1 ? 's' : ''}</Badge>
        <Badge variant={progression.isArchived ? 'warning' : 'success'}>
          {progression.isArchived ? 'Archivée' : 'Active'}
        </Badge>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
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

      {activeTab === 'info' && <ProgressionInfoTab progression={progression} canWrite={canWrite} onUpdated={fetchProgression} />}
      {activeTab === 'annual' && <AnnualViewTab progression={progression} />}
      {activeTab === 'sequences' && <PlaceholderTab icon={Layers} title="Séquences liées" />}
      {activeTab === 'preparations' && <PlaceholderTab icon={BookOpen} title="Préparations liées" />}
    </div>
  );
}

function PlaceholderTab({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-primary-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">Cette section sera disponible prochainement.</p>
      </div>
    </Card>
  );
}

function AnnualViewTab({ progression }: { progression: Progression }) {
  const periods = progression.schoolYear?.periods || [];
  const comps = progression.competencies;

  if (periods.length === 0) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-gray-500">
          Aucune période définie pour cette année scolaire.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {periods.map((period) => (
        <Card key={period.id}>
          <h3 className="text-md font-semibold text-primary-900 mb-3">{period.name}</h3>
          <p className="text-xs text-gray-500 mb-3">
            {new Date(period.startDate).toLocaleDateString('fr-FR')} — {new Date(period.endDate).toLocaleDateString('fr-FR')}
          </p>
          {comps.length > 0 ? (
            <div className="space-y-1">
              {comps.map((pc) => (
                <div key={pc.competencyId} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-gray-50">
                  <Badge variant="info">{pc.competency.code}</Badge>
                  <span className="text-primary-900">{pc.competency.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{pc.competency.domain}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Aucune compétence associée.</p>
          )}
        </Card>
      ))}
    </div>
  );
}

function ProgressionInfoTab({ progression, canWrite, onUpdated }: { progression: Progression; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
  const [form, setForm] = useState({
    title: progression.title, description: progression.description || '',
    schoolId: progression.schoolId, classId: progression.classId,
    schoolYearId: progression.schoolYearId,
    competencyIds: progression.competencies.map((c) => c.competencyId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: progression.title, description: progression.description || '',
      schoolId: progression.schoolId, classId: progression.classId,
      schoolYearId: progression.schoolYearId,
      competencyIds: progression.competencies.map((c) => c.competencyId),
    });
    setEditing(false);
  }, [progression]);

  const startEdit = async () => {
    const [schoolsRes, classesRes, compsRes] = await Promise.all([
      api.get<School[]>('/schools'),
      api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
      api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
    ]);
    setSchools(schoolsRes.data);
    setClasses(classesRes.data.data);
    setAllCompetencies(compsRes.data.data);
    if (progression.schoolId) {
      const { data } = await api.get<School>(`/schools/${progression.schoolId}`);
      setSchoolYears(data.schoolYears || []);
    }
    setEditing(true);
  };

  const handleSchoolChange = async (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, classId: '', schoolYearId: '' }));
    if (schoolId) {
      const { data } = await api.get<School>(`/schools/${schoolId}`);
      setSchoolYears(data.schoolYears || []);
    } else {
      setSchoolYears([]);
    }
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

  const filteredClasses = form.schoolId
    ? classes.filter((c) => c.schoolId === form.schoolId && !c.isArchived)
    : classes.filter((c) => !c.isArchived);

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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/progressions/${progression.id}`, {
        title: form.title,
        description: form.description || undefined,
        schoolId: form.schoolId,
        classId: form.classId,
        schoolYearId: form.schoolYearId,
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
              ['Titre', progression.title],
              ['École', progression.school?.name],
              ['Classe', progression.class?.name],
              ['Année scolaire', progression.schoolYear?.name],
              ['Statut', progression.isArchived ? 'Archivée' : 'Active'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {progression.description && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{progression.description}</dd>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Compétences ({progression.competencies.length})
          </h2>
          {progression.competencies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune compétence associée.</p>
          ) : (
            <div className="space-y-1">
              {progression.competencies.map((pc) => (
                <div key={pc.competencyId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <Badge variant="info">{pc.competency.code}</Badge>
                  <span className="text-primary-900">{pc.competency.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{pc.competency.domain}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const schoolOptions = [{ value: '', label: 'Sélectionner' }, ...schools.map((s) => ({ value: s.id, label: s.name }))];
  const classOptions = [{ value: '', label: 'Sélectionner' }, ...filteredClasses.map((c) => ({ value: c.id, label: c.name }))];
  const yearOptions = [{ value: '', label: 'Sélectionner' }, ...schoolYears.map((y) => ({ value: y.id, label: y.name }))];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la progression</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input id="title" label="Titre" value={form.title} onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }} error={errors.title} autoFocus />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
          <textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>

        <Select id="schoolId" label="École" value={form.schoolId} onChange={(e) => handleSchoolChange(e.target.value)} options={schoolOptions} error={errors.schoolId} />
        <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />
        <Select id="schoolYearId" label="Année scolaire" value={form.schoolYearId} onChange={(e) => { setForm((p) => ({ ...p, schoolYearId: e.target.value })); setErrors((p) => ({ ...p, schoolYearId: '' })); }} options={yearOptions} error={errors.schoolYearId} />

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
