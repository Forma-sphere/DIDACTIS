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
import type { Student, School, ClassItem, PaginatedResponse, Gender } from '@/types';

const genderLabels: Record<Gender, string> = { M: 'Masculin', F: 'Féminin' };
const genderOptions = [
  { value: 'M', label: 'Masculin' },
  { value: 'F', label: 'Féminin' },
];

type FormData = {
  lastName: string; firstName: string; birthDate: string;
  gender: Gender; schoolId: string; classId: string;
};

const emptyForm: FormData = {
  lastName: '', firstName: '', birthDate: '',
  gender: 'M', schoolId: '', classId: '',
};

export default function StudentsPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canArchive = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<Student> | null>(null);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (showArchived) params.set('archived', 'true');
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Student>>(`/students?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const [schoolsRes, classesRes] = await Promise.all([
        api.get<School[]>('/schools'),
        api.get<PaginatedResponse<ClassItem>>('/classes?limit=200'),
      ]);
      setSchools(schoolsRes.data);
      setClasses(classesRes.data.data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchReferenceData(); }, []);
  useEffect(() => { fetchStudents(); }, [search, showArchived, page]);

  const filteredClasses = form.schoolId
    ? classes.filter((c) => c.schoolId === form.schoolId && !c.isArchived)
    : classes.filter((c) => !c.isArchived);

  const schoolOptions = [{ value: '', label: 'Sélectionner une école' }, ...schools.map((s) => ({ value: s.id, label: s.name }))];
  const classOptions = [{ value: '', label: 'Sélectionner une classe' }, ...filteredClasses.map((c) => ({ value: c.id, label: c.name }))];

  const openCreate = () => {
    setEditingStudent(null);
    setForm(emptyForm);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditingStudent(student);
    setForm({
      lastName: student.lastName,
      firstName: student.firstName,
      birthDate: student.birthDate.slice(0, 10),
      gender: student.gender,
      schoolId: student.schoolId,
      classId: student.classId,
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingStudent) {
        await api.patch(`/students/${editingStudent.id}`, form);
      } else {
        await api.post('/students', form);
      }
      setModalOpen(false);
      fetchStudents();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (student: Student) => {
    try {
      await api.delete(`/students/${student.id}`);
      fetchStudents();
    } catch {
      // ignore
    }
  };

  const handleSchoolChange = (schoolId: string) => {
    setForm((p) => ({ ...p, schoolId, classId: '' }));
    setErrors((p) => ({ ...p, schoolId: '', classId: '' }));
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const students = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Élèves</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel élève
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
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

        {students.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucun élève enregistré.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Prénom</th>
                  <th className="px-4 py-3">Classe</th>
                  <th className="px-4 py-3">Date de naissance</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{student.lastName}</td>
                    <td className="px-4 py-3 text-gray-600">{student.firstName}</td>
                    <td className="px-4 py-3 text-gray-600">{student.class?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(student.birthDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={student.isArchived ? 'warning' : 'success'}>
                        {student.isArchived ? 'Archivé' : 'Actif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/students/${student.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(student)}>
                            {student.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
            <p className="text-sm text-gray-500">{result.total} élève{result.total > 1 ? 's' : ''} au total</p>
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
        title={editingStudent ? "Modifier l'élève" : 'Nouvel élève'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Select
            id="schoolId"
            label="École"
            value={form.schoolId}
            onChange={(e) => handleSchoolChange(e.target.value)}
            options={schoolOptions}
            error={errors.schoolId}
          />

          <Select
            id="classId"
            label="Classe"
            value={form.classId}
            onChange={(e) => { setForm((p) => ({ ...p, classId: e.target.value })); setErrors((p) => ({ ...p, classId: '' })); }}
            options={classOptions}
            error={errors.classId}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingStudent ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
