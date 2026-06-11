'use client';

import Link from 'next/link';
import * as React from 'react';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { useRole } from '@/lib/useRole';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ name: string }> };

function initials(n: string) { return n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase(); }
function fDate(d?: string|null) {
  if(!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
}
function today() { return new Date().toISOString().split('T')[0]; }
function weekAgo() { return new Date(Date.now()-30*86400000).toISOString().split('T')[0]; }

const AVAIL_OPTIONS = ['Available','Modified','Injured','Resting'];
const AVAIL_STYLE: Record<string,{color:string;bg:string;border:string}> = {
  'Available': {color:'#6ee7b7',bg:'rgba(16,185,129,0.10)',  border:'rgba(16,185,129,0.25)'},
  'Modified':  {color:'#fde68a',bg:'rgba(251,191,36,0.10)',  border:'rgba(251,191,36,0.25)'},
  'Injured':   {color:'#fca5a5',bg:'rgba(248,113,113,0.10)', border:'rgba(248,113,113,0.25)'},
  'Resting':   {color:'#7dd3fc',bg:'rgba(56,189,248,0.10)',  border:'rgba(56,189,248,0.25)'},
};

const TEAM_GROUPS = [
  { group:'Senior', accent:'#a78bfa', teams:['1sts','2nds','3rds','4ths','5ths'] },
  { group:'U16',    accent:'#38bdf8', teams:['U16A','U16B','U16C','U16D','U16E'] },
  { group:'U15',    accent:'#10b981', teams:['U15A','U15B','U15C','U15D','U15E'] },
  { group:'U14',    accent:'#f59e0b', teams:['U14A','U14B','U14C','U14D','U14E'] },
];
function getAccent(team: string) { return TEAM_GROUPS.find(g=>g.teams.includes(team))?.accent||'#94a3b8'; }

export default function TeamPage({ params }: PageProps) {
  const { name: encodedName } = React.use(params);
  const teamName = decodeURIComponent(encodedName);
  const accent = getAccent(teamName);
  const { showToast } = useToast();
  const { sport } = useRole();
  const SPORT_COLORS: Record<string,string> = {hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';

  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [fixtures, setFixtures] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'squad'|'attendance'|'results'>('squad');

  // Availability editing
  const [updatingId, setUpdatingId] = React.useState<string|null>(null);

  // Log Result modal
  const [showLogResult, setShowLogResult] = React.useState(false);
  const [resultDate, setResultDate] = React.useState(today);
  const [resultOpponent, setResultOpponent] = React.useState('');
  const [resultScore, setResultScore] = React.useState('');
  const [resultScorers, setResultScorers] = React.useState<string[]>([]);
  const [savingResult, setSavingResult] = React.useState(false);

  async function load() {
    const athRes = await supabase.from('athletes').select('*').eq('team', teamName).order('full_name');
    const squad = athRes.data || [];
    setAthletes(squad);
    if (squad.length === 0) { setLoading(false); return; }
    const ids = squad.map(a => a.id);
    const [attRes, fixRes, resRes] = await Promise.all([
      supabase.from('attendance').select('*').in('athlete_id', ids).gte('session_date', weekAgo()).order('session_date', { ascending: false }),
      supabase.from('portal_fixtures').select('*').eq('team', teamName).order('fixture_date').limit(5),
      supabase.from('portal_results').select('*').eq('team', teamName).order('result_date', { ascending: false }).limit(10),
    ]);
    setAttendance(attRes.data || []);
    setFixtures(fixRes.data || []);
    setResults(resRes.data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [teamName]);

  const squad = React.useMemo(() =>
    [...athletes].sort((a,b) => (a.full_name||'').split(' ').pop()!.localeCompare((b.full_name||'').split(' ').pop()!))
  , [athletes]);

  const available = squad.filter(a => !a.availability || a.availability === 'Available');
  const unavailable = squad.filter(a => a.availability && a.availability !== 'Available');

  async function setAvailability(athleteId: string, status: string) {
    setUpdatingId(athleteId);
    await supabase.from('athletes').update({ availability: status }).eq('id', athleteId);
    setAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, availability: status } : a));
    setUpdatingId(null);
    showToast(`Updated to ${status}`);
  }

  function toggleScorer(id: string) {
    setResultScorers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function saveResult() {
    if (!resultOpponent.trim() || !resultScore.trim()) {
      showToast('Opponent and score are required', 'error'); return;
    }
    setSavingResult(true);
    const scorerNames = resultScorers.map(id => squad.find(a => a.id === id)?.full_name || '').filter(Boolean).join(', ');
    const { error } = await supabase.from('portal_results').insert([{
      team: teamName,
      opponent: resultOpponent.trim(),
      result_date: resultDate,
      final_score: resultScore.trim(),
      goal_scorers: scorerNames,
      is_published: true,
    }]);
    if (error) { showToast(`Error: ${error.message}`, 'error'); setSavingResult(false); return; }
    showToast('Result logged ✓');
    setShowLogResult(false);
    setResultOpponent(''); setResultScore(''); setResultScorers([]);
    await load();
    setSavingResult(false);
  }

  // Attendance sessions grouped by date
  const sessions = React.useMemo(() => {
    const dates = [...new Set(attendance.map(a => a.session_date))].sort().reverse();
    return dates.slice(0, 8).map(date => {
      const recs = attendance.filter(a => a.session_date === date);
      const present = recs.filter(r => ['present','late'].includes(r.status?.toLowerCase()||'')).length;
      return { date, recs, present, total: recs.length, type: recs[0]?.session_type||'' };
    });
  }, [attendance]);

  // Per-athlete attendance rate
  const attMap = React.useMemo(() => {
    const m: Record<string,number|null> = {};
    squad.forEach(a => {
      const recs = attendance.filter(r => r.athlete_id === a.id);
      if (!recs.length) { m[a.id] = null; return; }
      const p = recs.filter(r => ['present','late'].includes(r.status?.toLowerCase()||'')).length;
      m[a.id] = Math.round((p/recs.length)*100);
    });
    return m;
  }, [squad, attendance]);

  const nextFixture = fixtures.find(f => f.fixture_date >= today());

  if (loading) return (
    <main className="min-h-screen bg-[#060812] flex items-center justify-center">
      <div className="h-7 w-7 rounded-full border-2 border-white/6 border-t-sky-500 animate-spin"/>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#060812] pb-24 text-white md:pb-0">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-16 h-80 w-80 rounded-full blur-[100px]" style={{background:`${accent}0a`}}/>
      </div>
      <div className="relative mx-auto max-w-3xl px-5 py-8 sm:px-8">

        {/* ── HEADER ── */}
        <div className="mb-6">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Dashboard
          </Link>
          <div className="rounded-2xl border border-white/6 p-6 relative overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="absolute inset-0" style={{background:`radial-gradient(ellipse at 0% 50%, ${accent}0e, transparent 60%)`}}/>
            <div className="relative flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] mb-1" style={{color:`${sportColor}90`}}>{sportLabel}</p>
                <h1 className="text-5xl font-black tracking-tight leading-none" style={{color:accent}}>{teamName}</h1>
                <p className="mt-2 text-sm text-white/50">{squad.length} players · {available.length} available</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Link href="/attendance"
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition"
                  style={{background:`${accent}15`,color:accent,border:`1px solid ${accent}30`}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Take Register
                </Link>
                <button onClick={() => setShowLogResult(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/8 px-4 py-2.5 text-xs font-black text-white/70 hover:bg-white/5 transition"
                  style={{background:'rgba(255,255,255,0.03)'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M12 5v14M5 12h14"/></svg>
                  Log Result
                </button>
              </div>
            </div>

            {/* Next fixture strip */}
            {nextFixture && (
              <div className="relative mt-5 pt-5 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Next Match</p>
                  <p className="text-sm font-black text-white mt-0.5">vs {nextFixture.opponent}</p>
                  <p className="text-[11px] text-white/35">{fDate(nextFixture.fixture_date)}{nextFixture.fixture_time && ` · ${nextFixture.fixture_time}`}{nextFixture.venue && ` · ${nextFixture.venue}`}</p>
                </div>
                <div className="text-3xl font-black" style={{color:accent}}>
                  {Math.max(0, Math.ceil((new Date(nextFixture.fixture_date).getTime() - new Date().getTime()) / 86400000))}
                  <span className="text-base font-semibold text-white/25">d</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mb-5 flex rounded-2xl border border-white/5 p-1" style={{background:'rgba(255,255,255,0.02)'}}>
          {([['squad','Squad'],['attendance','Attendance'],['results','Results']] as const).map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${tab===key?'bg-white/8 text-white':'text-white/35 hover:text-white/70'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ══ SQUAD TAB ══ */}
        {tab === 'squad' && (
          <div className="space-y-4">

            {/* Available */}
            <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Available</p>
                <span className="text-[11px] font-semibold text-emerald-400">{available.length} players</span>
              </div>
              <div className="divide-y divide-white/3">
                {available.map(a => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/2">
                    <Link href={`/athletes/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black text-white/60"
                        style={{background:`${accent}15`}}>
                        {initials(a.full_name||'?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white">{a.full_name}</p>
                        {a.position && <p className="text-[10px] text-white/25">{a.position}</p>}
                      </div>
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      {attMap[a.id] !== null && attMap[a.id] !== undefined && (
                        <span className="text-[11px] font-semibold" style={{color:attMap[a.id]!>=80?'#6ee7b7':attMap[a.id]!>=60?'#fde68a':'#fca5a5'}}>
                          {attMap[a.id]}%
                        </span>
                      )}
                      {/* Availability toggle - always visible, tap-friendly */}
                      <select
                        value="Available"
                        onChange={e => setAvailability(a.id, e.target.value)}
                        disabled={updatingId === a.id}
                        className="rounded-lg border border-white/6 bg-white/3 px-2 py-1 text-[10px] font-black text-white/35 outline-none"
                        onClick={e => e.stopPropagation()}>
                        <option value="Available">Available</option>
                        <option value="Modified">Modified</option>
                        <option value="Injured">Injured</option>
                        <option value="Resting">Resting</option>
                      </select>
                    </div>
                  </div>
                ))}
                {available.length === 0 && (
                  <p className="px-5 py-6 text-sm text-white/25 text-center">No available players.</p>
                )}
              </div>
            </div>

            {/* Unavailable */}
            {unavailable.length > 0 && (
              <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
                <div className="px-5 py-3 border-b border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/35">Unavailable / Modified</p>
                </div>
                <div className="divide-y divide-white/3">
                  {unavailable.map(a => {
                    const st = AVAIL_STYLE[a.availability] || AVAIL_STYLE['Available'];
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/2">
                        <Link href={`/athletes/${a.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                            style={{background:st.bg,color:st.color}}>
                            {initials(a.full_name||'?')}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-white">{a.full_name}</p>
                            <span className="text-[10px] font-semibold" style={{color:st.color}}>{a.availability}</span>
                          </div>
                        </Link>
                        <select
                          value={a.availability}
                          onChange={e => setAvailability(a.id, e.target.value)}
                          disabled={updatingId === a.id}
                          className="shrink-0 rounded-lg border border-white/6 bg-white/3 px-2 py-1 text-[10px] font-black text-white/35 outline-none"
                          onClick={e => e.stopPropagation()}>
                          <option value="Available">Available</option>
                          <option value="Modified">Modified</option>
                          <option value="Injured">Injured</option>
                          <option value="Resting">Resting</option>
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ATTENDANCE TAB ══ */}
        {tab === 'attendance' && (
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-white/5 py-12 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-sm text-white/25">No sessions recorded yet.</p>
              </div>
            ) : sessions.map(s => (
              <div key={s.date} className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <div>
                    <p className="text-sm font-black text-white">{fDate(s.date)}</p>
                    {s.type && <p className="text-[10px] text-white/25">{s.type}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {s.present < s.total && (
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{background:'rgba(248,113,113,0.08)',color:'#fca5a5',border:'1px solid rgba(248,113,113,0.15)'}}>
                        {s.total - s.present} absent
                      </span>
                    )}
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black" style={{background:'rgba(16,185,129,0.08)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.15)'}}>
                      {s.present}/{s.total}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 px-5 py-3">
                  {s.recs.map(r => {
                    const a = squad.find(x => x.id === r.athlete_id);
                    const displayName = a?.full_name || '?';
                    const statusLow = r.status?.toLowerCase()||'';
                    const statusColor = statusLow==='present'?'#6ee7b7':statusLow==='late'?'#fde68a':statusLow==='absent'?'#fca5a5':'#7dd3fc';
                    const statusBg = statusLow==='present'?'rgba(16,185,129,0.08)':statusLow==='late'?'rgba(251,191,36,0.08)':statusLow==='absent'?'rgba(248,113,113,0.08)':'rgba(56,189,248,0.08)';
                    return (
                      <span key={r.id} className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                        style={{background:statusBg,color:statusColor,border:`1px solid ${statusColor}30`}}>
                        {displayName}
                        {r.status?.toLowerCase() !== 'present' && <span className="ml-1 opacity-60">· {r.status?.[0]?.toUpperCase()}</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ══ RESULTS TAB ══ */}
        {tab === 'results' && (
          <div className="space-y-3">
            <button onClick={() => setShowLogResult(true)}
              className="w-full rounded-2xl border border-white/8 py-4 text-sm font-black text-white hover:bg-white/4 transition flex items-center justify-center gap-2"
              style={{background:'rgba(255,255,255,0.02)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>
              Log Match Result
            </button>
            {results.length === 0 ? (
              <div className="rounded-2xl border border-white/5 py-10 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
                <p className="text-sm text-white/25">No results logged yet.</p>
              </div>
            ) : results.map(r => (
              <div key={r.id} className="rounded-2xl border border-white/5 p-5" style={{background:'rgba(255,255,255,0.02)'}}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] text-white/25">{fDate(r.result_date)}</p>
                    <p className="text-base font-black text-white mt-0.5">vs {r.opponent}</p>
                    {r.goal_scorers && (
                      <p className="text-[11px] text-white/35 mt-1">Scorers: {r.goal_scorers}</p>
                    )}
                  </div>
                  <p className="shrink-0 text-2xl font-black" style={{color:accent}}>{r.final_score}</p>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── LOG RESULT MODAL ── */}
      {showLogResult && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowLogResult(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl z-10"
            style={{background:'#0a0d1a'}}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/25">Match Result</p>
                <h2 className="text-xl font-black text-white mt-0.5">{teamName}</h2>
              </div>
              <button onClick={() => setShowLogResult(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 text-white/35 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Date</label>
                  <input type="date" value={resultDate} onChange={e => setResultDate(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 transition"/>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Score</label>
                  <input value={resultScore} onChange={e => setResultScore(e.target.value)} placeholder="e.g. 2-1"
                    className="w-full rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 transition"/>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Opponent</label>
                <input value={resultOpponent} onChange={e => setResultOpponent(e.target.value)} placeholder="e.g. St Stithians"
                  className="w-full rounded-xl border border-white/8 bg-white/3 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 transition"/>
              </div>

              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-white/25">Goal Scorers (tap to select)</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {squad.filter(a => !a.availability || a.availability === 'Available').map(a => {
                    const sel = resultScorers.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => toggleScorer(a.id)}
                        className="rounded-xl border px-3 py-1.5 text-xs font-semibold transition"
                        style={{
                          background: sel ? `${accent}18` : 'rgba(255,255,255,0.03)',
                          color: sel ? accent : '#64748b',
                          border: `1px solid ${sel ? `${accent}40` : 'rgba(255,255,255,0.08)'}`,
                        }}>
                        {a.full_name}
                      </button>
                    );
                  })}
                </div>
                {resultScorers.length > 0 && (
                  <p className="mt-2 text-[11px]" style={{color:accent}}>
                    {resultScorers.map(id => squad.find(a=>a.id===id)?.full_name).join(', ')}
                  </p>
                )}
              </div>

              <button onClick={saveResult} disabled={savingResult || !resultOpponent.trim() || !resultScore.trim()}
                className="w-full rounded-xl py-3 text-sm font-black transition disabled:opacity-40"
                style={{background:`${accent}18`,color:accent,border:`1px solid ${accent}30`}}>
                {savingResult ? 'Saving…' : 'Save Result → appears on portal automatically'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}