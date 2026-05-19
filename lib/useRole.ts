'use client';
import * as React from 'react';
import { supabase } from './supabase';

export type UserRole = 'head_of_hockey' | 'coach' | null;

export function useRole() {
  const [role, setRole] = React.useState<UserRole>(null);
  const [email, setEmail] = React.useState<string>('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const r = session?.user?.user_metadata?.role as UserRole || 'coach';
      setRole(r);
      setEmail(session?.user?.email || '');
      setLoading(false);
    });
  }, []);

  return { role, email, loading, isHOH: role === 'head_of_hockey' };
}
