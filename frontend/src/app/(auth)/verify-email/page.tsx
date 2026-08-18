'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

type Status = 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'error');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setMessage('Lien de vérification invalide');
      return;
    }

    api.post('/auth/verify-email', { token })
      .then(() => {
        setStatus('success');
        setMessage('Votre adresse e-mail a été vérifiée avec succès.');
      })
      .catch((err) => {
        setStatus('error');
        const msg = err?.response?.data?.message;
        setMessage(typeof msg === 'string' ? msg : 'Token de vérification invalide ou expiré');
      });
  }, [token]);

  return (
    <Card>
      <div className="space-y-4 text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-accent-500" />
            <h2 className="text-lg font-semibold text-primary-900">Vérification en cours...</h2>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-accent-500" />
            <h2 className="text-lg font-semibold text-primary-900">E-mail vérifié</h2>
            <p className="text-sm text-gray-600">{message}</p>
            <Link href="/dashboard">
              <Button className="w-full">Accéder à Didactys</Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="text-lg font-semibold text-primary-900">Erreur de vérification</h2>
            <p className="text-sm text-gray-600">{message}</p>
            <Link href="/login">
              <Button variant="outline" className="w-full">Retour à la connexion</Button>
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
