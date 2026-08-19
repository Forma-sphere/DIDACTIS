'use client';

import { useState, useEffect, type FormEvent } from 'react';
import {
  User as UserIcon, Settings, Shield, Key, Eye,
  Check, AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type {
  UserProfile, UserPreferences, SecurityInfo, AccessInfo,
  Theme, AppLanguage,
} from '@/types';

const tabs = [
  { key: 'profile', label: 'Profil', icon: UserIcon },
  { key: 'preferences', label: 'Préférences', icon: Settings },
  { key: 'notifications', label: 'Notifications', icon: AlertCircle },
  { key: 'security', label: 'Sécurité', icon: Shield },
  { key: 'access', label: 'Gestion des accès', icon: Key },
] as const;

type Tab = (typeof tabs)[number]['key'];

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  DIRECTOR: 'Directeur',
  TEACHER: 'Enseignant',
};

const themeLabels: Record<Theme, string> = {
  LIGHT: 'Clair',
  DARK: 'Sombre',
  SYSTEM: 'Système',
};

const languageLabels: Record<AppLanguage, string> = {
  FR: 'Français',
  EN: 'English',
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary-900">Paramètres</h1>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 pb-3 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'border-accent-500 text-accent-700'
                  : 'border-transparent text-gray-500 hover:text-primary-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'preferences' && <PreferencesTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'access' && <AccessTab />}
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────

function ProfileTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<UserProfile>('/settings/profile');
        setProfile(data);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setPhone(data.phone || '');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Le prénom est obligatoire';
    if (!lastName.trim()) errs.lastName = 'Le nom est obligatoire';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setSuccess('');
    try {
      const { data } = await api.patch<UserProfile>('/settings/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
      });
      setProfile(data);
      setEditing(false);
      setSuccess('Profil mis à jour avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!profile) return <p className="py-8 text-center text-sm text-gray-500">Impossible de charger le profil.</p>;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-primary-900">Informations personnelles</h2>
        {!editing && (
          <Button variant="outline" size="sm" onClick={() => { setEditing(true); setErrors({}); setSuccess(''); }}>
            Modifier
          </Button>
        )}
      </div>

      {success && <SuccessMessage message={success} />}

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input id="s-fn" label="Prénom *" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={errors.firstName} />
          <Input id="s-ln" label="Nom *" value={lastName} onChange={(e) => setLastName(e.target.value)} error={errors.lastName} />
          <Input id="s-ph" label="Téléphone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <div className="flex items-center gap-2 pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
            <Button type="button" variant="outline" onClick={() => {
              setEditing(false);
              setFirstName(profile.firstName);
              setLastName(profile.lastName);
              setPhone(profile.phone || '');
              setErrors({});
            }}>
              Annuler
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg">
          <FieldDisplay label="Prénom" value={profile.firstName} />
          <FieldDisplay label="Nom" value={profile.lastName} />
          <FieldDisplay label="Email" value={profile.email} />
          <FieldDisplay label="Téléphone" value={profile.phone || '—'} />
          <FieldDisplay label="Rôle" value={roleLabels[profile.role] || profile.role} />
          <FieldDisplay label="École" value={profile.school?.name || '—'} />
        </dl>
      )}
    </Card>
  );
}

// ─── Preferences Tab ────────────────────────────────────────────

