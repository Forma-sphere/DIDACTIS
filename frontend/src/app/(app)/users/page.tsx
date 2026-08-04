'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Eye, Pencil, UserX, UserCheck, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { User, School, PaginatedResponse, Role } from '@/types';

const roleLabels: Record<Role, string> = {
  ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  TEACHER: 'Enseignant',
};

const roleOptions = [
  { value: '', label: 'Tous les rôles' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'TEACHER', label: 'Enseignant' },
];

const statusOptions = [
  { value: '', label: 'Tous les statuts' },
  { value: 'true', label: 'Actif' },
  { value: 'false', label: 'Inactif' },
];

const roleFormOptions = [
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'ADMIN', label: 'Administrateur' },
];

const emptyForm = {
  firstName: '', lastName: '', email: '', password: '', phone: '',
  role: 'TEACHER' as Role, schoolId: '',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';
  const canDeactivate = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<School[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('isActive', statusFilter);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<User>>(`/users?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data } = await api.get<School[]>('/schools');
      setSchools(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchSchools(); }, []);
  useEffect(() => { fetchUsers(); }, [search, roleFilter, statusFilter, page]);

  const schoolOptions = [
    { value: '', label: 'Sélectionner une école' },
    ...schools.map((s) => ({ value: s.id, label: s.name })),
  ];

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      phone: user.phone || '',
      role: user.role,
      schoolId: user.schoolId || '',
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'Le prénom est requis';
    if (!form.lastName.trim()) errs.lastName = 'Le nom est requis';
    if (!form.email.trim()) {
      errs.email = 'L\'adresse e-mail est requise';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = 'Adresse e-mail invalide';
    }
    if (!editingUser && !form.password) {
      errs.password = 'Le mot de passe est requis';
    } else if (form.password && form.password.length < 8) {
      errs.password = 'Minimum 8 caractères';
    }
    if (!form.role) errs.role = 'Le rôle est requis';
    if (!form.schoolId) errs.schoolId = 'L\'école est requise';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: form.phone || undefined,
          role: form.role,
          schoolId: form.schoolId,
        };
        await api.patch(`/users/${editingUser.id}`, payload);
      } else {
        await api.post('/users', {
          ...form,
          phone: form.phone || undefined,
        });
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.delete(`/users/${user.id}`);
      fetchUsers();
    } catch {
      // ignore
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const users = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Utilisateurs</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvel utilisateur
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou e-mail..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="w-44">
            <Select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              options={roleOptions}
            />
          </div>
          <div className="w-36">
            <Select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              options={statusOptions}
            />
          </div>
        </div>

        {users.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucun utilisateur enregistré.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">École</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-primary-900">{user.lastName} {user.firstName}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.role === 'ADMIN' ? 'danger' : user.role === 'DIRECTOR' ? 'info' : 'default'}>
                        {roleLabels[user.role]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{user.school?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? 'success' : 'warning'}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/users/${user.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDeactivate && (
                          <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)}>
                            {user.isActive ? <UserX className="h-4 w-4 text-red-500" /> : <UserCheck className="h-4 w-4 text-green-500" />}
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
            <p className="text-sm text-gray-500">
              {result.total} utilisateur{result.total > 1 ? 's' : ''} au total
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-gray-600">
                Page {result.page} / {result.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= result.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input id="firstName" label="Prénom" value={form.firstName} onChange={update('firstName')} error={errors.firstName} autoFocus />
            <Input id="lastName" label="Nom" value={form.lastName} onChange={update('lastName')} error={errors.lastName} />
          </div>

          <Input
            id="email"
            label="Adresse e-mail"
            type="email"
            value={form.email}
            onChange={update('email')}
            error={errors.email}
          />

          {!editingUser && (
            <Input
              id="password"
              label="Mot de passe"
              type="password"
              placeholder="Minimum 8 caractères"
              value={form.password}
              onChange={update('password')}
              error={errors.password}
              autoComplete="new-password"
            />
          )}

          <Input
            id="phone"
            label="Téléphone"
            value={form.phone}
            onChange={update('phone')}
          />

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
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingUser ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
