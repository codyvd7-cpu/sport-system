// Shared React Query hooks
// Use these instead of raw useEffect + supabase calls in components

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

// ── Athletes ─────────────────────────────────────────────────
export function useAthletes(teams?: string[]) {
  return useQuery({
    queryKey: ['athletes', teams?.join(',') ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('athletes')
        .select('id,full_name,team,availability,position,age_group,photo_url,player_code')
        .order('full_name');
      if (teams && teams.length > 0) q = q.in('team', teams);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 2 * 60_000, // athletes don't change often
  });
}

// ── Attendance ───────────────────────────────────────────────
export function useAttendance(days = 30, teams?: string[]) {
  return useQuery({
    queryKey: ['attendance', days, teams?.join(',') ?? 'all'],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
      const { data: athletes } = await supabase
        .from('athletes').select('id,team').in('team', teams ?? []);
      const ids = (athletes ?? []).map((a: Row) => a.id);
      if (!ids.length && teams) return [];
      let q = supabase.from('attendance')
        .select('id,athlete_id,status,session_date,session_type')
        .gte('session_date', since)
        .order('session_date', { ascending: false })
        .limit(1000);
      if (ids.length) q = q.in('athlete_id', ids);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 30_000, // attendance changes frequently
  });
}

// ── Portal Results ────────────────────────────────────────────
export function usePortalResults(team?: string) {
  return useQuery({
    queryKey: ['portal_results', team ?? 'all'],
    queryFn: async () => {
      let q = supabase.from('portal_results')
        .select('*')
        .order('result_date', { ascending: false })
        .limit(100);
      if (team) q = q.eq('team', team);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 5 * 60_000,
  });
}

// ── Portal Fixtures ───────────────────────────────────────────
export function usePortalFixtures(team?: string) {
  return useQuery({
    queryKey: ['portal_fixtures', team ?? 'all'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      let q = supabase.from('portal_fixtures')
        .select('*')
        .gte('fixture_date', today)
        .order('fixture_date')
        .limit(20);
      if (team) q = q.eq('team', team);
      const { data, error } = await q;
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 5 * 60_000,
  });
}

// ── Coach notes ───────────────────────────────────────────────
export function useCoachNotes(athleteId: string) {
  return useQuery({
    queryKey: ['coach_notes', athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coach_notes')
        .select('*')
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Row[];
    },
    enabled: !!athleteId,
  });
}

// ── Staff roles ───────────────────────────────────────────────
export function useStaff() {
  return useQuery({
    queryKey: ['staff_roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_roles')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Row[];
    },
    staleTime: 5 * 60_000,
  });
}
