'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Plus, Pencil, Trash2, ChevronDown, ChevronRight, Calendar, Star,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import type { School, SchoolYear, Period, SchoolType } from '@/types';

const schoolTypeOptions = [
  { value: 'ELEMENTAIRE', label: 'Élémentaire' },
  { value: 'MATERNELLE', label: 'Maternelle' },
  { value: 'PRIMAIRE', label: 'Primaire' },
];

const tabs = [
  { key: 'info', label: 'Informations' },
  { key: 'years', label: 'Années scolaires' },
] as const;

type Tab = (typeof tabs)[number]['key'];

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('info');

  const fetchSchool = async () => {
    try {
      const { data } = await api.get<School>(`/schools/${id}`);
      setSchool(data);
    } catch {
      router.push('/schools');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSchool(); }, [id]);

  if (loading || !school) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/schools">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-primary-900">{school.name}</h1>
          <p className="text-sm text-gray-500">
            {school.city && `${school.city} · `}{school.uaiCode && `UAI: ${school.uaiCode}`}
          </p>
        </div>
        {school.isArchived && <Badge variant="warning">Archivée</Badge>}
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

      {activeTab === 'info' && <SchoolInfoTab school={school} onUpdated={fetchSchool} />}
      {activeTab === 'years' && <SchoolYearsTab school={school} onUpdated={fetchSchool} />}
    </div>
  );
}

// --- Info Tab ---

