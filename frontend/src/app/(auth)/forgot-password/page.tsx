'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!email.trim()) { setError('L\'adresse e-mail est requise'); return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Adresse e-mail invalide'); return false; }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 text-accent-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-primary-900">Vérifiez votre boîte mail</h2>
          <p className="text-sm text-gray-600">
            Si un compte existe avec l&apos;adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Retour à la connexion</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Mot de passe oublié</h2>
        <p className="text-sm text-gray-600">
          Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.
        </p>

        <Input
          id="email"
          label="Adresse e-mail"
          type="email"
          placeholder="nom@exemple.fr"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(''); }}
          error={error}
          autoComplete="email"
          autoFocus
        />

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Envoi...' : 'Envoyer le lien'}
        </Button>

        <Link href="/login" className="block text-center text-sm text-accent-600 hover:text-accent-700">
          Retour à la connexion
        </Link>
      </form>
    </Card>
  );
}
