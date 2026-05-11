'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function PlayerPortalPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) { setError('Please enter your access code.'); return; }
    setChecking(true);
    setError('');

    const { data, error: err } = await supabase
      .from('athletes')
      .select('id, player_code')
      .eq('player_code', code.trim().toUpperCase())
      .single();

    if (err || !data) {
      setError('Invalid code. Please check and try again.');
      setChecking(false);
      return;
    }

    router.push(`/player/${code.trim().toUpperCase()}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#06071a] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 text-center">
          <span className="text-5xl">🏑</span>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.25em] text-sky-400">St Benedict's College</p>
          <h1 className="mt-1 text-2xl font-black text-white">Player Portal</h1>
          <p className="mt-2 text-sm text-slate-500">Enter your access code to view your profile.</p>
        </div>

        {/* Code entry */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter access code..."
              maxLength={12}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-center text-xl font-black uppercase tracking-[0.3em] text-white outline-none transition placeholder:text-slate-600 placeholder:text-base placeholder:tracking-normal focus:border-sky-500"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={checking || !code.trim()}
            className="w-full rounded-2xl border border-sky-500 bg-sky-500/15 py-4 text-sm font-black text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Access My Profile →'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          Don't have a code? Ask your coach.
        </p>
      </div>
    </main>
  );
}