'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, UserX, UserCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { User, School, Role } from '@/types';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  TEACHER: 'Enseignant',
};

const roleFormOptions = [
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';
  const canDeactivate = currentUser?.role === 'ADMIN';

  const [user, setUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'TEACHER' as Role, schoolId: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUser = async () => {
    try {
      const { data } = await api.get<User>(`/users/${id}`);
      setUser(data);
    } catch {
      router.push('/users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
    api.get<School[]>('/schools').then(({ data }) => setSchools(data)).catch(() => {});
  }, [id]);

  const schoolOptions = [
    { value: '', label: 'Sélectionner une école' },
    ...schools.map((s) => ({ value: s.id, label: s.name })),
  ];

  const startEdit = () => {
    if (!user) return;
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      schoolId: user.schoolId || '',
    });
    setErrors({});
    setServerError('');
    setEditing(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) errs.lastName = 'Le nom est requis';
    if (!form.email.trim()) errs.email = 'L\'adresse e-mail est requise';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Adresse e-mail invalide';
    if (!form.role) errs.role = 'Le rôle est requis';
    if (!form.schoolId) errs.schoolId = 'L\'école est requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/users/${id}`, { ...form, phone: form.phone || undefined });
      setEditing(false);
      fetchUser();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!user) return;
    try {
      await api.delete(`/users/${user.id}`);
      fetchUser();
    } catch {
      // ignore
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{user.lastName} {user.firstName}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.isActive ? 'success' : 'warning'}>
            {user.isActive ? 'Actif' : 'Inactif'}
          </Badge>
          <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'DIRECTOR' ? 'info' : 'default'}>
            {roleLabels[user.role]}
          </Badge>
        </div>
      </div>

      {!editing ? (
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-900">Informations générales</h2>
            <div className="flex gap-2">
              {canDeactivate && (
                <Button variant="outline" size="sm" onClick={handleToggleActive}>
                  {user.isActive ? <><UserX className="h-4 w-4" /> Désactiver</> : <><UserCheck className="h-4 w-4" /> Réactiver</>}
                </Button>
              )}
              {canWrite && (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Button>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ['Prénom', user.firstName],
              ['Nom', user.lastName],
              ['E-mail', user.email],
              ['Téléphone', user.phone],
              ['Rôle', roleLabels[user.role]],
              ['École', user.school?.name],
              ['Statut', user.isActive ? 'Actif' : 'Inactif'],
              ['E-mail vérifié', user.emailVerified ? 'Oui' : 'Non'],
            ] as [string, string | null | undefined][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSave} className="space-y-4">
            <h2 className="text-lg font-semibold text-primary-900">Modifier l&apos;utilisateur</h2>
            {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

            <div className="grid grid-cols-2 gap-4">
              <Input id="firstName" label="Prénom" value={form.firstName} onChange={update('firstName')} error={errors.firstName} autoFocus />
              <Input id="lastName" label="Nom" value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
            </div>

            <Input id="email" label="Adresse e-mail" type="email" value={form.email} onChange={update('email')} error={errors.email} />
            <Input id="phone" label="Téléphone" value={form.phone} onChange={update('phone')} />

            <Select
              id="schoolId"
              label="École"
              value={form.schoolId}
              onChange={(e) => { setForm((p) => ({ ...p, schoolId: e.target.value })); setErrors((p) => ({ ...p, schoolId: '' })); }}
              options={schoolOptions}
              error={errors.schoolId}
            />

            <Select
              id="role"
              label="Rôle"
              value={form.role}
              onChange={(e) => { setForm((p) => ({ ...p, role: e.target.value as Role })); setErrors((p) => ({ ...p, role: '' })); }}
              options={roleFormOptions}
              error={errors.role}
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
      )}
    </div>
  );
}
