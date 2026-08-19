'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Save, BookOpen, ClipboardCheck, MessageSquare, History,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Student, School, ClassItem, PaginatedResponse, Gender } from '@/types';

const genderLabels: Record<Gender, string> = { M: 'Masculin', F: 'Féminin' };
const genderOptions = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'competences', label: 'Compétences' },
  { key: 'evaluations', label: 'Évaluations' },
  { key: 'observations', label: 'Observations' },
  { key: 'history', label: 'Historique' },
] as const;

type Tab = (typeof tabs)[number]['key'];

const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('fr-FR');

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchStudent = async () => {
    try {
      const { data } = await api.get<Student>(`/students/${id}`);
      setStudent(data);
    } catch {
      router.push('/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudent(); }, [id]);

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/students">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">
            {student.lastName} {student.firstName}
          </h1>
          <p className="text-sm text-gray-500">
            {student.class?.name} · {student.school?.name}
          </p>
        </div>
        <Badge variant={student.isArchived ? 'warning' : 'success'}>
          {student.isArchived ? 'Archivé' : 'Actif'}
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

      {activeTab === 'info' && <StudentInfoTab student={student} canWrite={canWrite} onUpdated={fetchStudent} />}
      {activeTab === 'competences' && <PlaceholderTab icon={BookOpen} title="Compétences" />}
      {activeTab === 'evaluations' && <PlaceholderTab icon={ClipboardCheck} title="Évaluations" />}
      {activeTab === 'observations' && <PlaceholderTab icon={MessageSquare} title="Observations" />}
      {activeTab === 'history' && <PlaceholderTab icon={History} title="Historique" />}
    </div>
  );
}

function PlaceholderTab({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <Card>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Icon className="mb-3 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-primary-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-500">
          Cette section sera disponible prochainement.
        </p>
      </div>
    </Card>
  );
}

function StudentInfoTab({ student, canWrite, onUpdated }: { student: Student; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState({
    lastName: student.lastName, firstName: student.firstName,
    birthDate: student.birthDate.slice(0, 10), gender: student.gender,
    schoolId: student.schoolId, classId: student.classId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      lastName: student.lastName, firstName: student.firstName,
      birthDate: student.birthDate.slice(0, 10), gender: student.gender,
      schoolId: student.schoolId, classId: student.classId,
    });
    setEditing(false);
  }, [student]);

  const startEdit = async () => {
    const [schoolsRes, classesRes] = await Promise.all([
      api.get<School[]>('/schools'),
      api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
    ]);
    setSchools(schoolsRes.data);
    setClasses(classesRes.data.data);
    setEditing(true);
  };

  const filteredClasses = form.schoolId
    ? classes.filter((c) => c.schoolId === form.schoolId && !c.isArchived)
    : classes.filter((c) => !c.isArchived);

  const handleSchoolChange = (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, classId: '' }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.lastName.trim()) errs.lastName = 'Le nom est requis';
    if (!form.firstName.trim()) errs.firstName = 'Le prénom est requis';
    if (!form.birthDate) errs.birthDate = 'La date de naissance est requise';
    if (!form.gender) errs.gender = 'Le sexe est requis';
    if (!form.schoolId) errs.schoolId = "L'école est requise";
    if (!form.classId) errs.classId = 'La classe est requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/students/${student.id}`, form);
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
            ['Nom', student.lastName],
            ['Prénom', student.firstName],
            ['Date de naissance', formatDate(student.birthDate)],
            ['Sexe', genderLabels[student.gender]],
            ['École', student.school?.name],
            ['Classe', student.class?.name],
            ['Enseignant', student.class?.teacher ? `${student.class.teacher.lastName} ${student.class.teacher.firstName}` : null],
            ['Statut', student.isArchived ? 'Archivé' : 'Actif'],
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
  const classOptions = [{ value: '', label: 'Sélectionner' }, ...filteredClasses.map((c) => ({ value: c.id, label: c.name }))];

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier l&apos;élève</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input
          id="lastName"
          label="Nom"
          value={form.lastName}
          onChange={(e) => { setForm((p) => ({ ...p, lastName: e.target.value })); setErrors((p) => ({ ...p, lastName: '' })); }}
          error={errors.lastName}
          autoFocus
        />

        <Input
          id="firstName"
          label="Prénom"
          value={form.firstName}
          onChange={(e) => { setForm((p) => ({ ...p, firstName: e.target.value })); setErrors((p) => ({ ...p, firstName: '' })); }}
          error={errors.firstName}
        />

        <Input
          id="birthDate"
          label="Date de naissance"
          type="date"
          value={form.birthDate}
          onChange={(e) => { setForm((p) => ({ ...p, birthDate: e.target.value })); setErrors((p) => ({ ...p, birthDate: '' })); }}
          error={errors.birthDate}
        />

        <Select
          id="gender"
          label="Sexe"
          value={form.gender}
          onChange={(e) => { setForm((p) => ({ ...p, gender: e.target.value as Gender })); setErrors((p) => ({ ...p, gender: '' })); }}
          options={genderOptions}
          error={errors.gender}
        />

        <Select id="schoolId" label="École" value={form.schoolId} onChange={(e) => handleSchoolChange(e.target.value)} options={schoolOptions} error={errors.schoolId} />
        <Select id="classId" label="Classe" value={form.classId} onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }} options={classOptions} error={errors.classId} />

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
