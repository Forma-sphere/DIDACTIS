'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, resendVerification } = useAuth();
  const [verificationSent, setVerificationSent] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-accent-200 border-t-accent-500" />
      </div>
    );
  }

  const handleResend = async () => {
    await resendVerification();
    setVerificationSent(true);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {user && !user.emailVerified && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-6 py-2 text-sm text-amber-800">
            <Mail className="h-4 w-4 shrink-0" />
            <span>Votre adresse e-mail n&apos;est pas vérifiée.</span>
            {verificationSent ? (
              <span className="font-medium text-accent-700">E-mail envoyé !</span>
            ) : (
              <button onClick={handleResend} className="font-medium text-accent-700 underline hover:text-accent-800">
                Renvoyer l&apos;e-mail
              </button>
            )}
          </div>
        )}
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Breadcrumb />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
