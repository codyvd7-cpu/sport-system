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
  teams:           string[];
  sport:           SportKey | null;
  loading:         boolean;
  isOwner:         boolean;
  isHOS:           boolean;
  isMIC:           boolean;
  isHOH:           boolean;        // legacy alias for isHOS || isMIC
  isCoach:         boolean;
  canSeeAllSports: boolean;
  canSeeAllTeams:  boolean;
};

export function useRole(): StaffProfile {
  const [role,   setRole]   = React.useState<StaffRole | null>(null);
  const [email,  setEmail]  = React.useState('');
  const [teams,  setTeams]  = React.useState<string[]>([]);
  const [sport,  setSport]  = React.useState<SportKey | null>(() => {
    if (typeof window === 'undefined') return null;
    return (localStorage.getItem('activeSport') as SportKey) || null;
  });
  const [loading,setLoading]= React.useState(true);

  // Set CSS variable immediately so nav colour never flashes
  React.useLayoutEffect(() => {
    const SPORT_COLORS: Record<string,string> = {
      hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',
      rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4',
    };
    const color = SPORT_COLORS[(sport||'hockey')] || '#38bdf8';
    document.documentElement.style.setProperty('--sport-color', color);
    document.documentElement.style.setProperty('--sport-color-dim', `${color}1a`);
    document.documentElement.style.setProperty('--sport-color-border', `${color}4d`);
  }, [sport]);

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

      // Sport context:
      // - MIC/coach: use DB sport
      // - owner/HOS: read from localStorage (set by landing page click)
      const dbSport = staffRow.sport as SportKey | null;
      const isHOSRole = ['owner','head_of_sport','deputy_head_of_sport'].includes(staffRow.role);
      if (isHOSRole) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('activeSport') : null;
        setSport((stored as SportKey) || dbSport || null);
      } else {
        setSport(dbSport || null);
      }

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
  const isHOH          = isHOS || isMIC;

  return {
    role, email, teams, sport, loading,
    isOwner, isHOS, isMIC, isHOH, isCoach,
    canSeeAllSports, canSeeAllTeams,
  };
}
