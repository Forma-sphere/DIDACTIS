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
import type { Competency, PaginatedResponse } from '@/types';

type FormData = {
  code: string; name: string; domain: string; description: string;
};

const emptyForm: FormData = {
  code: '', name: '', domain: '', description: '',
};

export default function CompetenciesPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';
  const canArchive = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<Competency> | null>(null);
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompetency, setEditingCompetency] = useState<Competency | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCompetencies = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterDomain) params.set('domain', filterDomain);
      if (showArchived) params.set('archived', 'true');
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Competency>>(`/competencies?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const { data } = await api.get<string[]>('/competencies/domains');
      setDomains(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => { fetchDomains(); }, []);
  useEffect(() => { fetchCompetencies(); }, [search, filterDomain, showArchived, page]);

  const domainFilterOptions = [
    { value: '', label: 'Tous les domaines' },
    ...domains.map((d) => ({ value: d, label: d })),
  ];

  const openCreate = () => {
    setEditingCompetency(null);
    setForm(emptyForm);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (competency: Competency) => {
    setEditingCompetency(competency);
    setForm({
      code: competency.code,
      name: competency.name,
      domain: competency.domain,
      description: competency.description || '',
    });
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = 'Le code est requis';
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.domain.trim()) errs.domain = 'Le domaine est requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = { ...form, description: form.description || undefined };
      if (editingCompetency) {
        await api.patch(`/competencies/${editingCompetency.id}`, payload);
      } else {
        await api.post('/competencies', payload);
      }
      setModalOpen(false);
      fetchCompetencies();
      fetchDomains();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (competency: Competency) => {
    try {
      await api.delete(`/competencies/${competency.id}`);
      fetchCompetencies();
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const competencies = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Référentiel des compétences</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Nouvelle compétence
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par code ou nom..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="min-w-[180px]">
            <select
              value={filterDomain}
              onChange={(e) => { setFilterDomain(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 px-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            >
              {domainFilterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
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

        {competencies.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucune compétence enregistrée.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Domaine</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {competencies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="info">{comp.code}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary-900">{comp.name}</td>
                    <td className="px-4 py-3 text-gray-600">{comp.domain}</td>
                    <td className="px-4 py-3">
                      <Badge variant={comp.isArchived ? 'warning' : 'success'}>
                        {comp.isArchived ? 'Archivée' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/competencies/${comp.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(comp)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canArchive && (
                          <Button variant="ghost" size="sm" onClick={() => handleArchive(comp)}>
                            {comp.isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
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
            <p className="text-sm text-gray-500">{result.total} compétence{result.total > 1 ? 's' : ''} au total</p>
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
        title={editingCompetency ? 'Modifier la compétence' : 'Nouvelle compétence'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Input
            id="code"
            label="Code"
            value={form.code}
            onChange={(e) => { setForm((p) => ({ ...p, code: e.target.value })); setErrors((p) => ({ ...p, code: '' })); }}
            error={errors.code}
            autoFocus
          />

          <Input
            id="name"
            label="Nom"
            value={form.name}
            onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
            error={errors.name}
          />

          <Input
            id="domain"
            label="Domaine"
            value={form.domain}
            onChange={(e) => { setForm((p) => ({ ...p, domain: e.target.value })); setErrors((p) => ({ ...p, domain: '' })); }}
            error={errors.domain}
          />

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingCompetency ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
