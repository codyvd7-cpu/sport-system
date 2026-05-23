'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', accent: '#a78bfa', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    accent: '#38bdf8', teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    accent: '#10b981', teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    accent: '#f59e0b', teams: ['U14A','U14B','U14C','U14D','U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);

function weekAgo() { return new Date(Date.now()-7*86400000).toISOString().split('T')[0]; }

function getAccent(team: string) {
  return TEAM_GROUPS.find(g => g.teams.includes(team))?.accent || '#94a3b8';
}

export default function DashboardPage() {
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading, isHOH, email } = useRole();
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [notes, setNotes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => { setMounted(true); }, []);

  React.useEffect(() => {
    if (roleLoading) return;
    async function load() {
      let q = supabase.from('athletes').select('id,full_name,team,availability,age_group');
      if (!canSeeAllTeams && myTeams.length > 0) q = q.in('team', myTeams);
      const [aRes, attRes, nRes] = await Promise.all([
        q,
        supabase.from('attendance').select('id,athlete_id,status,session_date,session_type').gte('session_date', weekAgo()).order('session_date', { ascending: false }).limit(500),
        supabase.from('coach_notes').select('id,athlete_id,note,created_at').eq('is_feedback', false).order('created_at', { ascending: false }).limit(6),
      ]);
      setAthletes(aRes.data || []);
      setAttendance(attRes.data || []);
      setNotes(nRes.data || []);
      setLoading(false);
    }
    load();
  }, [roleLoading, canSeeAllTeams, myTeams.join(',')]);

  const visibleTeams = canSeeAllTeams ? ALL_TEAMS : myTeams;
  const total = athletes.length;
  const injured = athletes.filter(a => a.availability === 'Injured').length;
  const modified = athletes.filter(a => a.availability === 'Modified').length;
  const present = attendance.filter(a => ['present','late'].includes(a.status?.toLowerCase() || '')).length;
  const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

  const teamCards = React.useMemo(() => {
    return visibleTeams
      .filter(t => athletes.some(a => a.team === t))
      .map(team => {
        const squad = athletes.filter(a => a.team === team);
        const ta = attendance.filter(r => squad.some(a => a.id === r.athlete_id));
        const tp = ta.filter(r => ['present','late'].includes(r.status?.toLowerCase() || '')).length;
        const rate = ta.length > 0 ? Math.round((tp / ta.length) * 100) : null;
        const inj = squad.filter(a => a.availability === 'Injured').length;
        const abs = ta.filter(r => r.status?.toLowerCase() === 'absent').length;
        return { team, squad: squad.length, rate, inj, abs, accent: getAccent(team) };
      });
  }, [athletes, attendance, visibleTeams.join(',')]);

  if (roleLoading || loading) return (
    <main className="min-h-screen bg-[#060812] flex items-center justify-center">
      <div className="relative">
        <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-sky-500 animate-spin"/>
        <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-transparent border-b-violet-500/40 animate-spin" style={{animationDuration:'1.4s',animationDirection:'reverse'}}/>
      </div>
    </main>
  );

  const today = new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <main className="min-h-screen bg-[#060812] pb-24 text-white md:pb-0" style={{fontFamily:"'Inter',sans-serif"}}>

      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-sky-600/10 blur-[120px]"/>
        <div className="absolute top-20 right-0 h-80 w-80 rounded-full bg-violet-600/8 blur-[100px]"/>
      </div>

      <div className="relative mx-auto max-w-5xl px-5 py-8 sm:px-8">

        {/* ── GREETING ── */}
        <div className={`mb-10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 mb-1">{today}</p>
          <h1 className="text-4xl font-black text-white leading-none tracking-tight">
            {greeting}<span className="text-slate-600">.</span>
          </h1>
          {!canSeeAllTeams && myTeams.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">Viewing</span>
              {myTeams.map(t => (
                <span key={t} className="rounded-full px-2.5 py-0.5 text-[11px] font-black"
                  style={{background:`${getAccent(t)}18`, color:getAccent(t), border:`1px solid ${getAccent(t)}40`}}>
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── STAT STRIP ── */}
        <div className={`mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 transition-all duration-700 delay-100 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { label: 'Squad',     val: total,    sub: 'athletes',   color: '#fff',     glow: 'rgba(255,255,255,0.06)' },
            { label: 'Injured',  val: injured,   sub: 'unavailable', color: injured > 0 ? '#f87171' : '#334155', glow: injured > 0 ? 'rgba(248,113,113,0.08)' : 'transparent' },
            { label: 'Modified', val: modified,  sub: 'training',   color: modified > 0 ? '#fbbf24' : '#334155', glow: modified > 0 ? 'rgba(251,191,36,0.08)' : 'transparent' },
            { label: '7-Day Att',val: attRate !== null ? `${attRate}%` : '—', sub: 'attendance', color: attRate === null ? '#334155' : attRate >= 80 ? '#10b981' : attRate >= 60 ? '#fbbf24' : '#f87171', glow: attRate !== null ? 'rgba(16,185,129,0.08)' : 'transparent' },
          ].map((s, i) => (
            <div key={s.label} className="rounded-2xl border border-white/5 p-5 relative overflow-hidden"
              style={{background:'rgba(255,255,255,0.03)',boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05), 0 0 40px ${s.glow}`}}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 mb-2">{s.label}</p>
              <p className="text-3xl font-black leading-none" style={{color:s.color}}>{s.val}</p>
              <p className="text-[11px] text-slate-600 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div className={`mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 transition-all duration-700 delay-150 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {[
            { label:'Attendance', sub:'Mark register', href:'/attendance', color:'#10b981',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
            { label:'Performance', sub:'Enter tests', href:'/performance', color:'#a78bfa',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { label:'Squad', sub:'View all teams', href:'/squad', color:'#38bdf8',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { label:'Portal', sub:'Parent view', href:'/portal', color:'#f59e0b',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
          ].map((a, i) => (
            <Link key={a.href} href={a.href}
              className="group relative rounded-2xl border border-white/5 p-5 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10"
              style={{
                background:'rgba(255,255,255,0.03)',
                boxShadow:'inset 0 1px 0 rgba(255,255,255,0.05)',
                animationDelay:`${i*60}ms`
              }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{background:`radial-gradient(ellipse at 0% 0%, ${a.color}15, transparent 70%)`}}/>
              <div className="relative">
                <div className="mb-3" style={{color:a.color}}>{a.icon}</div>
                <p className="text-sm font-black text-white">{a.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{a.sub}</p>
              </div>
              <div className="absolute bottom-0 left-0 h-px w-0 group-hover:w-full transition-all duration-500"
                style={{background:`linear-gradient(90deg, ${a.color}80, transparent)`}}/>
            </Link>
          ))}
        </div>

        {/* ── ATTENTION ALERTS ── */}
        {(injured > 0 || modified > 0) && (
          <div className={`mb-8 rounded-2xl border p-5 transition-all duration-700 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{borderColor:'rgba(248,113,113,0.15)',background:'rgba(248,113,113,0.04)'}}>
            <div className="flex items-center gap-2 mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"/>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Requires Attention</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {athletes.filter(a => a.availability === 'Injured' || a.availability === 'Modified').map(a => {
                const isInj = a.availability === 'Injured';
                return (
                  <Link key={a.id} href={`/athletes/${a.id}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition hover:opacity-80"
                    style={{
                      background: isInj ? 'rgba(248,113,113,0.08)' : 'rgba(251,191,36,0.08)',
                      color: isInj ? '#fca5a5' : '#fde68a',
                      border: `1px solid ${isInj ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}`,
                    }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{background: isInj ? '#f87171' : '#fbbf24'}}/>
                    {a.full_name}
                    <span className="opacity-50">· {a.team}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TEAM CARDS ── */}
        <div className={`transition-all duration-700 delay-[250ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">
            {canSeeAllTeams ? 'All Teams' : 'My Teams'}
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teamCards.map(({ team, squad, rate, inj, abs, accent }, i) => (
              <Link key={team} href={`/teams/${team}`}
                className="group relative rounded-2xl border border-white/5 p-5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-white/10"
                style={{
                  background:'rgba(255,255,255,0.02)',
                  boxShadow:'inset 0 1px 0 rgba(255,255,255,0.04)',
                  animationDelay:`${i*40}ms`
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{background:`radial-gradient(ellipse at 50% 0%, ${accent}10, transparent 70%)`}}/>
                <div className="relative">
                  {/* Top accent line */}
                  <div className="absolute -top-5 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{background:`linear-gradient(90deg, transparent, ${accent}80, transparent)`}}/>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-2xl font-black tracking-tight" style={{color:accent}}>{team}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{squad} athletes</p>
                    </div>
                    <div className="text-right">
                      {rate !== null ? (
                        <>
                          <p className="text-xl font-black" style={{color: rate >= 80 ? '#10b981' : rate >= 60 ? '#fbbf24' : '#f87171'}}>{rate}%</p>
                          <p className="text-[10px] text-slate-600">7d att.</p>
                        </>
                      ) : <p className="text-[11px] text-slate-700">No data</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {inj > 0 && <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{background:'rgba(248,113,113,0.1)',color:'#fca5a5',border:'1px solid rgba(248,113,113,0.2)'}}>{inj} injured</span>}
                    {abs > 0 && <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{background:'rgba(251,191,36,0.1)',color:'#fde68a',border:'1px solid rgba(251,191,36,0.2)'}}>{abs} recent abs</span>}
                    {inj === 0 && abs === 0 && <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{background:'rgba(16,185,129,0.08)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.15)'}}>All clear</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── RECENT NOTES ── */}
        {notes.length > 0 && (
          <div className={`mt-8 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">Recent Notes</p>
            <div className="rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/4"
              style={{background:'rgba(255,255,255,0.02)'}}>
              {notes.map(n => {
                const a = athletes.find(x => x.id === n.athlete_id);
                return (
                  <Link key={n.id} href={`/athletes/${n.athlete_id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="h-8 w-8 shrink-0 flex items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-slate-400">
                      {(a?.full_name||'?').split(' ').map((x:string)=>x[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-white truncate">{a?.full_name||'Unknown'} <span className="text-slate-600 font-normal">· {a?.team}</span></p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.note}</p>
                    </div>
                    <p className="shrink-0 text-[10px] text-slate-700">{new Date(n.created_at).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</p>
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
