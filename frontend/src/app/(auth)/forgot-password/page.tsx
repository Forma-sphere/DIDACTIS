'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <Card>
      {sent ? (
        <div className="space-y-4 text-center">
          <h2 className="text-lg font-semibold text-primary-900">E-mail envoyé</h2>
          <p className="text-sm text-gray-600">
            Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation.
          </p>
          <Link href="/login">
            <Button variant="outline" className="w-full">Retour à la connexion</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h2 className="text-lg font-semibold text-primary-900">Mot de passe oublié</h2>
          <p className="text-sm text-gray-600">
            Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </p>
          <Input
            id="email"
            label="Adresse e-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">Envoyer</Button>
          <Link href="/login" className="block text-center text-sm text-accent-600 hover:text-accent-700">
            Retour à la connexion
          </Link>
        </form>
      )}
    </Card>
  );
}
