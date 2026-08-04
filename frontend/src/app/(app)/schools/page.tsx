'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import { Plus, Archive, ArchiveRestore, Pencil, Eye, Search } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { School, SchoolType } from '@/types';

const schoolTypeLabels: Record<SchoolType, string> = {
  MATERNELLE: 'Maternelle',
  ELEMENTAIRE: 'Élémentaire',
  PRIMAIRE: 'Primaire',
};

const schoolTypeOptions = [
  { value: 'ELEMENTAIRE', label: 'Élémentaire' },
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
];

const emptyForm = { name: '', address: '', city: '', postalCode: '', phone: '', email: '', uaiCode: '', type: 'ELEMENTAIRE' as SchoolType };

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSchools = async () => {
    try {
      const { data } = await api.get<School[]>(`/schools${showArchived ? '?archived=true' : ''}`);
      setSchools(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchools(); }, [showArchived]);

  const filtered = schools.filter((s) => {
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q)
      || (s.city?.toLowerCase().includes(q) ?? false)
      || (s.uaiCode?.toLowerCase().includes(q) ?? false);
  });

  const openCreate = () => {
    setEditingSchool(null);
    setForm(emptyForm);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (school: School) => {
    setEditingSchool(school);
    setForm({
      name: school.name,
      address: school.address || '',
      city: school.city || '',
      postalCode: school.postalCode || '',
      phone: school.phone || '',
      email: school.email || '',
      uaiCode: school.uaiCode || '',
      type: school.type,
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Adresse e-mail invalide';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    const payload = {
      ...form,
      address: form.address || undefined,
      city: form.city || undefined,
      postalCode: form.postalCode || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      uaiCode: form.uaiCode || undefined,
    };

    try {
      if (editingSchool) {
        await api.patch(`/schools/${editingSchool.id}`, payload);
      } else {
        await api.post('/schools', payload);
      }
      setModalOpen(false);
      fetchSchools();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (school: School) => {
    try {
      await api.patch(`/schools/${school.id}/archive`);
      fetchSchools();
    } catch {
      // silently ignore
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Écoles</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nouvelle école
        </Button>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, ville ou code UAI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
            />
            Afficher les archives
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {schools.length === 0 ? 'Aucune école enregistrée.' : 'Aucun résultat pour cette recherche.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Code UAI</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{school.name}</td>
                    <td className="px-4 py-3 text-gray-600">{schoolTypeLabels[school.type]}</td>
                    <td className="px-4 py-3 text-gray-600">{school.city || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{school.uaiCode || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={school.isArchived ? 'warning' : 'success'}>
                        {school.isArchived ? 'Archivée' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/schools/${school.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(school)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleArchive(school)}>
                          {school.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSchool ? 'Modifier l\'école' : 'Nouvelle école'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
          )}

          <Input id="name" label="Nom de l'école" value={form.name} onChange={update('name')} error={errors.name} autoFocus />

          <Select
            id="type"
            label="Type d'école"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as SchoolType }))}
            options={schoolTypeOptions}
          />

          <Input id="address" label="Adresse" value={form.address} onChange={update('address')} />

          <div className="grid grid-cols-2 gap-4">
            <Input id="city" label="Ville" value={form.city} onChange={update('city')} />
            <Input id="postalCode" label="Code postal" value={form.postalCode} onChange={update('postalCode')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input id="phone" label="Téléphone" value={form.phone} onChange={update('phone')} />
            <Input id="email" label="E-mail" type="email" value={form.email} onChange={update('email')} error={errors.email} />
          </div>

          <Input id="uaiCode" label="Code UAI" value={form.uaiCode} onChange={update('uaiCode')} placeholder="Ex: 0750001A" />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingSchool ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
