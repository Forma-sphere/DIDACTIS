'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Pencil, Save, TrendingUp, Layers, BookOpen, ClipboardCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Competency } from '@/types';

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'progressions', label: 'Progressions liées' },
  { key: 'sequences', label: 'Séquences liées' },
  { key: 'preparations', label: 'Préparations liées' },
  { key: 'evaluations', label: 'Évaluations liées' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function CompetencyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const canWrite = currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR';

  const [competency, setCompetency] = useState<Competency | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchCompetency = async () => {
    try {
      const { data } = await api.get<Competency>(`/competencies/${id}`);
      setCompetency(data);
    } catch {
      router.push('/competencies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompetency(); }, [id]);

  if (loading || !competency) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/competencies">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-primary-900">{competency.name}</h1>
          <p className="text-sm text-gray-500">{competency.domain}</p>
        </div>
        <Badge variant="info">{competency.code}</Badge>
        <Badge variant={competency.isArchived ? 'warning' : 'success'}>
          {competency.isArchived ? 'Archivée' : 'Active'}
        </Badge>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
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

      {activeTab === 'info' && <CompetencyInfoTab competency={competency} canWrite={canWrite} onUpdated={fetchCompetency} />}
      {activeTab === 'progressions' && <PlaceholderTab icon={TrendingUp} title="Progressions liées" />}
      {activeTab === 'sequences' && <PlaceholderTab icon={Layers} title="Séquences liées" />}
      {activeTab === 'preparations' && <PlaceholderTab icon={BookOpen} title="Préparations liées" />}
      {activeTab === 'evaluations' && <PlaceholderTab icon={ClipboardCheck} title="Évaluations liées" />}
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

function CompetencyInfoTab({ competency, canWrite, onUpdated }: { competency: Competency; canWrite: boolean; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    code: competency.code, name: competency.name,
    domain: competency.domain, description: competency.description || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      code: competency.code, name: competency.name,
      domain: competency.domain, description: competency.description || '',
    });
    setEditing(false);
  }, [competency]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.code.trim()) errs.code = 'Le code est requis';
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.domain.trim()) errs.domain = 'Le domaine est requis';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = { ...form, description: form.description || undefined };
      await api.patch(`/competencies/${competency.id}`, payload);
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
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" /> Modifier
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            ['Code', competency.code],
            ['Nom', competency.name],
            ['Domaine', competency.domain],
            ['Statut', competency.isArchived ? 'Archivée' : 'Active'],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
              <dd className="mt-1 text-sm text-primary-900">{value || '—'}</dd>
            </div>
          ))}
        </dl>
        {competency.description && (
          <div className="mt-4">
            <dt className="text-xs font-medium uppercase text-gray-500">Description</dt>
            <dd className="mt-1 text-sm text-primary-900 whitespace-pre-line">{competency.description}</dd>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier la compétence</h2>
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
