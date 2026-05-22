'use client';
import * as React from 'react';
import { supabase } from './supabase';

export type StaffRole = 'owner' | 'head_of_hockey' | 'coach' | 'viewer';
export type UserRole = StaffRole | null;

export type StaffProfile = {
  role: StaffRole | null;
  email: string;
  teams: string[];       // teams assigned to this coach — empty means all (HOH/owner)
  loading: boolean;
  isOwner: boolean;
  isHOH: boolean;       // true for owner + head_of_hockey
  isCoach: boolean;     // true for all authenticated staff
  canSeeAllTeams: boolean; // true for owner + HOH only
};

export function useRole(): StaffProfile {
  const [role, setRole] = React.useState<StaffRole | null>(null);
  const [email, setEmail] = React.useState('');
  const [teams, setTeams] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        setLoading(false);
        return;
      }

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      const { data: staffRow } = await supabase
        .from('staff_roles')
        .select('role, teams, is_active')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (!staffRow) { setLoading(false); return; }

      setRole(staffRow.role as StaffRole);

      // teams is a postgres text[] array — empty array means see all (HOH/owner)
      const raw = staffRow.teams;
      if (Array.isArray(raw)) {
        setTeams(raw.filter(Boolean));
      } else if (typeof raw === 'string' && raw.trim()) {
        setTeams(raw.split(',').map((t: string) => t.trim()).filter(Boolean));
      }

      setLoading(false);
    }
    load();
  }, []);

  const isOwner = role === 'owner';
  const isHOH = role === 'owner' || role === 'head_of_hockey';
  const isCoach = !!role;
  const canSeeAllTeams = isHOH; // coaches only see their assigned teams

  return { role, email, teams, loading, isOwner, isHOH, isCoach, canSeeAllTeams };
}
