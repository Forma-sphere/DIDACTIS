'use client';

import { Button } from '@/components/ui/Button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold text-primary-900">Une erreur est survenue</h1>
      <p className="text-gray-600">Veuillez réessayer ou contacter le support.</p>
      <Button onClick={reset}>Réessayer</Button>
    </div>
  );
}
