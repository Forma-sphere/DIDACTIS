'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
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
    if (!form.password) {
      errs.password = 'Le mot de passe est requis';
    } else if (form.password.length < 8) {
      errs.password = 'Minimum 8 caractères';
    }
    if (form.password !== form.confirmPassword) {
      errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return { level: 0, label: '' };
    let score = 0;
    if (p.length >= 8) score++;
    if (p.length >= 12) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { level: 1, label: 'Faible', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Moyen', color: 'bg-amber-500' };
    return { level: 3, label: 'Fort', color: 'bg-green-500' };
  };

  const strength = passwordStrength();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : Array.isArray(msg) ? msg[0] : 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Créer un compte</h2>

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
          placeholder="nom@exemple.fr"
          value={form.email}
          onChange={update('email')}
          error={errors.email}
          autoComplete="email"
        />

        <div className="relative">
          <Input
            id="password"
            label="Mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 8 caractères"
            value={form.password}
            onChange={update('password')}
            error={errors.password}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {form.password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className={`h-1 flex-1 rounded-full ${n <= strength.level ? strength.color : 'bg-gray-200'}`} />
              ))}
            </div>
            <p className="text-xs text-gray-500">{strength.label}</p>
          </div>
        )}

        <Input
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={form.confirmPassword}
          onChange={update('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Inscription...' : 'S\'inscrire'}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Déjà un compte ?{' '}
          <Link href="/login" className="text-accent-600 hover:text-accent-700">Se connecter</Link>
        </p>
      </form>
    </Card>
  );
}
