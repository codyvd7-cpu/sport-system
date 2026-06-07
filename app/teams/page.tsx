'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { getTeamGroups, getSportColor, type SportKey } from '@/lib/sports';

type Row = Record<string, any>;

const GROUP_ACCENTS = ['#a78bfa',sportColor,'#10b981','#f59e0b','#f87171','#34d399'];

function buildGroups(sport: SportKey | null) {
  return getTeamGroups((sport || 'hockey') as SportKey).map((g, i) => ({
    ...g,
    accent: GROUP_ACCENTS[i] || '#94a3b8',
  }));
}

function getGroupAccent(team: string, groups: {teams:string[];accent:string}[]) {
  return groups.find(g => g.teams.includes(team))?.accent || '#94a3b8';
}

export default function TeamsPage() {
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading, sport } = useRole();
  const SPORT_COLORS: Record<string,string> = {hockey:sportColor,rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || sportColor;
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
  const SCORE_TERMS: Record<string,{scorers:string;score:string}> = {
    hockey:{scorers:'Goal Scorers',score:'Goals'}, rugby:{scorers:'Try Scorers',score:'Tries'},
    cricket:{scorers:'Top Scorers',score:'Runs'}, rowing:{scorers:'Crew',score:'Time'},
    swimming:{scorers:'Swimmers',score:'Time'}, waterpolo:{scorers:'Goal Scorers',score:'Goals'},
  };
  const scoreTerm = SCORE_TERMS[sport||'hockey'] || SCORE_TERMS.hockey;
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (roleLoading) return;
    async function load() {
      let athQuery = supabase.from('athletes').select('id, full_name, team, availability').order('full_name');
      if (!canSeeAllTeams && myTeams.length > 0) athQuery = athQuery.in('team', myTeams);
      else if (sport) athQuery = athQuery.eq('sport', sport);
      const [athRes, attRes] = await Promise.all([
        athQuery,
        supabase.from('attendance').select('athlete_id, status, session_date, sport').eq('sport', sport || 'hockey').gte('session_date', new Date(Date.now()-30*24*60*60*1000).toISOString().split('T')[0]),
      ]);
      setAthletes(athRes.data || []);
      setAttendance(attRes.data || []);
      setLoading(false);
    }
    load();
  }, [roleLoading, canSeeAllTeams, myTeams.join(','), sport]);

  const TEAM_GROUPS = buildGroups(sport);

  const visibleTeamGroups = React.useMemo(() => {
    if (canSeeAllTeams) return TEAM_GROUPS;
    return TEAM_GROUPS.map(g => ({
      ...g,
      teams: g.teams.filter(t => myTeams.includes(t)),
    })).filter(g => g.teams.length > 0);
  }, [canSeeAllTeams, myTeams.join(','), sport]);

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
    <main className="min-h-screen pb-24 text-white md:pb-0 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <FadeUp delay={0}>
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:sportColor+'b3'}}>
            {sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'All Sports'}
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none">Teams</h1>
          <p className="mt-2 text-sm text-white/35">{assignedAthletes} players assigned across {allTeams.filter((t) => (teamStats[t]?.count || 0) > 0).length} active teams</p>
        </div>
        </FadeUp>

        {/* Department overview */}
        <FadeUp delay={60}>
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Players', value: totalSquad, color: 'sky' },
            { label: 'Available', value: totalSquad - totalInjured - totalModified, color: 'emerald' },
            { label: 'Injured', value: totalInjured, color: 'red' },
            { label: 'Modified', value: totalModified, color: 'amber' },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border bg-[rgba(255,255,255,0.025)] p-4"
              style={{borderColor:kpi.color==='sky'?sportColor+'33':kpi.color==='emerald'?'rgba(16,185,129,0.2)':kpi.color==='red'?'rgba(248,113,113,0.2)':'rgba(251,191,36,0.2)'}}>
              <CountUp value={kpi.value} className="text-3xl font-black block"
                style={{color:kpi.color==='sky'?sportColor:kpi.color==='emerald'?'#10b981':kpi.color==='red'?'#f87171':'#fbbf24'}}/>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-white/35">{kpi.label}</p>
            </div>
          ))}
        </div>
        </FadeUp>

        {/* Team groups */}
        {loading ? (
          <div className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{borderColor:sportColor}} /><p className="text-sm text-white/50">Loading...</p></div>
        ) : (
          <StaggerList className="space-y-8" stagger={60}>
            {visibleTeamGroups.map((group) => {
              const accent = group.accent || '#94a3b8';
              return (
                <StaggerItem key={group.group}>
                <div>
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.2em]"
                    style={{color:accent}}>{group.group}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {group.teams.map((team) => {
                      const s = teamStats[team];
                      if (!s || s.count === 0) return (
                        <div key={team} className="rounded-2xl border border-white/7 bg-white/2 p-4 opacity-40">
                          <div className="flex items-center justify-between mb-2">
                            <span className="rounded-full px-2.5 py-1 text-xs font-black"
                              style={{background:accent+'18',color:accent}}>{team}</span>
                            <p className="text-lg font-black text-white/15">0</p>
                          </div>
                          <p className="text-xs text-white/15">No players assigned</p>
                        </div>
                      );
                      return (
                        <Link key={team} href={'/teams/'+encodeURIComponent(team)}
                          className="rounded-2xl border p-4 transition hover:scale-[1.02]"
                          style={{borderColor:accent+'28',background:accent+'08'}}>
                          <div className="flex items-center justify-between mb-3">
                            <span className="rounded-full px-2.5 py-1 text-xs font-black"
                              style={{background:accent+'18',color:accent}}>{team}</span>
                            <p className="text-2xl font-black" style={{color:accent}}>{s.count}</p>
                          </div>
                          {/* Availability bar */}
                          <div className="flex gap-1 mb-3">
                            {s.available > 0 && <div className="h-1.5 rounded-full bg-emerald-500" style={{ flex: s.available }} />}
                            {s.modified > 0 && <div className="h-1.5 rounded-full bg-amber-500" style={{ flex: s.modified }} />}
                            {s.injured > 0 && <div className="h-1.5 rounded-full bg-red-500" style={{ flex: s.injured }} />}
                            {s.resting > 0 && <div className="h-1.5 rounded-full " style={{background:sportColor}} style={{ flex: s.resting }} />}
                          </div>
                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex gap-2">
                              <span className="text-emerald-400">{s.available} avail</span>
                              {s.injured > 0 && <span className="text-red-400">{s.injured} inj</span>}
                              {s.modified > 0 && <span className="text-amber-400">{s.modified} mod</span>}
                            </div>
                            {s.attendanceRate !== null && (
                              <span className="font-black" style={{color:s.attendanceRate >= 80 ? '#10b981' : s.attendanceRate >= 60 ? '#fbbf24' : '#f87171'}}>{s.attendanceRate}% att</span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
                </StaggerItem>
              );
            })}
          </StaggerList>
        )}
      </div>
    </main>
  );
}
