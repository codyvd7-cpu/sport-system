'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { HP_CLASSES, HP_CLASS_IDS } from '@/lib/hpConfig';

type Row = Record<string, any>;

const ATT_OPTS = [
  { key:'Present', short:'P', active:'bg-emerald-500 text-white',      inactive:'bg-white/5 text-white/35 hover:bg-slate-700' },
  { key:'Late',    short:'L', active:'bg-amber-500  text-white',        inactive:'bg-white/5 text-white/35 hover:bg-slate-700' },
  { key:'Absent',  short:'A', active:'bg-red-500    text-white',        inactive:'bg-white/5 text-white/35 hover:bg-slate-700' },
  { key:'Excused', short:'E', active:'bg-sky-500    text-white',        inactive:'bg-white/5 text-white/35 hover:bg-slate-700' },
];

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short' });
}

export default function HPAttendancePage() {
  return (
    <React.Suspense fallback={
      <div style={{minHeight:'100vh',background:'#060c1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:24,height:24,borderRadius:'50%',border:'3px solid #10b981',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <Inner/>
    </React.Suspense>
  );
}

function Inner() {
  const urlClass     = useSearchParams().get('class');
  const [students,   setStudents]   = React.useState<Row[]>([]);
  const [statuses,   setStatuses]   = React.useState<Record<string,string>>({});
  const [date,       setDate]       = React.useState(() => new Date().toISOString().split('T')[0]);
  const [sessType,   setSessType]   = React.useState('HP Training');
  const [selClass,   setSelClass]   = React.useState<string|null>(urlClass || null);
  const [saving,     setSaving]     = React.useState(false);
  const [history,    setHistory]    = React.useState<Row[]>([]);
  const [toast,      setToast]      = React.useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  async function load() {
    const res = await fetch('/api/hp/data?type=attendance', { credentials:'include' });
    if (!res.ok) return;
    const d = await res.json();
    const s = (d.students || []).sort((a:Row,b:Row) => {
      const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      return sA.localeCompare(sB);
    });
    setStudents(s);
    const init: Record<string,string> = {};
    s.forEach((st:Row) => { init[st.id] = 'Present'; });
    setStatuses(init);
    setHistory(d.attendance || []);
  }

  React.useEffect(() => { load(); }, []);

  const classStudents = React.useMemo(() => {
    if (!selClass) return [];
    const grade = selClass[0] === '8' ? 'Grade 8' : 'Grade 9';
    const cls   = selClass[1];
    return students.filter(s => s.grade === grade && s.class_group === cls);
  }, [selClass, students]);

  // When class + date changes, pre-fill from existing records
  React.useEffect(() => {
    if (!selClass || !students.length) return;
    const classIds = new Set(classStudents.map(s => s.id));
    const existing = history.filter(h => classIds.has(h.student_id) && h.session_date === date);
    if (existing.length > 0) {
      setStatuses(prev => {
        const updated = { ...prev };
        existing.forEach(h => { updated[h.student_id] = h.status; });
        return updated;
      });
    }
  }, [selClass, date, history, classStudents]);

  // Check if this session already has data (duplicate warning)
  const alreadySaved = React.useMemo(() => {
    if (!selClass || !classStudents.length) return false;
    const classIds = new Set(classStudents.map(s => s.id));
    return history.some(h => classIds.has(h.student_id) && h.session_date === date);
  }, [selClass, classStudents, history, date]);

  async function saveAttendance() {
    if (!selClass || classStudents.length === 0) { showToast('Select a class first'); return; }
    setSaving(true);
    const records = classStudents.map(s => ({
      student_id:   s.id,
      session_date: date,
      session_type: sessType,
      status:       statuses[s.id] || 'Present',
    }));
    const res = await fetch('/api/hp/data', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'save_attendance', date, records }),
    });
    if (!res.ok) { const d = await res.json(); showToast(`Error: ${d.error}`); setSaving(false); return; }
    showToast(`${alreadySaved ? 'Updated' : 'Saved'} — ${classStudents.length} students ✓`);
    await load();
    setSaving(false);
  }

  const classHistory = React.useMemo(() => {
    if (!selClass) return [];
    const ids = new Set(classStudents.map(s => s.id));
    return history.filter(h => ids.has(h.student_id));
  }, [history, classStudents, selClass]);

  const recentDates = [...new Set(classHistory.map(h => h.session_date))]
    .sort((a,b) => b.localeCompare(a))
    .slice(0, 6);

  const attRate = React.useMemo(() => {
    if (!classHistory.length) return null;
    const present = classHistory.filter(h => ['Present','Late'].includes(h.status)).length;
    return Math.round((present / classHistory.length) * 100);
  }, [classHistory]);

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{background:'#060c1a'}}>
      <style>{`.att-full{display:none}.att-short{display:inline}@media(min-width:640px){.att-full{display:inline}.att-short{display:none}}`}</style>

      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,
          background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.35)',
          borderRadius:12,padding:'11px 20px',color:'#10b981',fontWeight:700,fontSize:13,
          backdropFilter:'blur(12px)',whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-white/30 hover:text-white/60 transition">← High Performance</Link>

        <div className="mb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-emerald-500/70">High Performance</p>
          <h1 className="text-4xl font-black text-white tracking-tight leading-none">Attendance</h1>
        </div>

        {/* Step 1 — Session details */}
        <div className="mb-4 rounded-2xl border border-white/6 bg-white/2 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-white/30">Step 1 — Session Details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/30">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{colorScheme:'dark'}}
                className="w-full rounded-xl border border-white/8 bg-[#0d1424] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"/>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/30">Session Type</label>
              <select value={sessType} onChange={e => setSessType(e.target.value)}
                style={{background:'#0d1424',color:'white'}}
                className="w-full rounded-xl border border-white/8 px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                {['HP Training','Gym','Testing','Recovery','Match Prep','Conditioning'].map(t => (
                  <option key={t} style={{background:'#0d1424'}}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2 — Select class */}
        <div className="mb-4 rounded-2xl border border-white/6 bg-white/2 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-white/30">Step 2 — Select Class</p>
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => {
                  const key = `8${c}`;
                  return (
                    <button key={key} onClick={() => setSelClass(key)}
                      className={`rounded-xl border py-2.5 text-sm font-black transition ${selClass===key ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-white/8 bg-white/5 text-white/40 hover:text-white'}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="grid grid-cols-5 gap-2">
                {HP_CLASSES.map(c => {
                  const key = `9${c}`;
                  return (
                    <button key={key} onClick={() => setSelClass(key)}
                      className={`rounded-xl border py-2.5 text-sm font-black transition ${selClass===key ? 'border-violet-500/40 bg-violet-500/15 text-violet-300' : 'border-white/8 bg-white/5 text-white/40 hover:text-white'}`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 — Register */}
        <div className="mb-4 rounded-2xl border border-white/6 bg-white/2 p-5">
          <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-xs font-black uppercase tracking-wide text-white/30">
              Step 3 — Take Register {selClass ? `· ${selClass}` : ''}
              {selClass && <span className="ml-2 text-white/20">({classStudents.length} students)</span>}
            </p>
            {selClass && classStudents.length > 0 && (
              <button
                onClick={() => setStatuses(prev => {
                  const all = {...prev};
                  classStudents.forEach(s => { all[s.id] = 'Present'; });
                  return all;
                })}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">
                ✓ All Present
              </button>
            )}
          </div>

          {/* No class selected */}
          {!selClass && (
            <div className="py-8 text-center">
              <p className="text-sm font-black text-white/25">Select a class above to take register</p>
            </div>
          )}

          {/* Duplicate warning */}
          {selClass && alreadySaved && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
              <p className="text-xs font-black text-amber-400">
                ⚠ Attendance already recorded for {selClass} on {fDate(date)}. Saving will update the existing register.
              </p>
            </div>
          )}

          {/* Student list */}
          {selClass && classStudents.length === 0 && (
            <p className="py-4 text-center text-sm text-white/25">No students in this class</p>
          )}

          {selClass && classStudents.length > 0 && (
            <div className="space-y-1.5">
              {classStudents.map(s => {
                const status = statuses[s.id] || 'Present';
                return (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/2 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[10px] font-black text-emerald-300">
                      {s.full_name.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <p className="flex-1 min-w-0 truncate text-sm font-semibold text-white">{s.full_name}</p>
                    <div className="flex gap-1 shrink-0">
                      {ATT_OPTS.map(opt => (
                        <button key={opt.key} onClick={() => setStatuses(p => ({...p,[s.id]:opt.key}))}
                          className={`rounded-lg px-2 py-1.5 text-[10px] font-black transition ${status===opt.key ? opt.active : opt.inactive}`}>
                          <span className="att-full">{opt.key}</span>
                          <span className="att-short">{opt.short}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Save button */}
          <button onClick={saveAttendance}
            disabled={saving || !selClass || classStudents.length === 0}
            className="mt-4 w-full rounded-xl border border-sky-500 bg-sky-500/15 py-3 text-sm font-black text-sky-300 disabled:opacity-40 transition hover:bg-sky-500/25">
            {saving ? 'Saving…' :
             !selClass ? 'Select a class to save' :
             alreadySaved ? `Update Register — ${classStudents.length} Students` :
             `Save Register — ${classStudents.length} Students`}
          </button>
        </div>

        {/* Recent sessions */}
        {selClass && recentDates.length > 0 && (
          <div className="rounded-2xl border border-white/6 bg-white/2 p-5">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-black text-white">Recent Sessions — {selClass}</h2>
              {attRate !== null && (
                <span className={`rounded-xl border px-3 py-1 text-xs font-black ${attRate>=80?'border-emerald-500/30 bg-emerald-500/10 text-emerald-300':attRate>=60?'border-amber-500/30 bg-amber-500/10 text-amber-300':'border-red-500/30 bg-red-500/10 text-red-300'}`}>
                  {attRate}% overall
                </span>
              )}
            </div>
            <div className="space-y-2">
              {recentDates.map(d => {
                const sess    = classHistory.filter(h => h.session_date === d);
                const present = sess.filter(h => ['Present','Late'].includes(h.status)).length;
                const absent  = sess.filter(h => h.status === 'Absent').length;
                const type    = sess[0]?.session_type || '';
                return (
                  <div key={d} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/2 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{fDate(d)}</p>
                      {type && <p className="text-[10px] text-white/30">{type}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {absent > 0 && (
                        <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-[10px] font-black text-red-400">
                          {absent} absent
                        </span>
                      )}
                      <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-xs font-black text-emerald-300">
                        {present}/{sess.length}
                      </span>
                      <Link href={`/hp/class/${selClass}?tab=attendance`}
                        className="rounded-lg border border-white/8 bg-white/4 px-2.5 py-1 text-[10px] font-black text-white/40 hover:text-white transition">
                        View →
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
