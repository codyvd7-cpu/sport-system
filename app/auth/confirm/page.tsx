'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ConfirmInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<'loading'|'error'>('loading');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    async function confirm() {
      const tokenHash = searchParams.get('token_hash');
      const type = searchParams.get('type') as any;
      const next = searchParams.get('next') || '/login';
      if (!tokenHash || !type) { setError('Invalid confirmation link.'); setStatus('error'); return; }
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      if (error) { setError(error.message); setStatus('error'); return; }
      router.replace(next);
    }
    confirm();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="text-center">
        {status === 'loading' ? (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500"/>
            <p className="text-sm text-slate-400">Confirming your account…</p>
          </>
        ) : (
          <>
            <p className="text-red-400 font-semibold mb-2">Confirmation failed</p>
            <p className="text-sm text-slate-500 mb-4">{error}</p>
            <a href="/login" className="text-sky-400 text-sm hover:underline">Go to login</a>
          </>
        )}
      </div>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <React.Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-sky-500"/>
      </main>
    }>
      <ConfirmInner/>
    </React.Suspense>
  );
}