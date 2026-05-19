'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/lib/useRole';

interface Props {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export default function AuthGuard({ children, requiredRole }: Props) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      if (requiredRole) {
        const userRole = session.user?.user_metadata?.role as UserRole || 'coach';
        if (userRole !== requiredRole) { router.replace('/dashboard'); return; }
      }
      setChecked(true);
    });
  }, [router, requiredRole]);

  if (!checked) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
    </div>
  );

  return <>{children}</>;
}