function PreferencesTab() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<Theme>('SYSTEM');
  const [language, setLanguage] = useState<AppLanguage>('FR');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<UserPreferences>('/settings/preferences');
        setPrefs(data);
        setTheme(data.theme);
        setLanguage(data.language);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      const { data } = await api.patch<UserPreferences>('/settings/preferences', {
        theme,
        language,
        notificationsEnabled: prefs?.notificationsEnabled ?? true,
      });
      setPrefs(data);
      setSuccess('Préférences mises à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-primary-900 mb-4">Préférences d&apos;affichage</h2>

      {success && <SuccessMessage message={success} />}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label htmlFor="pref-theme" className="block text-sm font-medium text-primary-900">Thème *</label>
          <select
            id="pref-theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {(Object.keys(themeLabels) as Theme[]).map((t) => (
              <option key={t} value={t}>{themeLabels[t]}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="pref-lang" className="block text-sm font-medium text-primary-900">Langue *</label>
          <select
            id="pref-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value as AppLanguage)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500"
          >
            {(Object.keys(languageLabels) as AppLanguage[]).map((l) => (
              <option key={l} value={l}>{languageLabels[l]}</option>
            ))}
          </select>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Notifications Tab ──────────────────────────────────────────

function NotificationsTab() {
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<UserPreferences>('/settings/preferences');
        setPrefs(data);
        setEnabled(data.notificationsEnabled);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleToggle = async () => {
    if (!prefs) return;
    setSaving(true);
    setSuccess('');
    try {
      const { data } = await api.patch<UserPreferences>('/settings/preferences', {
        theme: prefs.theme,
        language: prefs.language,
        notificationsEnabled: !enabled,
      });
      setPrefs(data);
      setEnabled(data.notificationsEnabled);
      setSuccess('Notifications mises à jour');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <Card>
      <h2 className="text-lg font-semibold text-primary-900 mb-4">Notifications</h2>

      {success && <SuccessMessage message={success} />}

      <div className="flex items-center justify-between max-w-md rounded-lg border border-gray-200 p-4">
        <div>
          <p className="text-sm font-medium text-primary-900">Activer les notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">Recevoir les notifications de l&apos;application</p>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 ${
            enabled ? 'bg-accent-500' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>
    </Card>
  );
}

// ─── Security Tab ───────────────────────────────────────────────

function SecurityTab() {
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<SecurityInfo>('/settings/security');
        setSecurity(data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!currentPassword) errs.currentPassword = 'Le mot de passe actuel est obligatoire';
    if (!newPassword) errs.newPassword = 'Le nouveau mot de passe est obligatoire';
    else if (newPassword.length < 8) errs.newPassword = 'Le mot de passe doit contenir au moins 8 caractères';
    if (!confirmPassword) errs.confirmPassword = 'La confirmation est obligatoire';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSaving(true);
    setSuccess('');
    setApiError('');
    try {
      await api.patch('/settings/security', { currentPassword, newPassword, confirmPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setErrors({});
      setSuccess('Mot de passe modifié avec succès');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setApiError(error.response?.data?.message || 'Une erreur est survenue');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {security && (
        <Card>
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Informations de sécurité</h2>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-lg">
            <FieldDisplay label="Email" value={security.email} />
            <FieldDisplay label="Email vérifié" value={security.emailVerified ? 'Oui' : 'Non'} />
            <FieldDisplay label="Compte créé le" value={new Date(security.createdAt).toLocaleDateString('fr-FR')} />
            <FieldDisplay label="Dernière mise à jour" value={new Date(security.updatedAt).toLocaleDateString('fr-FR')} />
          </dl>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Modifier le mot de passe</h2>

        {success && <SuccessMessage message={success} />}
        {apiError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <Input
            id="sec-cur" label="Mot de passe actuel *" type="password"
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            error={errors.currentPassword}
          />
          <Input
            id="sec-new" label="Nouveau mot de passe *" type="password"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            error={errors.newPassword}
          />
          <Input
            id="sec-conf" label="Confirmer le mot de passe *" type="password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
          />
          <div className="pt-2">
            <Button type="submit" disabled={saving}>{saving ? 'Modification...' : 'Modifier le mot de passe'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// ─── Access Tab ─────────────────────────────────────────────────

function AccessTab() {
  const [access, setAccess] = useState<AccessInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await api.get<AccessInfo>('/settings/access');
        setAccess(data);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) return <Spinner />;
  if (!access) return <p className="py-8 text-center text-sm text-gray-500">Impossible de charger les accès.</p>;

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Rôle</h2>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-accent-50 p-3">
            <Eye className="h-5 w-5 text-accent-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-primary-900">{roleLabels[access.role] || access.role}</p>
            <p className="text-xs text-gray-500">{access.email}</p>
          </div>
          <span className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            access.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {access.isActive ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Permissions</h2>
        <p className="text-xs text-gray-500 mb-3">Les permissions sont définies par votre rôle et ne sont pas modifiables depuis cette interface.</p>
        <ul className="space-y-2">
          {access.permissions.map((perm, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-primary-900">
              <Check className="h-4 w-4 text-accent-500 shrink-0" />
              {perm}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-primary-900">{value}</dd>
    </div>
  );
}

function SuccessMessage({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">
      <Check className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}
