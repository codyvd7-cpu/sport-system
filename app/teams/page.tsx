'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', color: 'violet', teams: ['1sts', '2nds', '3rds', '4ths', '5ths'] },
  { group: 'U16', color: 'sky', teams: ['U16A', 'U16B', 'U16C', 'U16D', 'U16E'] },
  { group: 'U15', color: 'emerald', teams: ['U15A', 'U15B', 'U15C', 'U15D', 'U15E'] },
  { group: 'U14', color: 'amber', teams: ['U14A', 'U14B', 'U14C', 'U14D', 'U14E'] },
];

const COLORS: Record<string, { text: string; bg: string; border: string; badge: string }> = {
  violet:  { text: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  badge: 'bg-violet-500/15 text-violet-300' },
  sky:     { text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     badge: 'bg-sky-500/15 text-sky-300' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500/15 text-emerald-300' },
  amber:   { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   badge: 'bg-amber-500/15 text-amber-300' },
};

function getGroupColor(team: string) {
  const g = TEAM_GROUPS.find((g) => g.teams.includes(team));
  return g ? COLORS[g.color] : COLORS.sky;
}

export default function TeamsPage() {
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading } = useRole();
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (roleLoading) return;
    async function load() {
      let athQuery = supabase.from('athletes').select('id, full_name, team, availability').order('full_name');
      if (!canSeeAllTeams && myTeams.length > 0) athQuery = athQuery.in('team', myTeams);
      const [athRes, attRes] = await Promise.all([
        athQuery,
        supabase.from('attendance').select('athlete_id, status, session_date').gte('session_date', new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0]),
      ]);
      setAthletes(athRes.data || []);
      setAttendance(attRes.data || []);
      setLoading(false);
    }
    load();
  }, [roleLoading, canSeeAllTeams, myTeams.join(',')]);

  const visibleTeamGroups = React.useMemo(() => {
    if (canSeeAllTeams) return TEAM_GROUPS;
    return TEAM_GROUPS.map(g => ({
      ...g,
      teams: g.teams.filter(t => myTeams.includes(t)),
    })).filter(g => g.teams.length > 0);
  }, [canSeeAllTeams, myTeams.join(',')]);

  const allTeams = visibleTeamGroups.flatMap(g => g.teams);

  const teamStats = React.useMemo(() => {
    const stats: Record<string, { count: number; available: number; injured: number; modified: number; resting: number; attendanceRate: number | null }> = {};
    allTeams.forEach((t) => {
      const squad = athletes.filter((a) => a.team === t);
      const available = squad.filter((a) => !a.availability || a.availability === 'Available').length;
      const injured = squad.filter((a) => a.availability === 'Injured').length;
      const modified = squad.filter((a) => a.availability === 'Modified').length;
      const resting = squad.filter((a) => a.availability === 'Resting').length;
      const squadIds = new Set(squad.map((a) => a.id));
      const teamAtt = attendance.filter((r) => squadIds.has(r.athlete_id));
      const present = teamAtt.filter((r) => ['present', 'late'].includes(r.status?.toLowerCase() || '')).length;
      const rate = teamAtt.length > 0 ? Math.round((present / teamAtt.length) * 100) : null;
      stats[t] = { count: squad.length, available, injured, modified, resting, attendanceRate: rate };
    });
    return stats;
  }, [athletes, attendance]);

  const totalSquad = athletes.length;
  const totalInjured = athletes.filter((a) => a.availability === 'Injured').length;
  const totalModified = athletes.filter((a) => a.availability === 'Modified').length;
  const assignedAthletes = athletes.filter((a) => a.team && allTeams.includes(a.team)).length;

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Squad Management</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Teams</h1>
          <p className="mt-1 text-sm text-slate-500">{assignedAthletes} players assigned across {allTeams.filter((t) => (teamStats[t]?.count || 0) > 0).length} active teams</p>
        </div>

        {/* Department overview */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Players', value: totalSquad, color: 'sky' },
            { label: 'Available', value: totalSquad - totalInjured - totalModified, color: 'emerald' },
            { label: 'Injured', value: totalInjured, color: 'red' },
            { label: 'Modified', value: totalModified, color: 'amber' },
          ].map((kpi) => (
            <div key={kpi.label} className={`rounded-2xl border bg-slate-900 p-4 ${kpi.color === 'sky' ? 'border-sky-500/20' : kpi.color === 'emerald' ? 'border-emerald-500/20' : kpi.color === 'red' ? 'border-red-500/20' : 'border-amber-500/20'}`}>
              <p className={`text-3xl font-black ${kpi.color === 'sky' ? 'text-sky-400' : kpi.color === 'emerald' ? 'text-emerald-400' : kpi.color === 'red' ? 'text-red-400' : 'text-amber-400'}`}>{kpi.value}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-slate-500">{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Team groups */}
        {loading ? (
          <div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" /><p className="text-sm text-slate-400">Loading...</p></div>
        ) : (
          <div className="space-y-8">
            {visibleTeamGroups.map((group) => {
              const col = COLORS[group.color];
              return (
                <div key={group.group}>
                  <p className={`mb-3 text-xs font-black uppercase tracking-[0.2em] ${col.text}`}>{group.group}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {group.teams.map((team) => {
                      const s = teamStats[team];
                      if (!s || s.count === 0) return (
                        <div key={team} className="rounded-2xl border border-slate-800/60 bg-slate-950/40 p-4 opacity-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${col.badge}`}>{team}</span>
                            <p className="text-lg font-black text-slate-700">0</p>
                          </div>
                          <p className="text-xs text-slate-700">No players assigned</p>
                        </div>
                      );
                      return (
                        <Link key={team} href={`/teams/${encodeURIComponent(team)}`}
                          className={`rounded-2xl border p-4 transition hover:border-opacity-60 hover:scale-[1.02] ${col.border} ${col.bg}`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${col.badge}`}>{team}</span>
                            <p className={`text-2xl font-black ${col.text}`}>{s.count}</p>
                          </div>
                          {/* Availability bar */}
                          <div className="flex gap-1 mb-3">
                            {s.available > 0 && <div className="h-1.5 rounded-full bg-emerald-500" style={{ flex: s.available }} />}
                            {s.modified > 0 && <div className="h-1.5 rounded-full bg-amber-500" style={{ flex: s.modified }} />}
                            {s.injured > 0 && <div className="h-1.5 rounded-full bg-red-500" style={{ flex: s.injured }} />}
                            {s.resting > 0 && <div className="h-1.5 rounded-full bg-sky-500" style={{ flex: s.resting }} />}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex gap-2">
                              <span className="text-emerald-400">{s.available} avail</span>
                              {s.injured > 0 && <span className="text-red-400">{s.injured} inj</span>}
                              {s.modified > 0 && <span className="text-amber-400">{s.modified} mod</span>}
                            </div>
                            {s.attendanceRate !== null && (
                              <span className={`font-black ${s.attendanceRate >= 80 ? 'text-emerald-400' : s.attendanceRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{s.attendanceRate}% att</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
