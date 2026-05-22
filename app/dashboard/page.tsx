'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', color: 'violet', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    color: 'sky',     teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    color: 'emerald', teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    color: 'amber',   teams: ['U14A','U14B','U14C','U14D','U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);
const COLOR_MAP: Record<string,string> = {
  violet:'text-violet-400', sky:'text-sky-400', emerald:'text-emerald-400', amber:'text-amber-400',
};

function weekAgo() { return new Date(Date.now()-7*24*60*60*1000).toISOString().split('T')[0]; }

export default function DashboardPage() {
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading, isHOH } = useRole();
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [recentNotes, setRecentNotes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (roleLoading) return;
    async function load() {
      let athQuery = supabase.from('athletes').select('id,full_name,team,availability,age_group');
      if (!canSeeAllTeams && myTeams.length > 0) athQuery = athQuery.in('team', myTeams);

      const [athRes, attRes, notesRes] = await Promise.all([
        athQuery,
        supabase.from('attendance').select('id,athlete_id,status,session_date,session_type').gte('session_date', weekAgo()).order('session_date', { ascending: false }).limit(500),
        supabase.from('coach_notes').select('id,athlete_id,note,created_at').eq('is_feedback', false).order('created_at', { ascending: false }).limit(5),
      ]);
      setAthletes(athRes.data || []);
      setAttendance(attRes.data || []);
      setRecentNotes(notesRes.data || []);
      setLoading(false);
    }
    load();
  }, [roleLoading, canSeeAllTeams, myTeams.join(',')]);

  const visibleTeams = canSeeAllTeams ? ALL_TEAMS : myTeams;
  const totalPlayers = athletes.length;
  const injured = athletes.filter(a => a.availability === 'Injured').length;
  const modified = athletes.filter(a => a.availability === 'Modified').length;
  const resting = athletes.filter(a => a.availability === 'Resting').length;
  const available = totalPlayers - injured - modified - resting;
  const recentPresent = attendance.filter(r => ['present','late'].includes(r.status?.toLowerCase() || ''));
  const attRate = attendance.length > 0 ? Math.round((recentPresent.length/attendance.length)*100) : null;

  const activeTeams = visibleTeams.filter(t => athletes.some(a => a.team === t));

  const teamStats = React.useMemo(() => activeTeams.map(team => {
    const squad = athletes.filter(a => a.team === team);
    const teamAtt = attendance.filter(r => squad.some(a => a.id === r.athlete_id));
    const present = teamAtt.filter(r => ['present','late'].includes(r.status?.toLowerCase() || '')).length;
    const rate = teamAtt.length>0 ? Math.round((present/teamAtt.length)*100) : null;
    const inj = squad.filter(a => a.availability === 'Injured').length;
    const recentAbs = teamAtt.filter(r => r.status?.toLowerCase() === 'absent').slice(0,3);
    const group = TEAM_GROUPS.find(g => g.teams.includes(team));
    return { team, squad, rate, inj, recentAbs, color: group?.color || 'sky' };
  }), [athletes, attendance, activeTeams.join(',')]);

  if (roleLoading || loading) return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"/>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Hockey</p>
            <h1 className="mt-1 text-3xl font-black text-white">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              {new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}
              {!canSeeAllTeams && myTeams.length > 0 && <span className="ml-2 text-sky-400">· {myTeams.join(', ')}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/attendance" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">
              Take Register
            </Link>
            <Link href="/performance" className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-300 hover:bg-violet-500/20 transition">
              Enter Tests
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label:'Players',   val:totalPlayers, color:'text-white' },
            { label:'Available', val:available,    color:'text-emerald-400' },
            { label:'Injured',   val:injured,      color: injured>0?'text-red-400':'text-slate-600' },
            { label:'Modified',  val:modified,     color: modified>0?'text-amber-400':'text-slate-600' },
            { label:'Att (7d)',  val: attRate!==null?`${attRate}%`:'—', color: attRate===null?'text-slate-600':attRate>=80?'text-emerald-400':attRate>=60?'text-amber-400':'text-red-400' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-600 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label:'Mark Attendance', href:'/attendance', color:'emerald',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label:'Testing Session', href:'/performance', color:'violet',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label:'Squad Board', href:'/squad', color:'sky',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
            { label:'Portal', href:'/portal', color:'slate',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-6 w-6 mx-auto"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
          ].map((a,i) => (
            <Link key={a.href} href={a.href}
              className={`rounded-2xl border p-4 text-center transition hover:scale-[1.02] hover:-translate-y-0.5 ${a.color==='emerald'?'border-emerald-500/20 bg-emerald-500/5 text-emerald-400':a.color==='violet'?'border-violet-500/20 bg-violet-500/5 text-violet-400':a.color==='sky'?'border-sky-500/20 bg-sky-500/5 text-sky-400':'border-slate-700 bg-slate-900 text-slate-400'}`}
              style={{animationDelay:`${i*60}ms`}}>
              <div className="mb-2">{a.icon}</div>
              <p className="text-xs font-black text-white">{a.label}</p>
            </Link>
          ))}
        </div>

        {/* Attention alerts */}
        {(injured > 0 || modified > 0) && (
          <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
            <p className="mb-3 text-xs font-black uppercase tracking-wide text-red-400">Requires Attention</p>
            <div className="flex flex-wrap gap-2">
              {athletes.filter(a => a.availability === 'Injured').map(a => (
                <Link key={a.id} href={`/athletes/${a.id}`}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">
                  {a.full_name} <span className="opacity-60">· Injured · {a.team}</span>
                </Link>
              ))}
              {athletes.filter(a => a.availability === 'Modified').map(a => (
                <Link key={a.id} href={`/athletes/${a.id}`}
                  className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition">
                  {a.full_name} <span className="opacity-60">· Modified · {a.team}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Team cards */}
        <div className="mb-2">
          <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
            {canSeeAllTeams ? 'All Teams' : 'My Teams'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teamStats.map(({ team, squad, rate, inj, recentAbs, color }) => (
              <Link key={team} href={`/teams/${team}`}
                className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className={`text-2xl font-black ${COLOR_MAP[color]}`}>{team}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{squad.length} players</p>
                  </div>
                  <div className="text-right">
                    {rate !== null && (
                      <>
                        <p className={`text-xl font-black ${rate>=80?'text-emerald-400':rate>=60?'text-amber-400':'text-red-400'}`}>{rate}%</p>
                        <p className="text-[10px] text-slate-600">7d att</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {inj > 0 && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">{inj} injured</span>}
                  {recentAbs.length > 0 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-black text-amber-400">{recentAbs.length} recent abs</span>}
                  {inj === 0 && recentAbs.length === 0 && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black text-emerald-400">All clear</span>}
                </div>
                <p className="mt-3 text-[10px] text-slate-700 group-hover:text-slate-500 transition">View team →</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent notes */}
        {recentNotes.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="border-b border-slate-800 px-5 py-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">Recent Coach Notes</p>
            </div>
            <div className="divide-y divide-slate-800/50">
              {recentNotes.map(n => {
                const ath = athletes.find(a => a.id === n.athlete_id);
                return (
                  <Link key={n.id} href={`/athletes/${n.athlete_id}`}
                    className="flex items-start gap-3 px-5 py-3 hover:bg-slate-800/30 transition">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[9px] font-black text-slate-400">
                      {(ath?.full_name||'?').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{ath?.full_name || 'Unknown'} <span className="text-slate-600">· {ath?.team}</span></p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.note}</p>
                    </div>
                    <p className="shrink-0 text-[10px] text-slate-700">
                      {new Date(n.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
