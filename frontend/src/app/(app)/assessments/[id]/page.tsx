'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, X, ClipboardList, BarChart3 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type {
  Assessment, AssessmentStatus, ClassItem, Competency, Student, PaginatedResponse,
} from '@/types';

const STATUS_OPTIONS: { value: AssessmentStatus; label: string }[] = [
  { value: 'NOT_EVALUATED', label: 'Non évalué' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'ACQUIRED', label: 'Acquis' },
  { value: 'EXCEEDED', label: 'Dépassé' },
];

const statusLabels: Record<AssessmentStatus, string> = {
  NOT_EVALUATED: 'Non évalué', IN_PROGRESS: 'En cours',
  ACQUIRED: 'Acquis', EXCEEDED: 'Dépassé',
};

const statusColors: Record<AssessmentStatus, string> = {
  NOT_EVALUATED: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-700',
  ACQUIRED: 'bg-green-100 text-green-700',
  EXCEEDED: 'bg-blue-100 text-blue-700',
};

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'results', label: 'Résultats' },
  { key: 'synthesis', label: 'Synthèse' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchAssessment = async () => {
    try {
      const { data } = await api.get<Assessment>(`/assessments/${id}`);
      setAssessment(data);
    } catch {
      router.push('/assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssessment(); }, [id]);

  if (loading || !assessment) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/assessments">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{assessment.title}</h1>
          <p className="text-sm text-gray-500">
            {assessment.class?.name} · {new Date(assessment.date).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <Badge variant="info">{assessment.competencies.length} compétence{assessment.competencies.length > 1 ? 's' : ''}</Badge>
        <Badge variant={assessment.isArchived ? 'warning' : 'success'}>
          {assessment.isArchived ? 'Archivée' : 'Active'}
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

      {activeTab === 'info' && <InfoTab assessment={assessment} canWrite={canWrite} onUpdated={fetchAssessment} />}
      {activeTab === 'results' && <ResultsTab assessment={assessment} canWrite={canWrite} onUpdated={fetchAssessment} />}
      {activeTab === 'synthesis' && <SynthesisTab assessment={assessment} />}
    </div>
  );
}

function InfoTab({ assessment, canWrite, onUpdated }: { assessment: Assessment; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
  const [form, setForm] = useState({
    classId: assessment.classId,
    title: assessment.title,
    description: assessment.description || '',
    date: assessment.date.slice(0, 10),
    competencyIds: assessment.competencies.map((c) => c.competencyId),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      classId: assessment.classId,
      title: assessment.title,
      description: assessment.description || '',
      date: assessment.date.slice(0, 10),
      competencyIds: assessment.competencies.map((c) => c.competencyId),
    });
    setEditing(false);
  }, [assessment]);

  const startEdit = async () => {
    const [classRes, compRes] = await Promise.all([
      api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
      api.get<PaginatedResponse<Competency>>('/competencies?limit=200'),
    ]);
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
    if (!form.classId) errs.classId = 'La classe est requise';
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    if (!form.date) errs.date = 'La date est requise';
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
      await api.patch(`/assessments/${assessment.id}`, {
        classId: form.classId,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
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
              ['Titre', assessment.title],
              ['Classe', assessment.class?.name],
              ['Enseignant', assessment.class?.teacher ? `${assessment.class.teacher.firstName} ${assessment.class.teacher.lastName}` : null],
              ['Date', new Date(assessment.date).toLocaleDateString('fr-FR')],
              ['Statut', assessment.isArchived ? 'Archivée' : 'Active'],
              ['Créé le', new Date(assessment.createdAt).toLocaleDateString('fr-FR')],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {assessment.description && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{assessment.description}</dd>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Compétences ({assessment.competencies.length})
          </h2>
          {assessment.competencies.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune compétence associée.</p>
          ) : (
            <div className="space-y-1">
              {assessment.competencies.map((ac) => (
                <div key={ac.competencyId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <Badge variant="info">{ac.competency.code}</Badge>
                  <span className="text-primary-900">{ac.competency.name}</span>
                  <span className="ml-auto text-xs text-gray-400">{ac.competency.domain}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  const classOptions = [
    { value: '', label: 'Sélectionner' },
    ...classes.filter((c) => !c.isArchived).map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier l&apos;évaluation</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />

        <Input id="title" label="Titre" value={form.title} onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }} error={errors.title} autoFocus />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
          <textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>

        <Input id="date" label="Date" type="date" value={form.date} onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setErrors((p) => ({ ...p, date: '' })); }} error={errors.date} />

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

function ResultsTab({ assessment, canWrite, onUpdated }: { assessment: Assessment; canWrite: boolean; onUpdated: () => void }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [results, setResults] = useState<Record<string, { status: AssessmentStatus; comment: string }>>({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data } = await api.get<PaginatedResponse<Student>>(`/students?classId=${assessment.classId}&limit=200`);
        setStudents(data.data.filter((s) => !s.isArchived));
      } finally {
        setLoadingStudents(false);
      }
    };
    fetchStudents();
  }, [assessment.classId]);

  useEffect(() => {
    const map: Record<string, { status: AssessmentStatus; comment: string }> = {};
    for (const r of assessment.results) {
      map[`${r.studentId}_${r.competencyId}`] = { status: r.status, comment: r.comment || '' };
    }
    setResults(map);
  }, [assessment.results]);

  const getResult = (studentId: string, competencyId: string) => {
    return results[`${studentId}_${competencyId}`] || { status: 'NOT_EVALUATED' as AssessmentStatus, comment: '' };
  };

  const setResult = (studentId: string, competencyId: string, field: 'status' | 'comment', value: string) => {
    const key = `${studentId}_${competencyId}`;
    setResults((prev) => ({
      ...prev,
      [key]: { ...getResult(studentId, competencyId), [field]: value },
    }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setServerError('');
    setSaved(false);
    try {
      const items = students.flatMap((student) =>
        assessment.competencies.map((ac) => {
          const r = getResult(student.id, ac.competencyId);
          return {
            studentId: student.id,
            competencyId: ac.competencyId,
            status: r.status,
            comment: r.comment || undefined,
          };
        }),
      );
      await api.post(`/assessments/${assessment.id}/results`, { results: items });
      setSaved(true);
      onUpdated();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loadingStudents) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <ClipboardList className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-primary-900">Aucun élève</h3>
          <p className="mt-1 text-sm text-gray-500">Aucun élève actif dans cette classe.</p>
        </div>
      </Card>
    );
  }

  const competencies = assessment.competencies;

  return (
    <div className="space-y-4">
      {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}
      {saved && <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">Résultats enregistrés avec succès.</div>}

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-primary-900">
            Saisie des résultats ({students.length} élève{students.length > 1 ? 's' : ''})
          </h2>
          {canWrite && (
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-3 py-2 sticky left-0 bg-white">Élève</th>
                {competencies.map((ac) => (
                  <th key={ac.competencyId} className="px-3 py-2 text-center min-w-[120px]">
                    <span title={ac.competency.name}>{ac.competency.code}</span>
                  </th>
                ))}
                <th className="px-3 py-2 min-w-[200px]">Commentaire</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-primary-900 whitespace-nowrap sticky left-0 bg-white">
                    {student.lastName} {student.firstName}
                  </td>
                  {competencies.map((ac) => {
                    const r = getResult(student.id, ac.competencyId);
                    return (
                      <td key={ac.competencyId} className="px-3 py-2 text-center">
                        {canWrite ? (
                          <select
                            value={r.status}
                            onChange={(e) => setResult(student.id, ac.competencyId, 'status', e.target.value)}
                            className={`rounded border border-gray-300 px-1.5 py-1 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500 ${statusColors[r.status]}`}
                          >
                            {STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${statusColors[r.status]}`}>
                            {statusLabels[r.status]}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2">
                    {canWrite ? (
                      <input
                        type="text"
                        value={getResult(student.id, competencies[0]?.competencyId)?.comment || ''}
                        onChange={(e) => {
                          competencies.forEach((ac) => {
                            setResult(student.id, ac.competencyId, 'comment', e.target.value);
                          });
                        }}
                        placeholder="Commentaire..."
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
                      />
                    ) : (
                      <span className="text-xs text-gray-500">
                        {getResult(student.id, competencies[0]?.competencyId)?.comment || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SynthesisTab({ assessment }: { assessment: Assessment }) {
  const competencies = assessment.competencies;
  const results = assessment.results;

  const uniqueStudentIds = [...new Set(results.map((r) => r.studentId))];
  const studentsMap: Record<string, { firstName: string; lastName: string }> = {};
  for (const r of results) {
    studentsMap[r.studentId] = r.student;
  }

  const getCompetencyStats = (competencyId: string) => {
    const compResults = results.filter((r) => r.competencyId === competencyId);
    const total = compResults.length;
    if (total === 0) return { total: 0, notEvaluated: 0, inProgress: 0, acquired: 0, exceeded: 0 };
    return {
      total,
      notEvaluated: compResults.filter((r) => r.status === 'NOT_EVALUATED').length,
      inProgress: compResults.filter((r) => r.status === 'IN_PROGRESS').length,
      acquired: compResults.filter((r) => r.status === 'ACQUIRED').length,
      exceeded: compResults.filter((r) => r.status === 'EXCEEDED').length,
    };
  };

  const getStudentStats = (studentId: string) => {
    const studentResults = results.filter((r) => r.studentId === studentId);
    const total = studentResults.length;
    if (total === 0) return { total: 0, notEvaluated: 0, inProgress: 0, acquired: 0, exceeded: 0 };
    return {
      total,
      notEvaluated: studentResults.filter((r) => r.status === 'NOT_EVALUATED').length,
      inProgress: studentResults.filter((r) => r.status === 'IN_PROGRESS').length,
      acquired: studentResults.filter((r) => r.status === 'ACQUIRED').length,
      exceeded: studentResults.filter((r) => r.status === 'EXCEEDED').length,
    };
  };

  if (results.length === 0) {
    return (
      <Card>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BarChart3 className="mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-medium text-primary-900">Aucun résultat</h3>
          <p className="mt-1 text-sm text-gray-500">Saisissez des résultats dans l&apos;onglet Résultats pour voir la synthèse.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Résultats par compétence</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Compétence</th>
                <th className="px-4 py-3 text-center">Non évalué</th>
                <th className="px-4 py-3 text-center">En cours</th>
                <th className="px-4 py-3 text-center">Acquis</th>
                <th className="px-4 py-3 text-center">Dépassé</th>
                <th className="px-4 py-3 text-center">Taux de réussite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {competencies.map((ac) => {
                const stats = getCompetencyStats(ac.competencyId);
                const evaluated = stats.total - stats.notEvaluated;
                const successRate = evaluated > 0 ? Math.round(((stats.acquired + stats.exceeded) / evaluated) * 100) : 0;
                return (
                  <tr key={ac.competencyId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-accent-700">{ac.competency.code}</span>
                      <span className="ml-2 text-gray-600">{ac.competency.name}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{stats.notEvaluated}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{stats.inProgress}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{stats.acquired}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{stats.exceeded}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{successRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Résultats par élève</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Élève</th>
                <th className="px-4 py-3 text-center">Non évalué</th>
                <th className="px-4 py-3 text-center">En cours</th>
                <th className="px-4 py-3 text-center">Acquis</th>
                <th className="px-4 py-3 text-center">Dépassé</th>
                <th className="px-4 py-3 text-center">Taux de réussite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {uniqueStudentIds.map((studentId) => {
                const student = studentsMap[studentId];
                const stats = getStudentStats(studentId);
                const evaluated = stats.total - stats.notEvaluated;
                const successRate = evaluated > 0 ? Math.round(((stats.acquired + stats.exceeded) / evaluated) * 100) : 0;
                return (
                  <tr key={studentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">
                      {student.lastName} {student.firstName}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{stats.notEvaluated}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">{stats.inProgress}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">{stats.acquired}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{stats.exceeded}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-20 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-green-500"
                            style={{ width: `${successRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">{successRate}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
