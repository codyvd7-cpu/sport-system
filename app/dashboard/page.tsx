'use client';

import Link from 'next/link';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', accent: '#a78bfa', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    accent: '#38bdf8', teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    accent: '#10b981', teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    accent: '#f59e0b', teams: ['U14A','U14B','U14C','U14D','U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);
function getAccent(team: string) { return TEAM_GROUPS.find(g => g.teams.includes(team))?.accent || '#94a3b8'; }
function weekAgo() { return new Date(Date.now()-7*86400000).toISOString().split('T')[0]; }
function today() { return new Date().toISOString().split('T')[0]; }

// ── Single-team coach view ────────────────────────────────────
function MyTeamView({ teamName, athletes, attendance, fixtures, onRefresh }: {
  teamName: string;
  athletes: Row[];
  attendance: Row[];
  fixtures: Row[];
  onRefresh: () => void;
}) {
  const accent = getAccent(teamName);
  const { showToast } = useToast();
  const [sessionType, setSessionType] = React.useState('Training');
  const [statuses, setStatuses] = React.useState<Record<string,string>>({});
  const [saving, setSaving] = React.useState(false);
  const [sessionSaved, setSessionSaved] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'register'|'squad'>('register');

  const squad = React.useMemo(() =>
    [...athletes].sort((a,b) => (a.full_name||'').split(' ').pop()!.localeCompare((b.full_name||'').split(' ').pop()!))
  , [athletes]);

  React.useEffect(() => {
    const init: Record<string,string> = {};
    squad.forEach(a => {
      const existing = attendance.find(r => r.athlete_id === a.id && r.session_date === today());
      init[a.id] = existing?.status || 'Present';
    });
    setStatuses(init);
    setSessionSaved(squad.some(a => !!attendance.find(r => r.athlete_id === a.id && r.session_date === today())));
  }, [squad, attendance]);

  async function saveAttendance() {
    setSaving(true);
    const ids = squad.map(a => a.id);
    await supabase.from('attendance').delete().eq('session_date', today()).in('athlete_id', ids);
    const { error } = await supabase.from('attendance').insert(squad.map(a => ({
      athlete_id: a.id, session_date: today(), session_type: sessionType, status: statuses[a.id] || 'Present',
    })));
    if (error) { showToast(`Error: ${error.message}`, 'error'); }
    else { setSessionSaved(true); showToast('Register saved ✓'); }
    setSaving(false);
    onRefresh();
  }

  const STATUS_COLORS: Record<string,{bg:string;color:string;border:string}> = {
    Present: {bg:'rgba(16,185,129,0.12)',  color:'#6ee7b7', border:'rgba(16,185,129,0.25)'},
    Late:    {bg:'rgba(251,191,36,0.12)',  color:'#fde68a', border:'rgba(251,191,36,0.25)'},
    Absent:  {bg:'rgba(248,113,113,0.12)', color:'#fca5a5', border:'rgba(248,113,113,0.25)'},
    Excused: {bg:'rgba(56,189,248,0.12)',  color:'#7dd3fc', border:'rgba(56,189,248,0.25)'},
  };

  const presentCount = squad.filter(a => (statuses[a.id]||'Present') === 'Present').length;
  const absentCount  = squad.filter(a => statuses[a.id] === 'Absent').length;
  const lateCount    = squad.filter(a => statuses[a.id] === 'Late').length;
  const unavailable  = squad.filter(a => a.availability && a.availability !== 'Available');
  const nextFixture  = fixtures.find(f => f.fixture_date >= today());
  const daysToMatch  = nextFixture ? Math.ceil((new Date(nextFixture.fixture_date).getTime()-Date.now())/86400000) : null;

  return (
    <div className="space-y-4">

      {/* ── HEADER ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 mb-1">My Team</p>
        <div className="flex items-end justify-between gap-2">
          <h1 className="text-4xl font-black tracking-tight leading-none" style={{color:accent}}>{teamName}</h1>
          <Link href={`/teams/${teamName}`}
            className="text-[11px] font-semibold text-slate-600 hover:text-slate-300 transition mb-1">
            Full page →
          </Link>
        </div>
        <p className="mt-1.5 text-sm text-slate-500">
          {new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})} · {squad.length} players
        </p>
      </div>

      {/* ── NEXT MATCH ── */}
      {nextFixture && (
        <div className="flex items-center gap-4 rounded-2xl border border-white/5 px-5 py-4"
          style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Next Match</p>
            <p className="text-base font-black text-white mt-0.5">vs {nextFixture.opponent}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})}
              {nextFixture.fixture_time && ` · ${nextFixture.fixture_time}`}
              {nextFixture.venue && ` · ${nextFixture.venue}`}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black" style={{color:accent}}>{daysToMatch}</p>
            <p className="text-[10px] text-slate-600">days</p>
          </div>
        </div>
      )}

      {/* ── UNAVAILABLE ALERT ── */}
      {unavailable.length > 0 && (
        <div className="rounded-2xl border px-4 py-3" style={{borderColor:'rgba(248,113,113,0.15)',background:'rgba(248,113,113,0.04)'}}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400 mb-2">Unavailable</p>
          <div className="flex flex-wrap gap-2">
            {unavailable.map(a => {
              const isInj = a.availability === 'Injured';
              return (
                <Link key={a.id} href={`/athletes/${a.id}`}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
                  style={{
                    background: isInj?'rgba(248,113,113,0.08)':'rgba(251,191,36,0.08)',
                    color: isInj?'#fca5a5':'#fde68a',
                    border: `1px solid ${isInj?'rgba(248,113,113,0.2)':'rgba(251,191,36,0.2)'}`,
                  }}>
                  {a.full_name?.split(' ').pop()} · {a.availability}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div className="flex rounded-2xl border border-white/5 p-1" style={{background:'rgba(255,255,255,0.02)'}}>
        {([['register','Today\'s Register'],['squad','Squad']] as const).map(([key,label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${activeTab===key?'bg-white/8 text-white':'text-slate-500 hover:text-slate-300'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── REGISTER TAB ── */}
      {activeTab === 'register' && (
        <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
          {/* Register header */}
          <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white">{presentCount} present</span>
              {lateCount > 0 && <span className="text-[11px] text-amber-400">{lateCount} late</span>}
              {absentCount > 0 && <span className="text-[11px] text-red-400">{absentCount} absent</span>}
            </div>
            <div className="flex items-center gap-2">
              <select value={sessionType} onChange={e => setSessionType(e.target.value)}
                className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-white outline-none transition">
                {['Training','Match','Gym','Fitness','Extras','Other'].map(t => <option key={t}>{t}</option>)}
              </select>
              <button onClick={saveAttendance} disabled={saving}
                className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition disabled:opacity-50"
                style={{
                  background: sessionSaved?'rgba(16,185,129,0.12)':`${accent}15`,
                  color: sessionSaved?'#6ee7b7':accent,
                  border: `1px solid ${sessionSaved?'rgba(16,185,129,0.25)':`${accent}30`}`,
                }}>
                {saving
                  ? <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"/>
                  : sessionSaved
                  ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3"><polyline points="20 6 9 17 4 12"/></svg>
                  : null}
                {saving ? 'Saving…' : sessionSaved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>

          {/* Player rows with P/L/A/E buttons */}
          <div className="divide-y divide-white/3">
            {squad.map(a => {
              const status = statuses[a.id] || 'Present';
              const sc = STATUS_COLORS[status];
              return (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                    style={{background:`${accent}12`,color:accent}}>
                    {(a.full_name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{a.full_name}</p>
                    {a.availability && a.availability !== 'Available' && (
                      <p className="text-[10px]" style={{color:a.availability==='Injured'?'#fca5a5':a.availability==='Modified'?'#fde68a':'#7dd3fc'}}>
                        {a.availability}
                      </p>
                    )}
                  </div>
                  {/* Current status shown prominently, tap others to change */}
                  <div className="flex gap-1 shrink-0">
                    {(['Present','Late','Absent','Excused'] as const).map(s => {
                      const c = STATUS_COLORS[s];
                      const active = status === s;
                      return (
                        <button key={s}
                          onClick={() => { setStatuses(p => ({...p,[a.id]:s})); setSessionSaved(false); }}
                          className="rounded-lg border px-2 py-1.5 text-[10px] font-black transition-all"
                          style={active
                            ? {background:c.bg, color:c.color, border:`1px solid ${c.border}`, transform:'scale(1.05)'}
                            : {background:'rgba(255,255,255,0.02)', color:'#334155', border:'1px solid rgba(255,255,255,0.05)'}
                          }>
                          {s[0]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── SQUAD TAB ── */}
      {activeTab === 'squad' && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="border-b border-white/5 px-5 py-3 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Full Squad</p>
              <Link href={`/teams/${teamName}`}
                className="text-[10px] font-semibold text-slate-600 hover:text-slate-300 transition">
                Manage availability →
              </Link>
            </div>
            <div className="divide-y divide-white/3">
              {squad.map(a => {
                const avail = a.availability || 'Available';
                const avColor = avail==='Available'?'#6ee7b7':avail==='Modified'?'#fde68a':avail==='Injured'?'#fca5a5':'#7dd3fc';
                return (
                  <Link key={a.id} href={`/athletes/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                      style={{background:`${accent}12`,color:accent}}>
                      {(a.full_name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{a.full_name}</p>
                      <p className="text-[10px] text-slate-600">{a.position || a.age_group || '—'}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{background:`${avColor}12`,color:avColor,border:`1px solid ${avColor}30`}}>
                      {avail}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
          {/* Log result + performance links */}
          <div className="grid grid-cols-2 gap-2">
            <Link href={`/teams/${teamName}`}
              className="flex items-center gap-2 rounded-2xl border border-white/5 p-4 hover:bg-white/4 transition group"
              style={{background:'rgba(255,255,255,0.02)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0" style={{color:accent}}><path d="M12 5v14M5 12h14"/></svg>
              <div>
                <p className="text-xs font-black text-white">Log Result</p>
                <p className="text-[10px] text-slate-600">Post match score</p>
              </div>
            </Link>
            <Link href="/performance"
              className="flex items-center gap-2 rounded-2xl border border-white/5 p-4 hover:bg-white/4 transition group"
              style={{background:'rgba(255,255,255,0.02)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 shrink-0 text-violet-400"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              <div>
                <p className="text-xs font-black text-white">Testing</p>
                <p className="text-[10px] text-slate-600">Enter test results</p>
              </div>
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

  const squad = React.useMemo(() =>
    athletes.sort((a,b) => (a.full_name||'').split(' ').pop()!.localeCompare((b.full_name||'').split(' ').pop()!))
  , [athletes]);

  // Pre-populate from today's existing attendance
  React.useEffect(() => {
    const init: Record<string,string> = {};
    squad.forEach(a => {
      const existing = attendance.find(r => r.athlete_id === a.id && r.session_date === today());
      init[a.id] = existing?.status || 'Present';
    });
    setStatuses(init);
    setSessionSaved(squad.some(a => attendance.find(r => r.athlete_id === a.id && r.session_date === today())));
  }, [squad, attendance]);

  function cycle(id: string) {
    const opts = ['Present','Late','Absent','Excused'];
    setStatuses(prev => {
      const idx = opts.indexOf(prev[id] || 'Present');
      return { ...prev, [id]: opts[(idx+1) % opts.length] };
    });
    setSessionSaved(false);
  }

  async function saveAttendance() {
    setSaving(true);
    const ids = squad.map(a => a.id);
    await supabase.from('attendance').delete().eq('session_date', today()).in('athlete_id', ids);
    await supabase.from('attendance').insert(squad.map(a => ({
      athlete_id: a.id, session_date: today(), session_type: sessionType, status: statuses[a.id] || 'Present',
    })));
    setSessionSaved(true);
    setSaving(false);
    onRefresh();
  }

  const presentCount = squad.filter(a => (statuses[a.id] || 'Present') === 'Present').length;
  const absentCount  = squad.filter(a => statuses[a.id] === 'Absent').length;
  const lateCount    = squad.filter(a => statuses[a.id] === 'Late').length;

  const injured  = squad.filter(a => a.availability === 'Injured');
  const modified = squad.filter(a => a.availability === 'Modified');
  const resting  = squad.filter(a => a.availability === 'Resting');

  const nextFixture = fixtures.find(f => f.fixture_date >= today());

  const STATUS_STYLE: Record<string,{bg:string;color:string;border:string}> = {
    Present: {bg:'rgba(16,185,129,0.12)',color:'#6ee7b7',border:'rgba(16,185,129,0.25)'},
    Late:    {bg:'rgba(251,191,36,0.12)', color:'#fde68a',border:'rgba(251,191,36,0.25)'},
    Absent:  {bg:'rgba(248,113,113,0.12)',color:'#fca5a5',border:'rgba(248,113,113,0.25)'},
    Excused: {bg:'rgba(56,189,248,0.12)', color:'#7dd3fc',border:'rgba(56,189,248,0.25)'},
  };

  return (
    <div className="space-y-5">
      {/* Team header */}
      <div className="rounded-2xl border border-white/6 p-6 relative overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
        <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at 0% 0%, ${accent}12, transparent 60%)`}}/>
        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 mb-1">My Team</p>
            <h1 className="text-4xl font-black tracking-tight" style={{color:accent}}>{teamName}</h1>
            <p className="mt-1 text-sm text-slate-400">{squad.length} players · {new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href={`/teams/${teamName}`}
              className="rounded-xl border border-white/8 px-4 py-2 text-xs font-black text-slate-300 hover:bg-white/5 transition"
              style={{background:'rgba(255,255,255,0.03)'}}>
              Full Team →
            </Link>
          </div>
        </div>

        {/* Availability alerts */}
        {(injured.length > 0 || modified.length > 0) && (
          <div className="relative mt-4 flex flex-wrap gap-2">
            {injured.map(a => (
              <Link key={a.id} href={`/athletes/${a.id}`}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                style={{background:'rgba(248,113,113,0.08)',color:'#fca5a5',border:'1px solid rgba(248,113,113,0.2)'}}>
                <span className="h-1.5 w-1.5 rounded-full bg-red-400"/>
                {a.full_name?.split(' ').pop()} · Injured
              </Link>
            ))}
            {modified.map(a => (
              <Link key={a.id} href={`/athletes/${a.id}`}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                style={{background:'rgba(251,191,36,0.08)',color:'#fde68a',border:'1px solid rgba(251,191,36,0.2)'}}>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>
                {a.full_name?.split(' ').pop()} · Modified
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Next fixture */}
      {nextFixture && (
        <div className="rounded-2xl border border-white/6 px-5 py-4 flex items-center justify-between"
          style={{background:'rgba(255,255,255,0.02)'}}>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 mb-0.5">Next Match</p>
            <p className="text-sm font-black text-white">vs {nextFixture.opponent}</p>
            <p className="text-[11px] text-slate-500">{new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})} {nextFixture.fixture_time&&`· ${nextFixture.fixture_time}`} {nextFixture.venue&&`· ${nextFixture.venue}`}</p>
          </div>
          <div className="text-2xl font-black" style={{color:accent}}>
            {Math.ceil((new Date(nextFixture.fixture_date).getTime()-Date.now())/86400000)}d
          </div>
        </div>
      )}

      {/* Session register */}
      <div className="rounded-2xl border border-white/6 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
        {/* Session header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600 mb-0.5">Today's Register</p>
            <div className="flex items-center gap-3">
              <span className="text-sm font-black text-white">{presentCount} present</span>
              {lateCount > 0 && <span className="text-[11px] text-amber-400">{lateCount} late</span>}
              {absentCount > 0 && <span className="text-[11px] text-red-400">{absentCount} absent</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={sessionType} onChange={e => setSessionType(e.target.value)}
              className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-sky-500/50 transition">
              {['Training','Match','Gym','Fitness','Extras','Other'].map(t => <option key={t}>{t}</option>)}
            </select>
            <button onClick={saveAttendance} disabled={saving}
              className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition disabled:opacity-50"
              style={{
                background: sessionSaved ? 'rgba(16,185,129,0.12)' : `${accent}18`,
                color: sessionSaved ? '#6ee7b7' : accent,
                border: `1px solid ${sessionSaved ? 'rgba(16,185,129,0.25)' : `${accent}30`}`,
              }}>
              {saving ? (
                <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"/>
              ) : sessionSaved ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3"><polyline points="20 6 9 17 4 12"/></svg>
              ) : null}
              {saving ? 'Saving…' : sessionSaved ? 'Saved' : 'Save Register'}
            </button>
          </div>
        </div>

        {/* Squad with explicit status buttons */}
        <div className="divide-y divide-white/3">
          {squad.map(a => {
            const status = statuses[a.id] || 'Present';
            return (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-white/2 transition">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                  style={{background:`${accent}15`,color:accent}}>
                  {(a.full_name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{a.full_name}</p>
                  {(a.availability && a.availability !== 'Available') && (
                    <p className="text-[10px]" style={{color: a.availability==='Injured'?'#fca5a5':a.availability==='Modified'?'#fde68a':'#7dd3fc'}}>
                      {a.availability}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {(['Present','Late','Absent','Excused'] as const).map(s => {
                    const active = status === s;
                    const colors: Record<string,{bg:string;color:string;border:string}> = {
                      Present: {bg:'rgba(16,185,129,0.15)',color:'#6ee7b7',border:'rgba(16,185,129,0.3)'},
                      Late:    {bg:'rgba(251,191,36,0.15)', color:'#fde68a',border:'rgba(251,191,36,0.3)'},
                      Absent:  {bg:'rgba(248,113,113,0.15)',color:'#fca5a5',border:'rgba(248,113,113,0.3)'},
                      Excused: {bg:'rgba(56,189,248,0.15)', color:'#7dd3fc',border:'rgba(56,189,248,0.3)'},
                    };
                    const c = colors[s];
                    return (
                      <button key={s}
                        onClick={() => { setStatuses(prev => ({...prev,[a.id]:s})); setSessionSaved(false); }}
                        className="rounded-lg border px-2 py-1.5 text-[10px] font-black transition"
                        style={active
                          ? {background:c.bg, color:c.color, border:`1px solid ${c.border}`}
                          : {background:'rgba(255,255,255,0.03)', color:'#475569', border:'1px solid rgba(255,255,255,0.06)'}
                        }>
                        {s[0]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/teams/${teamName}`}
          className="rounded-2xl border border-white/5 p-4 hover:bg-white/4 transition group"
          style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-slate-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span className="text-xs font-black text-slate-400 group-hover:text-white transition">Squad & Availability</span>
          </div>
          <p className="text-[11px] text-slate-600">Update who's in/out for the week</p>
        </Link>
        <Link href="/performance"
          className="rounded-2xl border border-white/5 p-4 hover:bg-white/4 transition group"
          style={{background:'rgba(255,255,255,0.02)'}}>
          <div className="flex items-center gap-2 mb-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-slate-500"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span className="text-xs font-black text-slate-400 group-hover:text-white transition">Log Tests</span>
          </div>
          <p className="text-[11px] text-slate-600">Record fitness test results</p>
        </Link>
      </div>
    </div>
  );
}

// ── HOH multi-team overview ───────────────────────────────────
function OverviewView({ athletes, attendance, myTeams, canSeeAllTeams, coaches }: {
  athletes: Row[]; attendance: Row[]; myTeams: string[]; canSeeAllTeams: boolean; coaches: Row[];
}) {
  const visibleTeams = canSeeAllTeams ? ALL_TEAMS : myTeams;

  function getCoachForTeam(team: string): string {
    const coach = coaches.find(c =>
      c.role === 'coach' &&
      Array.isArray(c.teams) &&
      c.teams.includes(team)
    );
    if (!coach) return '';
    // Show username part of email
    return coach.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  }

  const teamCards = visibleTeams
    .filter(t => athletes.some(a => a.team === t))
    .map(team => {
      const squad = athletes.filter(a => a.team === team);
      const ta = attendance.filter(r => squad.some(a => a.id === r.athlete_id));
      const tp = ta.filter(r => ['present','late'].includes(r.status?.toLowerCase() || '')).length;
      const rate = ta.length > 0 ? Math.round((tp / ta.length) * 100) : null;
      const inj = squad.filter(a => a.availability === 'Injured').length;
      const mod = squad.filter(a => a.availability === 'Modified').length;
      const coach = getCoachForTeam(team);
      return { team, squad: squad.length, rate, inj, mod, accent: getAccent(team), coach };
    });

  const total = athletes.length;
  const injured = athletes.filter(a => a.availability === 'Injured');
  const modified = athletes.filter(a => a.availability === 'Modified');
  const resting = athletes.filter(a => a.availability === 'Resting');
  const unavailable = [...injured, ...modified, ...resting];

  // Teams with low attendance
  const lowAtt = teamCards.filter(t => t.rate !== null && t.rate < 70);

  const today = new Date().toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 mb-1">Head of Hockey</p>
        <h1 className="text-3xl font-black text-white leading-tight tracking-tight">Department Overview</h1>
        <p className="mt-1 text-sm text-slate-500">{today}</p>
      </div>

      {/* Top stats - what HOH needs at a glance */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label:'Total Squad',  val:total,              color:'#fff'    },
          { label:'Injured',      val:injured.length,     color: injured.length>0?'#f87171':'#334155'  },
          { label:'Modified',     val:modified.length,    color: modified.length>0?'#fbbf24':'#334155' },
          { label:'Teams Active', val:teamCards.length,   color:'#38bdf8' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/5 p-3 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
            <p className="text-2xl font-black" style={{color:s.color}}>{s.val}</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-600 mt-0.5 leading-tight">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Unavailable players - most critical info */}
      {unavailable.length > 0 && (
        <div className="rounded-2xl border p-4" style={{borderColor:'rgba(248,113,113,0.15)',background:'rgba(248,113,113,0.04)'}}>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"/>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Unavailable Players</p>
            <span className="ml-auto text-[10px] text-slate-600">{unavailable.length} total</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {unavailable.map(a => {
              const isInj = a.availability === 'Injured';
              const isMod = a.availability === 'Modified';
              const color = isInj ? {bg:'rgba(248,113,113,0.08)',color:'#fca5a5',border:'rgba(248,113,113,0.2)'}
                : isMod ? {bg:'rgba(251,191,36,0.08)',color:'#fde68a',border:'rgba(251,191,36,0.2)'}
                : {bg:'rgba(56,189,248,0.08)',color:'#7dd3fc',border:'rgba(56,189,248,0.2)'};
              return (
                <Link key={a.id} href={`/athletes/${a.id}`}
                  className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                  style={{background:color.bg,color:color.color,border:`1px solid ${color.border}`}}>
                  {a.full_name?.split(' ').pop()} <span className="opacity-50">· {a.team} · {a.availability}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Low attendance warning */}
      {lowAtt.length > 0 && (
        <div className="rounded-2xl border p-4" style={{borderColor:'rgba(251,191,36,0.15)',background:'rgba(251,191,36,0.04)'}}>
          <div className="flex items-center gap-2 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Low Attendance (7 days)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowAtt.map(t => (
              <Link key={t.team} href={`/teams/${t.team}`}
                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold"
                style={{background:'rgba(251,191,36,0.08)',color:'#fde68a',border:'1px solid rgba(251,191,36,0.2)'}}>
                {t.team} <span className="opacity-60">· {t.rate}%</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* HOH quick actions */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {[
          {label:'Attendance', href:'/attendance',     color:'#10b981', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
          {label:'Performance',href:'/performance',    color:'#a78bfa', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
          {label:'Athletes',   href:'/athletes',       color:'#38bdf8', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>},
          {label:'Coaches',    href:'/coaches',        color:'#f59e0b', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>},
          {label:'Portal',     href:'/portal-admin',   color:'#f87171', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>},
          {label:'Export',     href:'/export/attendance', color:'#94a3b8', icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>},
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-white/5 p-3 text-center transition hover:-translate-y-0.5 hover:border-white/10"
            style={{background:'rgba(255,255,255,0.02)'}}>
            <div style={{color:a.color}}>{a.icon}</div>
            <p className="text-[10px] font-black text-slate-400 group-hover:text-white transition leading-tight">{a.label}</p>
          </Link>
        ))}
      </div>

      {/* Team cards - compact grid */}
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-600">All Teams</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {teamCards.map(({ team, squad, rate, inj, mod, accent, coach }) => (
            <Link key={team} href={`/teams/${team}`}
              className="group relative rounded-2xl border border-white/5 p-4 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10"
              style={{background:'rgba(255,255,255,0.02)'}}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{background:`radial-gradient(ellipse at 50% 0%, ${accent}0c, transparent 70%)`}}/>
              <div className="relative flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-black tracking-tight" style={{color:accent}}>{team}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{squad} players</p>
                  {coach && (
                    <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                      <span className="text-slate-700">Coach · </span>{coach}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0 ml-3">
                  {rate !== null && (
                    <p className="text-lg font-black" style={{color:rate>=80?'#10b981':rate>=60?'#fbbf24':'#f87171'}}>{rate}%</p>
                  )}
                  <div className="flex gap-1 justify-end mt-0.5">
                    {inj > 0 && <span className="text-[9px] font-black text-red-400">{inj} inj</span>}
                    {mod > 0 && <span className="text-[9px] font-black text-amber-400">{mod} mod</span>}
                    {inj===0&&mod===0&&<span className="text-[9px] text-emerald-500">✓</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function DashboardPage() {
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading } = useRole();
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [fixtures, setFixtures] = React.useState<Row[]>([]);
  const [coaches, setCoaches] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    if (roleLoading) return;
    let q = supabase.from('athletes').select('id,full_name,team,availability,position,age_group');
    if (!canSeeAllTeams && myTeams.length > 0) q = q.in('team', myTeams);

    const [aRes, attRes, fixRes, coachRes] = await Promise.all([
      q,
      supabase.from('attendance').select('id,athlete_id,status,session_date,session_type').gte('session_date', weekAgo()).order('session_date', { ascending: false }).limit(500),
      supabase.from('portal_fixtures').select('*').order('fixture_date').limit(20),
      supabase.from('staff_roles').select('email,teams,role').eq('is_active', true),
    ]);
    setAthletes(aRes.data || []);
    setAttendance(attRes.data || []);
    setFixtures(fixRes.data || []);
    setCoaches(coachRes.data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [roleLoading, canSeeAllTeams, myTeams.join(',')]);

  if (roleLoading || loading) return (
    <main className="min-h-screen bg-[#060812] flex items-center justify-center">
      <div className="relative">
        <div className="h-8 w-8 rounded-full border-2 border-slate-800 border-t-sky-500 animate-spin"/>
        <div className="absolute inset-0 h-8 w-8 rounded-full border-2 border-transparent border-b-violet-500/40 animate-spin" style={{animationDuration:'1.4s',animationDirection:'reverse'}}/>
      </div>
    </main>
  );

  // Single-team coach — show their team directly
  const isSingleTeamCoach = !canSeeAllTeams && myTeams.length === 1;
  const singleTeam = isSingleTeamCoach ? myTeams[0] : null;
  const singleTeamAthletes = singleTeam ? athletes.filter(a => a.team === singleTeam) : [];
  const singleTeamFixtures = singleTeam ? fixtures.filter(f => f.team === singleTeam) : [];

  return (
    <main className="min-h-screen bg-[#060812] pb-24 text-white md:pb-0">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-20 h-96 w-96 rounded-full bg-sky-600/8 blur-[120px]"/>
        <div className="absolute top-10 right-0 h-64 w-64 rounded-full bg-violet-600/6 blur-[100px]"/>
      </div>
      <div className="relative mx-auto max-w-3xl px-5 py-8 sm:px-8">
        {isSingleTeamCoach && singleTeam ? (
          <MyTeamView
            teamName={singleTeam}
            athletes={singleTeamAthletes}
            attendance={attendance}
            fixtures={singleTeamFixtures}
            onRefresh={load}
          />
        ) : (
          <OverviewView
            athletes={athletes}
            attendance={attendance}
            myTeams={myTeams}
            canSeeAllTeams={canSeeAllTeams}
            coaches={coaches}
          />
        )}
      </div>
    </main>
  );
}