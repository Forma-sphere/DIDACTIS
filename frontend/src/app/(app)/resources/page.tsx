'use client';

import { useState, useEffect, type FormEvent } from 'react';
import Link from 'next/link';
import {
  Plus, Search, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { Resource, ResourceType, PaginatedResponse } from '@/types';

const RESOURCE_TYPES: { value: ResourceType; label: string }[] = [
  { value: 'PDF', label: 'PDF' },
  { value: 'IMAGE', label: 'Image' },
  { value: 'VIDEO', label: 'Vidéo' },
  { value: 'AUDIO', label: 'Audio' },
  { value: 'DOCUMENT', label: 'Document' },
  { value: 'OTHER', label: 'Autre' },
];

const typeLabels: Record<ResourceType, string> = {
  PDF: 'PDF', IMAGE: 'Image', VIDEO: 'Vidéo',
  AUDIO: 'Audio', DOCUMENT: 'Document', OTHER: 'Autre',
};

const typeBadgeVariant: Record<ResourceType, 'info' | 'success' | 'warning' | 'default'> = {
  PDF: 'info', IMAGE: 'success', VIDEO: 'warning',
  AUDIO: 'default', DOCUMENT: 'info', OTHER: 'default',
};

export default function ResourcesPage() {
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';
  const canDelete = currentUser?.role === 'ADMIN';

  const [result, setResult] = useState<PaginatedResponse<Resource> | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ResourceType | ''>('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterType) params.set('type', filterType);
      params.set('page', String(page));
      params.set('limit', '20');
      const { data } = await api.get<PaginatedResponse<Resource>>(`/resources?${params}`);
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, [search, filterType, page]);

  const typeFilterOptions = [
    { value: '', label: 'Tous les types' },
    ...RESOURCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];

  const typeFormOptions = [
    { value: '', label: 'Sélectionner un type' },
    ...RESOURCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];

  const openCreate = () => {
    setEditingResource(null);
    setTitle('');
    setDescription('');
    setType('');
    setTagsInput('');
    setFile(null);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const openEdit = (res: Resource) => {
    setEditingResource(res);
    setTitle(res.title);
    setDescription(res.description || '');
    setType(res.type);
    setTagsInput(res.tags.join(', '));
    setFile(null);
    setErrors({});
    setServerError('');
    setModalOpen(true);
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Le titre est requis';
    if (!type) errs.type = 'Le type est requis';
    if (!editingResource && !file) errs.file = 'Le fichier est requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (editingResource) {
        await api.patch(`/resources/${editingResource.id}`, {
          title,
          description: description || undefined,
          type,
          tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
        });
      } else {
        const formData = new FormData();
        formData.append('title', title);
        if (description) formData.append('description', description);
        formData.append('type', type);
        if (tagsInput) formData.append('tags', tagsInput);
        if (file) formData.append('file', file);
        await api.post('/resources', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      setModalOpen(false);
      fetchResources();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (res: Resource) => {
    try {
      await api.delete(`/resources/${res.id}`);
      fetchResources();
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

  const resources = result?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary-900">Ressources</h1>
        {canWrite && (
          <Button onClick={openCreate}>
            <Upload className="h-4 w-4" />
            Importer
          </Button>
        )}
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>
          <div className="min-w-[180px]">
            <Select
              id="filterType"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              options={typeFilterOptions}
            />
          </div>
        </div>

        {resources.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">
            {result?.total === 0 ? 'Aucune ressource enregistrée.' : 'Aucun résultat.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Titre</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Date d'ajout</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {resources.map((res) => (
                  <tr key={res.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-primary-900">{res.title}</td>
                    <td className="px-4 py-3">
                      <Badge variant={typeBadgeVariant[res.type]}>{typeLabels[res.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(res.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/resources/${res.id}`}>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {canWrite && (
                          <Button variant="ghost" size="sm" onClick={() => openEdit(res)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(res)}>
                            <Trash2 className="h-4 w-4" />
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
            <p className="text-sm text-gray-500">{result.total} ressource{result.total > 1 ? 's' : ''} au total</p>
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
        title={editingResource ? 'Modifier la ressource' : 'Importer une ressource'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

          <Input
            id="title"
            label="Titre"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })); }}
            error={errors.title}
            autoFocus
          />

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
            <textarea
              id="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
            />
          </div>

          <Select
            id="type"
            label="Type"
            value={type}
            onChange={(e) => { setType(e.target.value as ResourceType); setErrors((p) => ({ ...p, type: '' })); }}
            options={typeFormOptions}
            error={errors.type}
          />

          {!editingResource && (
            <div>
              <label htmlFor="file" className="mb-1 block text-sm font-medium text-primary-900">Fichier</label>
              <input
                id="file"
                type="file"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setErrors((p) => ({ ...p, file: '' })); }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-accent-50 file:px-3 file:py-1 file:text-sm file:text-accent-700 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
              />
              {errors.file && <p className="mt-1 text-xs text-red-600">{errors.file}</p>}
            </div>
          )}

          <Input
            id="tags"
            label="Tags (séparés par des virgules)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Enregistrement...' : editingResource ? 'Modifier' : 'Importer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