function SchoolInfoTab({ school, onUpdated }: { school: School; onUpdated: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: school.name,
    address: school.address || '',
    city: school.city || '',
    postalCode: school.postalCode || '',
    phone: school.phone || '',
    email: school.email || '',
    uaiCode: school.uaiCode || '',
    type: school.type,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
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
    setEditing(false);
  }, [school]);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Adresse e-mail invalide';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    setServerError('');
    try {
      await api.patch(`/schools/${school.id}`, {
        ...form,
        address: form.address || undefined,
        city: form.city || undefined,
        postalCode: form.postalCode || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        uaiCode: form.uaiCode || undefined,
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

  if (!editing) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-primary-900">Paramètres de l&apos;école</h2>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
            Modifier
          </Button>
        </div>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {([
            ['Nom', school.name],
            ['Type', schoolTypeOptions.find((o) => o.value === school.type)?.label],
            ['Adresse', school.address],
            ['Ville', school.city],
            ['Code postal', school.postalCode],
            ['Téléphone', school.phone],
            ['E-mail', school.email],
            ['Code UAI', school.uaiCode],
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

  return (
    <Card>
      <form onSubmit={handleSave} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Modifier les informations</h2>
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

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

        <Input id="uaiCode" label="Code UAI" value={form.uaiCode} onChange={update('uaiCode')} />

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

// --- School Years Tab ---

function SchoolYearsTab({ school, onUpdated }: { school: School; onUpdated: () => void }) {
  const [yearModalOpen, setYearModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<SchoolYear | null>(null);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [activeYearId, setActiveYearId] = useState<string | null>(null);
  const [periodYearId, setPeriodYearId] = useState<string>('');

  const years = school.schoolYears || [];

  const openCreateYear = () => { setEditingYear(null); setYearModalOpen(true); };
  const openEditYear = (year: SchoolYear) => { setEditingYear(year); setYearModalOpen(true); };

  const openCreatePeriod = (yearId: string) => {
    setPeriodYearId(yearId);
    setEditingPeriod(null);
    setPeriodModalOpen(true);
  };
  const openEditPeriod = (yearId: string, period: Period) => {
    setPeriodYearId(yearId);
    setEditingPeriod(period);
    setPeriodModalOpen(true);
  };

  const handleDeleteYear = async (yearId: string) => {
    try {
      await api.delete(`/schools/${school.id}/years/${yearId}`);
      onUpdated();
    } catch {
      // silently ignore
    }
  };

  const handleDeletePeriod = async (yearId: string, periodId: string) => {
    try {
      await api.delete(`/schools/${school.id}/years/${yearId}/periods/${periodId}`);
      onUpdated();
    } catch {
      // silently ignore
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-900">Années scolaires</h2>
        <Button size="sm" onClick={openCreateYear}>
          <Plus className="h-4 w-4" />
          Ajouter une année
        </Button>
      </div>

      {years.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-gray-500">Aucune année scolaire enregistrée.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {years.map((year) => {
            const expanded = activeYearId === year.id;
            return (
              <Card key={year.id} className="p-0">
                <div className="flex items-center justify-between px-5 py-4">
                  <button
                    onClick={() => setActiveYearId(expanded ? null : year.id)}
                    className="flex items-center gap-3 text-left"
                  >
                    {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <div>
                      <span className="font-medium text-primary-900">{year.name}</span>
                      <span className="ml-3 text-xs text-gray-500">
                        {formatDate(year.startDate)} — {formatDate(year.endDate)}
                      </span>
                    </div>
                    {year.isCurrent && (
                      <Badge variant="info">
                        <Star className="mr-1 h-3 w-3" />
                        Année en cours
                      </Badge>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditYear(year)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteYear(year.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-700">
                        <Calendar className="mr-1 inline h-4 w-4" />
                        Périodes
                      </h3>
                      <Button variant="outline" size="sm" onClick={() => openCreatePeriod(year.id)}>
                        <Plus className="h-3 w-3" />
                        Ajouter
                      </Button>
                    </div>

                    {(!year.periods || year.periods.length === 0) ? (
                      <p className="py-3 text-center text-xs text-gray-400">Aucune période définie.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs font-medium uppercase text-gray-500">
                            <th className="pb-2 text-left">Ordre</th>
                            <th className="pb-2 text-left">Nom</th>
                            <th className="pb-2 text-left">Début</th>
                            <th className="pb-2 text-left">Fin</th>
                            <th className="pb-2 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {year.periods.map((period) => (
                            <tr key={period.id} className="hover:bg-gray-50">
                              <td className="py-2 text-gray-500">{period.order}</td>
                              <td className="py-2 font-medium text-primary-900">{period.name}</td>
                              <td className="py-2 text-gray-600">{formatDate(period.startDate)}</td>
                              <td className="py-2 text-gray-600">{formatDate(period.endDate)}</td>
                              <td className="py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEditPeriod(year.id, period)}>
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeletePeriod(year.id, period.id)}>
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <YearModal
        open={yearModalOpen}
        onClose={() => setYearModalOpen(false)}
        schoolId={school.id}
        year={editingYear}
        onSaved={() => { setYearModalOpen(false); onUpdated(); }}
      />

      <PeriodModal
        open={periodModalOpen}
        onClose={() => setPeriodModalOpen(false)}
        schoolId={school.id}
        yearId={periodYearId}
        period={editingPeriod}
        onSaved={() => { setPeriodModalOpen(false); onUpdated(); }}
      />
    </div>
  );
}

// --- Year Modal ---

function YearModal({ open, onClose, schoolId, year, onSaved }: {
  open: boolean; onClose: () => void; schoolId: string; year: SchoolYear | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', isCurrent: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(year
        ? { name: year.name, startDate: toInputDate(year.startDate), endDate: toInputDate(year.endDate), isCurrent: year.isCurrent }
        : { name: '', startDate: '', endDate: '', isCurrent: false },
      );
      setErrors({});
      setServerError('');
    }
  }, [open, year]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.startDate) errs.startDate = 'La date de début est requise';
    if (!form.endDate) errs.endDate = 'La date de fin est requise';
    if (form.startDate && form.endDate && form.startDate >= form.endDate) errs.endDate = 'Doit être après la date de début';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (year) {
        await api.patch(`/schools/${schoolId}/years/${year.id}`, form);
      } else {
        await api.post(`/schools/${schoolId}/years`, form);
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={year ? 'Modifier l\'année scolaire' : 'Nouvelle année scolaire'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input
          id="yearName"
          label="Nom"
          placeholder="Ex: 2025-2026"
          value={form.name}
          onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="startDate"
            label="Date de début"
            type="date"
            value={form.startDate}
            onChange={(e) => { setForm((p) => ({ ...p, startDate: e.target.value })); setErrors((p) => ({ ...p, startDate: '' })); }}
            error={errors.startDate}
          />
          <Input
            id="endDate"
            label="Date de fin"
            type="date"
            value={form.endDate}
            onChange={(e) => { setForm((p) => ({ ...p, endDate: e.target.value })); setErrors((p) => ({ ...p, endDate: '' })); }}
            error={errors.endDate}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-primary-900">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm((p) => ({ ...p, isCurrent: e.target.checked }))}
            className="rounded border-gray-300 text-accent-500 focus:ring-accent-500"
          />
          Année scolaire en cours
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : year ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Period Modal ---

function PeriodModal({ open, onClose, schoolId, yearId, period, onSaved }: {
  open: boolean; onClose: () => void; schoolId: string; yearId: string; period: Period | null; onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', order: 1 });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(period
        ? { name: period.name, startDate: toInputDate(period.startDate), endDate: toInputDate(period.endDate), order: period.order }
        : { name: '', startDate: '', endDate: '', order: 1 },
      );
      setErrors({});
      setServerError('');
    }
  }, [open, period]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Le nom est requis';
    if (!form.startDate) errs.startDate = 'La date de début est requise';
    if (!form.endDate) errs.endDate = 'La date de fin est requise';
    if (form.startDate && form.endDate && form.startDate >= form.endDate) errs.endDate = 'Doit être après la date de début';
    if (form.order < 1) errs.order = 'L\'ordre doit être supérieur à 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setSaving(true);
    try {
      if (period) {
        await api.patch(`/schools/${schoolId}/years/${yearId}/periods/${period.id}`, form);
      } else {
        await api.post(`/schools/${schoolId}/years/${yearId}/periods`, form);
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={period ? 'Modifier la période' : 'Nouvelle période'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>}

        <Input
          id="periodName"
          label="Nom"
          placeholder="Ex: Période 1"
          value={form.name}
          onChange={(e) => { setForm((p) => ({ ...p, name: e.target.value })); setErrors((p) => ({ ...p, name: '' })); }}
          error={errors.name}
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            id="periodStart"
            label="Date de début"
            type="date"
            value={form.startDate}
            onChange={(e) => { setForm((p) => ({ ...p, startDate: e.target.value })); setErrors((p) => ({ ...p, startDate: '' })); }}
            error={errors.startDate}
          />
          <Input
            id="periodEnd"
            label="Date de fin"
            type="date"
            value={form.endDate}
            onChange={(e) => { setForm((p) => ({ ...p, endDate: e.target.value })); setErrors((p) => ({ ...p, endDate: '' })); }}
            error={errors.endDate}
          />
        </div>

        <Input
          id="periodOrder"
          label="Ordre"
          type="number"
          min={1}
          value={String(form.order)}
          onChange={(e) => { setForm((p) => ({ ...p, order: parseInt(e.target.value) || 1 })); setErrors((p) => ({ ...p, order: '' })); }}
          error={errors.order}
        />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Enregistrement...' : period ? 'Modifier' : 'Créer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toInputDate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}
