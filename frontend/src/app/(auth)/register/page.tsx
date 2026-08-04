'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      router.push('/dashboard');
    } catch {
      setError('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="text-lg font-semibold text-primary-900">Créer un compte</h2>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input id="firstName" label="Prénom" value={form.firstName} onChange={update('firstName')} required />
          <Input id="lastName" label="Nom" value={form.lastName} onChange={update('lastName')} required />
        </div>
        <Input id="email" label="Adresse e-mail" type="email" value={form.email} onChange={update('email')} required />
        <Input id="password" label="Mot de passe" type="password" value={form.password} onChange={update('password')} required minLength={8} />

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
