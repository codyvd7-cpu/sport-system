'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ALLOWED_ADMIN_EMAILS = [
  'codyvd7@gmail.com',
];

export default function PortalAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(true);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getSession();

      const email = data.session?.user?.email?.toLowerCase();

      if (!data.session || !email) {
        window.location.assign('/login?redirect=/portal-admin');
        return;
      }

      const allowed = ALLOWED_ADMIN_EMAILS.map((item) =>
        item.toLowerCase()
      ).includes(email);

      if (!allowed) {
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
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <section className="w-full max-w-sm rounded-[2rem] border border-slate-800 bg-slate-950 p-6 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-400">
            St Benedict&apos;s Hockey
          </p>
          <h1 className="mt-3 text-2xl font-black">Checking access...</h1>
          <p className="mt-2 text-sm text-slate-400">
            Confirming your coach login.
          </p>
        </section>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <section className="w-full max-w-md rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 text-center shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
            Access Denied
          </p>

          <h1 className="mt-3 text-2xl font-black">
            You do not have portal admin access.
          </h1>

          <p className="mt-3 text-sm leading-6 text-red-100/80">
            This page is restricted to approved hockey staff only.
          </p>

          <div className="mt-6 flex justify-center gap-3">
            <a
              href="/portal"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-bold text-white"
            >
              Back to Portal
            </a>

            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.assign('/login');
              }}
              className="rounded-xl border border-red-400/40 bg-red-500/20 px-4 py-3 text-sm font-bold text-red-100"
            >
              Sign Out
            </button>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}