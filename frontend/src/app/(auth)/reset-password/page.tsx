'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!password) {
      errs.password = 'Le mot de passe est requis';
    } else if (password.length < 8) {
      errs.password = 'Minimum 8 caractères';
    }
    if (password !== confirmPassword) {
      errs.confirmPassword = 'Les mots de passe ne correspondent pas';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setServerError(typeof msg === 'string' ? msg : 'Token invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <h2 className="text-lg font-semibold text-primary-900">Lien invalide</h2>
          <p className="text-sm text-gray-600">Ce lien de réinitialisation est invalide ou a expiré.</p>
          <Link href="/forgot-password">
            <Button className="w-full">Demander un nouveau lien</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-accent-500" />
          <h2 className="text-lg font-semibold text-primary-900">Mot de passe modifié</h2>
          <p className="text-sm text-gray-600">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
          <Link href="/login">
            <Button className="w-full">Se connecter</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Nouveau mot de passe</h2>

        {serverError && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{serverError}</div>
        )}

        <div className="relative">
          <Input
            id="password"
            label="Nouveau mot de passe"
            type={showPassword ? 'text' : 'password'}
            placeholder="Minimum 8 caractères"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: '' })); }}
            error={errors.password}
            autoComplete="new-password"
            autoFocus
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

        <Input
          id="confirmPassword"
          label="Confirmer le mot de passe"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setErrors((p) => ({ ...p, confirmPassword: '' })); }}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Réinitialisation...' : 'Réinitialiser le mot de passe'}
        </Button>
      </form>
    </Card>
  );
}
