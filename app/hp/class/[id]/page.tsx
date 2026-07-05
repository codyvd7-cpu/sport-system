'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { GRADE8_TESTS, GRADE9_TESTS, fmtValue, getCurrentTerm } from '@/lib/hpTests';
import { HP_CLASS_MAP } from '@/lib/hpConfig';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}
function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

const ATT_OPTS = [
  { key: 'Present',  short: 'P', bg: 'rgba(16,185,129,0.15)',  col: '#6ee7b7' },
  { key: 'Late',     short: 'L', bg: 'rgba(251,191,36,0.15)',   col: '#fde68a' },
  { key: 'Absent',   short: 'A', bg: 'rgba(248,113,113,0.15)',  col: '#fca5a5' },
  { key: 'Excused',  short: 'E', bg: 'rgba(56,189,248,0.15)',   col: '#7dd3fc' },
];

export default function ClassPage({ params }: PageProps) {
  return (
    <React.Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#060c1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #10b981', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <ClassInner params={params}/>
    </React.Suspense>
  );
}

function ClassInner({ params }: PageProps) {
  const { id }       = React.use(params);
  const classMeta    = HP_CLASS_MAP.find(c => c.id === id);
  const grade        = classMeta?.grade        ?? (id[0] === '8' ? 'Grade 8' : 'Grade 9');
  const cls          = classMeta?.cls          ?? id[1];
  const is8          = grade === 'Grade 8';
  const accent       = is8 ? '#38bdf8' : '#a78bfa';
  const tests        = is8 ? GRADE8_TESTS : GRADE9_TESTS;
  const term         = getCurrentTerm();
  const year         = new Date().getFullYear();
  const searchParams = useSearchParams();

  const [students,    setStudents]    = React.useState<Row[]>([]);
  const [attendance,  setAttendance]  = React.useState<Row[]>([]);
  const [testResults, setTestResults] = React.useState<Row[]>([]);
  const [loading,     setLoading]     = React.useState(true);
  const [tab,         setTab]         = React.useState<'students'|'attendance'|'testing'>(() => {
    const t = searchParams.get('tab');
    return (t === 'attendance' || t === 'testing') ? t : 'students';
  });

  // Attendance state
  const [attDate,    setAttDate]    = React.useState(() => new Date().toISOString().split('T')[0]);
  const [statuses,   setStatuses]   = React.useState<Record<string, string>>({});
  const [savingAtt,  setSavingAtt]  = React.useState(false);
  const [lastSaved,  setLastSaved]  = React.useState<string | null>(null);
  const [toast,      setToast]      = React.useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function load() {
    const res = await fetch(`/api/hp/data?type=class&id=${encodeURIComponent(id)}&year=${year}`, { credentials:'include' });
    if (!res.ok) { setLoading(false); return; }
    const d = await res.json();
    const squad: Row[] = (d.students || []).sort((a: Row, b: Row) =>
      (a.full_name.trim().split(' ').pop() || '').localeCompare(b.full_name.trim().split(' ').pop() || '')
    );
    setStudents(squad);
    setAttendance(d.attendance || []);
    setTestResults(d.tests || []);
    // Pre-fill today's statuses if already recorded
    const today = new Date().toISOString().split('T')[0];
    const init: Record<string, string> = {};
    squad.forEach(s => {
      const existing = (d.attendance || []).find((r: Row) => r.student_id === s.id && r.session_date === attDate);
      init[s.id] = existing?.status || 'Present';
    });
    setStatuses(init);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [id]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const testedThisTerm = new Set(testResults.filter(r => r.term === term).map(r => r.student_id));
  const tested = students.filter(s => testedThisTerm.has(s.id)).length;

  // Attendance rate — filter to current term sessions only
  // Term 1: Jan-Mar, Term 2: Apr-Jun, Term 3: Jul-Sep, Term 4: Oct-Nov
  const TERM_MONTHS: Record<string, number[]> = {
    'Term 1': [1,2,3], 'Term 2': [4,5,6,7], 'Term 3': [7,8,9], 'Term 4': [10,11,12]
  };
  const termMonths = TERM_MONTHS[term] || [];
  const termAtt = attendance.filter(a => {
    const m = new Date(a.session_date).getMonth() + 1;
    return termMonths.includes(m);
  });
  const termSessions = [...new Set(termAtt.map(a => a.session_date))];
  const presentInTerm = termAtt.filter(a => a.status === 'Present').length;
  const possibleInTerm = termSessions.length * students.length;
  const attRate = possibleInTerm > 0 ? Math.round((presentInTerm / possibleInTerm) * 100) : null;

  // ── Save attendance ────────────────────────────────────────────────────────
  async function saveAttendance() {
    setSavingAtt(true);
    await fetch('/api/hp/data', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_attendance',
        date: attDate,
        records: students.map(s => ({ student_id: s.id, session_date: attDate, status: statuses[s.id] || 'Present' })),
      }),
    });
    setLastSaved(attDate);
    showToast(`Register saved — ${fDate(attDate)} ✓`);
    await load();
    setSavingAtt(false);
  }

  const sessions = [...new Set(attendance.map(a => a.session_date))].slice(0, 12);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#060c1a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #10b981', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{ background:'#060c1a' }}>
      <style>{`.att-label-full{display:none}.att-label-short{display:inline}@media(min-width:640px){.att-label-full{display:inline}.att-label-short{display:none}}`}</style>

      {toast && (
        <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:999,
          background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.35)',
          borderRadius:12, padding:'11px 20px', color:'#10b981', fontWeight:700, fontSize:13,
          backdropFilter:'blur(12px)', whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Back */}
        <Link href="/hp/classes" className="inline-flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Classes
        </Link>

        {/* Header card */}
        <div className="mb-5 rounded-2xl border border-white/6 p-5 relative overflow-hidden" style={{ background:'#0d1424' }}>
          <div className="absolute inset-0" style={{ background:`radial-gradient(ellipse at 0% 50%, ${accent}0e, transparent 60%)` }}/>
          <div className="relative flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/25 mb-0.5">{grade} · Class {cls}</p>
              <h1 className="text-4xl font-black tracking-tight" style={{ color:accent }}>{id}</h1>
              <p className="mt-1 text-sm text-white/40">{students.length} students · {term} · {year}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <a href={`/hp-print/class/${id}`} target="_blank"
                className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/3 px-3 py-2 text-xs font-black text-white/40 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Export PDF
              </a>
              <Link href={`/hp/testing?class=${id}`}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition"
                style={{ background:`${accent}15`, color:accent, border:`1px solid ${accent}30` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                Enter Tests
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="relative mt-4 grid grid-cols-3 gap-3">
            {[
              { label:'Students', val:String(students.length), col:'text-white' },
              { label:'Tested',   val:`${tested}/${students.length}`, col:tested===students.length?'text-emerald-400':'' },
              { label:`${term} Att.`, val:attRate!==null?`${attRate}%`:'—',
                col:attRate===null?'text-slate-500':attRate>=80?'text-emerald-400':attRate>=60?'text-amber-400':'text-red-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-white/5 bg-white/3 p-3 text-center">
                <p className={`text-xl font-black ${s.col||''}`} style={!s.col?{color:accent}:{}}>{s.val}</p>
                <p className="text-[9px] font-black uppercase tracking-wide text-white/25 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex rounded-2xl border border-white/5 bg-[#0d1424] p-1">
          {([['students','Students'],['attendance','Register'],['testing','Testing']] as const).map(([key,label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${tab===key?'bg-white/8 text-white':'text-white/35 hover:text-white/60'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── STUDENTS ── */}
        {tab === 'students' && (
          students.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0d1424] p-12 text-center">
              <p className="text-sm font-black text-white/25">No students in this class</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#0d1424] overflow-hidden divide-y divide-white/3">
              {students.map(s => {
                const sAtt = attendance.filter(a => a.student_id === s.id);
                const sRate = sAtt.length > 0 ? Math.round(sAtt.filter(a => a.status === 'Present').length / sAtt.length * 100) : null;
                return (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                      style={{ background:`${accent}15`, color:accent }}>
                      {initials(s.full_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{s.full_name}</p>
                      <p className="text-[10px] text-white/25">Group {s.training_group || '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {sRate !== null && (
                        <span className="text-[11px] font-semibold"
                          style={{ color:sRate>=80?'#10b981':sRate>=60?'#fbbf24':'#f87171' }}>
                          {sRate}%
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black ${testedThisTerm.has(s.id)?'bg-emerald-500/10 text-emerald-400':'bg-white/5 text-white/25'}`}>
                        {testedThisTerm.has(s.id) ? 'Tested' : 'Untested'}
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 text-white/15"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        )}

        {/* ── REGISTER ── */}
        {tab === 'attendance' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/5 bg-[#0d1424] overflow-hidden">
              {/* Register header */}
              <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/25 mb-1">Take Register</p>
                  <p className="text-sm font-black text-white">
                    {students.filter(s => (statuses[s.id]||'Present') === 'Present').length} present
                    {students.filter(s => statuses[s.id] === 'Absent').length > 0 &&
                      <span className="text-red-400 ml-2">· {students.filter(s => statuses[s.id]==='Absent').length} absent</span>}
                  </p>
                  {lastSaved && <p className="text-[10px] text-emerald-400 mt-0.5">Last saved: {fDate(lastSaved)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)}
                    className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-white outline-none focus:border-sky-500/50"
                    style={{ colorScheme:'dark' }}/>
                  <button onClick={saveAttendance} disabled={savingAtt}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-xs font-black transition disabled:opacity-50"
                    style={{ background:`${accent}15`, color:accent, border:`1px solid ${accent}30` }}>
                    {savingAtt && <div className="h-3 w-3 rounded-full border border-current border-t-transparent animate-spin"/>}
                    {savingAtt ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>

              {/* Student list */}
              {students.length === 0 ? (
                <p className="p-8 text-center text-sm text-white/25">No students in this class</p>
              ) : (
                <div className="divide-y divide-white/3">
                  {students.map(s => {
                    const status = statuses[s.id] || 'Present';
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                          style={{ background:`${accent}12`, color:accent }}>
                          {initials(s.full_name)}
                        </div>
                        <p className="flex-1 text-sm font-semibold text-white truncate">{s.full_name}</p>
                        <div className="flex gap-1 shrink-0">
                          {ATT_OPTS.map(opt => {
                            const active = status === opt.key;
                            return (
                              <button key={opt.key}
                                onClick={() => setStatuses(p => ({ ...p, [s.id]: opt.key }))}
                                className="rounded-lg border px-2 py-1.5 text-[10px] font-black transition"
                                style={active
                                  ? { background:opt.bg, color:opt.col, border:`1px solid ${opt.col}40` }
                                  : { background:'rgba(255,255,255,0.03)', color:'#475569', border:'1px solid rgba(255,255,255,0.06)' }}>
                                <span className="att-label-full">{opt.key}</span>
                                <span className="att-label-short">{opt.short}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Session history */}
            {sessions.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#0d1424] p-8 text-center">
                <p className="text-sm font-black text-white/25">No sessions recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">Session History</p>
                {sessions.map(date => {
                  const recs = attendance.filter(a => a.session_date === date);
                  const p = recs.filter(r => r.status === 'Present').length;
                  return (
                    <div key={date} className="rounded-2xl border border-white/5 bg-[#0d1424] overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                        <p className="text-sm font-black text-white">{fDate(date)}</p>
                        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black bg-emerald-500/8 text-emerald-300 border border-emerald-500/15">
                          {p}/{recs.length} present
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 px-5 py-3">
                        {recs.map(r => {
                          const st = r.status?.toLowerCase() || '';
                          const opt = ATT_OPTS.find(o => o.key.toLowerCase() === st);
                          const col = opt?.col || '#94a3b8';
                          const bg  = opt?.bg  || 'rgba(148,163,184,0.08)';
                          const surname = (students.find(s => s.id === r.student_id)?.full_name || '?').trim().split(' ').pop() || '?';
                          return (
                            <span key={r.id||r.student_id} className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
                              style={{ background:bg, color:col, border:`1px solid ${col}30` }}>
                              {surname}{r.status !== 'Present' && <span className="ml-1 opacity-60">· {r.status?.[0]}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TESTING ── */}
        {tab === 'testing' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wide text-white/25">{term} Results</p>
              <Link href={`/hp/testing?class=${id}`}
                className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition"
                style={{ background:`${accent}12`, color:accent, border:`1px solid ${accent}25` }}>
                Enter Tests →
              </Link>
            </div>

            {students.length === 0 ? (
              <div className="rounded-2xl border border-white/5 bg-[#0d1424] p-8 text-center">
                <p className="text-sm font-black text-white/25">No students in this class</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-[#0d1424] overflow-hidden divide-y divide-white/3">
                {students.map(s => {
                  const isTested = testedThisTerm.has(s.id);
                  const result   = testResults.find(r => r.student_id === s.id && r.term === term);
                  return (
                    <Link key={s.id} href={`/hp/students/${s.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/3 transition">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                        style={{ background:`${accent}12`, color:accent }}>
                        {initials(s.full_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{s.full_name}</p>
                        {isTested && result && (
                          <p className="text-[10px] text-white/25 truncate">
                            {tests.filter(t => result[t.key] != null).map(t =>
                              `${t.label.split(' ')[0]}: ${fmtValue(t.key, result[t.key])}`
                            ).join(' · ')}
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-black border ${isTested?'bg-emerald-500/10 text-emerald-400 border-emerald-500/20':'bg-white/5 text-white/25 border-white/8'}`}>
                        {isTested ? 'Tested ✓' : 'Not tested'}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
