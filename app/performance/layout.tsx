'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.assign('/login?redirect=' + window.location.pathname);
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
          <p className="text-sm text-slate-400">Checking access...</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}