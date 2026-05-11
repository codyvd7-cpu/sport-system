'use client';

import { useEffect, useState } from 'react';
import { checkStaffAccess } from '@/lib/staffAccess';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    async function checkAccess() {
      const result = await checkStaffAccess(['owner', 'head_of_hockey', 'coach']);

      if (!result.email) {
        window.location.assign('/login?redirect=' + window.location.pathname);
        return;
      }

      if (!result.allowed) {
        setReason(result.reason || 'You do not have permission to access this area.');
        setBlocked(true);
        setChecking(false);
        return;
      }

      setChecking(false);
    }

    checkAccess();
  }, []);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Checking staff access...</p>
        </div>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Access Denied
          </p>

          <h1 className="mt-3 text-2xl font-black">
            You do not have coach access.
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-100/80">
            {reason || 'This area is restricted to approved hockey staff only.'}
          </p>

          <a
            href="/portal"
            className="mt-6 inline-flex rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white"
          >
            Back to Portal
          </a>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}