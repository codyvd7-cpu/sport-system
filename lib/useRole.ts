'use client';
import * as React from 'react';
import { supabase } from './supabase';
import type { SportKey } from './sports';

export type StaffRole =
  | 'owner'
  | 'head_of_sport'
  | 'deputy_head_of_sport'
  | 'mic'
  | 'coach'
  | 'head_of_hockey'  // legacy — treated as mic with sport=hockey
  | 'viewer';

export type UserRole = StaffRole | null;

export type StaffProfile = {
  role:            StaffRole | null;
  email:           string;
  teams:           string[];       // assigned teams — empty = all teams in their sport
  sport:           SportKey | null;// their sport — null means all sports (HOS/deputy/owner)
  loading:         boolean;
  isOwner:         boolean;
  isHOS:           boolean;        // head_of_sport or deputy_head_of_sport or owner
  isMIC:           boolean;        // mic (or legacy head_of_hockey)
  isCoach:         boolean;        // any authenticated staff
  canSeeAllSports: boolean;        // owner, head_of_sport, deputy_head_of_sport
  canSeeAllTeams:  boolean;        // all of the above + mic
};

export function useRole(): StaffProfile {
  const [role,   setRole]   = React.useState<StaffRole | null>(null);
  const [email,  setEmail]  = React.useState('');
  const [teams,  setTeams]  = React.useState<string[]>([]);
  const [sport,  setSport]  = React.useState<SportKey | null>(null);
  const [loading,setLoading]= React.useState(true);

  React.useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) { setLoading(false); return; }

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      const { data: staffRow } = await supabase
        .from('staff_roles')
        .select('role, teams, sport, is_active')
        .eq('email', userEmail)
        .eq('is_active', true)
        .maybeSingle();

      if (!staffRow) { setLoading(false); return; }

      setRole(staffRow.role as StaffRole);

      // Sport — null means all sports
      setSport((staffRow.sport as SportKey) || null);

      // Teams
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

  const isOwner        = role === 'owner';
  const isHOS          = role === 'owner' || role === 'head_of_sport' || role === 'deputy_head_of_sport';
  const isMIC          = role === 'mic' || role === 'head_of_hockey';
  const isCoach        = !!role;
  const canSeeAllSports= isHOS;
  const canSeeAllTeams = isHOS || isMIC;

  // Legacy: isHOH kept for backward compat with existing pages
  const isHOH          = isHOS || isMIC;

  return {
    role, email, teams, sport, loading,
    isOwner, isHOS, isMIC, isCoach,
    canSeeAllSports, canSeeAllTeams,
    // @ts-ignore legacy
    isHOH,
  };
}
