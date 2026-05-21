'use client';
import * as React from 'react';
import { supabase } from './supabase';

export type StaffRole = 'owner' | 'head_of_hockey' | 'coach' | 'viewer';
// Backwards-compatible alias
export type UserRole = StaffRole | null;

export function useRole() {
  const [role, setRole] = React.useState<StaffRole | null>(null);
  const [email, setEmail] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setRole(null);
        setEmail('');
        setLoading(false);
        return;
      }

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      // Read role from staff_roles table — fail closed, no default
      const { data: staffRole } = await supabase
        .from('staff_roles')
        .select('role, is_active')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      setRole(staffRole?.role as StaffRole || null);
      setLoading(false);
    }
    load();
  }, []);

  return {
    role,
    email,
    loading,
    isOwner: role === 'owner',
    isHOH: role === 'head_of_hockey' || role === 'owner',
    isCoach: role === 'coach' || role === 'head_of_hockey' || role === 'owner',
  };
}
