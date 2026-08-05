'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Save, FileText, Image as ImageIcon, Film, Music, File } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Resource, ResourceType } from '@/types';

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

const typeIcons: Record<ResourceType, typeof FileText> = {
  PDF: FileText, IMAGE: ImageIcon, VIDEO: Film,
  AUDIO: Music, DOCUMENT: File, OTHER: File,
};

function getFileUrl(filePath: string): string {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const base = apiBase.replace('/api/v1', '');
  return `${base}/${filePath.replace(/^\.\//, '')}`;
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEACHER';

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResource = async () => {
    try {
      const { data } = await api.get<Resource>(`/resources/${id}`);
      setResource(data);
    } catch {
      router.push('/resources');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResource(); }, [id]);

  if (loading || !resource) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const Icon = typeIcons[resource.type];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/resources">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{resource.title}</h1>
          <p className="text-sm text-gray-500">
            {typeLabels[resource.type]} · Ajouté le {new Date(resource.createdAt).toLocaleDateString('fr-FR')}
          </p>
        </div>
        <Badge variant="info">{typeLabels[resource.type]}</Badge>
      </div>

      <ResourceInfoTab resource={resource} canWrite={canWrite} onUpdated={fetchResource} />
    </div>
  );
}

function ResourceInfoTab({ resource, canWrite, onUpdated }: { resource: Resource; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: resource.title,
    description: resource.description || '',
    type: resource.type as ResourceType,
    tags: resource.tags.join(', '),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      title: resource.title,
      description: resource.description || '',
      type: resource.type,
      tags: resource.tags.join(', '),
    });
    setEditing(false);
  }, [resource]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Le titre est requis';
    if (!form.type) errs.type = 'Le type est requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      await api.patch(`/resources/${resource.id}`, {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
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

  const typeFormOptions = [
    { value: '', label: 'Sélectionner' },
    ...RESOURCE_TYPES.map((t) => ({ value: t.value, label: t.label })),
  ];

  const Icon = typeIcons[resource.type];
  const fileUrl = getFileUrl(resource.filePath);

  if (!editing) {
    return (
      <div className="space-y-6">
        <Card>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-primary-900">Informations générales</h2>
            {canWrite && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-4 w-4" /> Modifier
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {([
              ['Titre', resource.title],
              ['Type', typeLabels[resource.type]],
              ['Date d\'ajout', new Date(resource.createdAt).toLocaleDateString('fr-FR')],
              ['Dernière modification', new Date(resource.updatedAt).toLocaleDateString('fr-FR')],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 text-sm text-primary-900">{value}</dd>
              </div>
            ))}
          </dl>
          {resource.description && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{resource.description}</dd>
            </div>
          )}
          {resource.tags.length > 0 && (
            <div className="mt-4">
              <dt className="text-xs font-medium uppercase text-gray-500 mb-1">Tags</dt>
              <dd className="flex flex-wrap gap-1">
                {resource.tags.map((tag) => (
                  <span key={tag} className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {tag}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Prévisualisation</h2>
          <div className="rounded-lg border border-gray-200 p-4">
            {resource.type === 'IMAGE' ? (
              <img src={fileUrl} alt={resource.title} className="max-h-96 mx-auto rounded" />
            ) : resource.type === 'PDF' ? (
              <iframe src={fileUrl} className="w-full h-96 rounded" title={resource.title} />
            ) : resource.type === 'VIDEO' ? (
              <video controls className="max-h-96 mx-auto rounded">
                <source src={fileUrl} />
              </video>
            ) : resource.type === 'AUDIO' ? (
              <audio controls className="w-full">
                <source src={fileUrl} />
              </audio>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Icon className="mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">Prévisualisation non disponible pour ce type de fichier.</p>
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm text-accent-600 hover:underline">
                  Télécharger le fichier
                </a>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">
            Préparations associées ({resource.lessons.length})
          </h2>
          {resource.lessons.length === 0 ? (
            <p className="text-sm text-gray-500">Aucune préparation associée.</p>
          ) : (
            <div className="space-y-1">
              {resource.lessons.map((lr) => (
                <div key={lr.lessonId} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-gray-50">
                  <Badge variant="info">Préparation</Badge>
                  <Link href={`/preparations/${lr.lessonId}`} className="text-primary-900 hover:text-accent-600">
                    {lr.lesson.title}
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la ressource</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input id="title" label="Titre" value={form.title} onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setErrors((p) => ({ ...p, title: '' })); }} error={errors.title} autoFocus />

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-primary-900">Description</label>
          <textarea id="description" rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500" />
        </div>

        <Select id="type" label="Type" value={form.type} onChange={(e) => { setForm((p) => ({ ...p, type: e.target.value as ResourceType })); setErrors((p) => ({ ...p, type: '' })); }} options={typeFormOptions} error={errors.type} />

        <Input id="tags" label="Tags (séparés par des virgules)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} />

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
