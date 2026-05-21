'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export type StaffRole = 'owner' | 'head_of_hockey' | 'coach' | 'viewer';

interface Props {
  children: React.ReactNode;
  // If provided, user MUST have one of these roles. Otherwise just needs a valid session.
  requiredRoles?: StaffRole[];
  // Legacy prop for backwards compatibility
  requiredRole?: StaffRole;
}

export default function AuthGuard({ children, requiredRoles, requiredRole }: Props) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    async function verify() {
      // 1. Must have valid Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        router.replace('/login');
        return;
      }

      // Build list of acceptable roles
      const acceptedRoles = requiredRoles || (requiredRole ? [requiredRole] : null);

      // 2. If no role required, valid session is enough
      if (!acceptedRoles) {
        setChecked(true);
        return;
      }

      // 3. Check staff_roles table — fail closed if no record found
      const email = session.user.email.toLowerCase();
      const { data: staffRole, error } = await supabase
        .from('staff_roles')
        .select('role, is_active')
        .eq('email', email)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !staffRole) {
        // No role assigned — fail closed
        router.replace('/dashboard');
        return;
      }

      if (!acceptedRoles.includes(staffRole.role as StaffRole)) {
        router.replace('/dashboard');
        return;
      }

      setChecked(true);
    }
    verify();
  }, [router, requiredRoles, requiredRole]);

  if (!checked) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
    </div>
  );

  return <>{children}</>;
}
