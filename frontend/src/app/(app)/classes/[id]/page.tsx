'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'students', label: 'Élèves' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';

  const [cls, setCls] = useState<ClassItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchClass = async () => {
    try {
      const { data } = await api.get<ClassItem>(`/classes/${id}`);
      setCls(data);
    } catch {
      router.push('/classes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClass(); }, [id]);

  if (loading || !cls) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/classes">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{cls.name}</h1>
          <p className="text-sm text-gray-500">
            {cls.school?.name} · {cls.schoolYear?.name}
          </p>
        </div>
        <Badge variant="info">{levelLabels[cls.level]}</Badge>
        <Badge variant={cls.isArchived ? 'warning' : 'success'}>
          {cls.isArchived ? 'Archivée' : 'Active'}
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

      {activeTab === 'info' && <ClassInfoTab cls={cls} canWrite={canWrite} onUpdated={fetchClass} />}
      {activeTab === 'students' && <ClassStudentsTab />}
    </div>
  );
}

function ClassInfoTab({ cls, canWrite, onUpdated }: { cls: ClassItem; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: cls.name, schoolId: cls.schoolId, schoolYearId: cls.schoolYearId,
    teacherId: cls.teacherId, level: cls.level, cycle: cls.cycle, capacity: cls.capacity,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      name: cls.name, schoolId: cls.schoolId, schoolYearId: cls.schoolYearId,
      teacherId: cls.teacherId, level: cls.level, cycle: cls.cycle, capacity: cls.capacity,
    });
    setEditing(false);
  }, [cls]);

  const startEdit = async () => {
    const [schoolsRes, teachersRes] = await Promise.all([
      api.get<School[]>('/schools'),
      api.get<PaginatedResponse<User>>('/users?limit=200&isActive=true'),
    ]);
    setSchools(schoolsRes.data);
    setTeachers(teachersRes.data.data);
    if (cls.schoolId) {
      const { data } = await api.get<School>(`/schools/${cls.schoolId}`);
      setSchoolYears(data.schoolYears || []);
    }
    setEditing(true);
  };

  const handleSchoolChange = async (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, schoolYearId: '' }));
    if (schoolId) {
      const { data } = await api.get<School>(`/schools/${schoolId}`);
      setSchoolYears(data.schoolYears || []);
    } else {
      setSchoolYears([]);
    }
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

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/classes/${cls.id}`, form);
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
            ['Nom', cls.name],
            ['Niveau', levelLabels[cls.level]],
            ['Cycle', cycleLabels[cls.cycle]],
            ['École', cls.school?.name],
            ['Année scolaire', cls.schoolYear?.name],
            ['Enseignant', cls.teacher ? `${cls.teacher.lastName} ${cls.teacher.firstName}` : null],
            ['Capacité', String(cls.capacity)],
            ['Statut', cls.isArchived ? 'Archivée' : 'Active'],
          ] as [string, string | null | undefined][]).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  }

  const schoolOptions = [{ value: '', label: 'Sélectionner' }, ...schools.map((s) => ({ value: s.id, label: s.name }))];
  const yearOptions = [{ value: '', label: 'Sélectionner' }, ...schoolYears.map((y) => ({ value: y.id, label: y.name }))];
  const teacherOptions = [{ value: '', label: 'Sélectionner' }, ...teachers.map((t) => ({ value: t.id, label: `${t.lastName} ${t.firstName}` }))];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la classe</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input
          id="className"
          label="Nom"
          value={form.name}
          onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          autoFocus
        />

        <Select id="schoolId" label="École" value={form.schoolId} onChange={(e) => handleSchoolChange(e.target.value)} options={schoolOptions} error={errors.schoolId} />
        <Select id="schoolYearId" label="Année scolaire" value={form.schoolYearId} onChange={(e) => { setForm((p) => ({ ...p, schoolYearId: e.target.value })); setErrors((p) => ({ ...p, schoolYearId: '' })); }} options={yearOptions} error={errors.schoolYearId} />

        <div className="grid grid-cols-2 gap-4">
          <Select id="level" label="Niveau" value={form.level} onChange={(e) => { const l = e.target.value as Level; setForm((p) => ({ ...p, level: l, cycle: levelToCycle[l] })); }} options={levelOptions} error={errors.level} />
          <Select id="cycle" label="Cycle" value={form.cycle} onChange={(e) => { setForm((p) => ({ ...p, cycle: e.target.value as Cycle })); }} options={cycleOptions} error={errors.cycle} />
        </div>

        <Select id="teacherId" label="Enseignant" value={form.teacherId} onChange={(e) => { setForm((p) => ({ ...p, teacherId: e.target.value })); setErrors((p) => ({ ...p, teacherId: '' })); }} options={teacherOptions} error={errors.teacherId} />

        <Input
          id="capacity"
          label="Capacité"
          type="number"
          min={1}
          value={String(form.capacity)}
          onChange={(e) => { setForm((p) => ({ ...p, capacity: parseInt(e.target.value) || 1 })); }}
          error={errors.capacity}
        />

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

function ClassStudentsTab() {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-primary-900">Élèves</h3>
        <p className="mt-1 text-sm text-gray-500">
          La gestion des élèves sera disponible prochainement.
        </p>
      </div>
    </Card>
  );
}
