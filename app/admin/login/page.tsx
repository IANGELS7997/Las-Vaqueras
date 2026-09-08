'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/brand-logo';
import { Button } from '@/components/ui/button';

export default function KitchenLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/kitchen/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error || 'No se pudo entrar');
        return;
      }
      router.replace('/admin/kitchen');
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <div className="mb-6 flex flex-col items-center text-center">
        <BrandLogo className="h-14" />
        <h1 className="mt-4 text-2xl font-bold text-white">Panel de cocina</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acceso solo para el personal</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
        <label className="block text-sm text-muted-foreground">
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-white outline-none focus:border-brand-500"
            autoComplete="current-password"
            required
          />
        </label>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="submit" className="w-full bg-brand-500 hover:bg-brand-600" disabled={loading}>
          {loading ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  );
}
