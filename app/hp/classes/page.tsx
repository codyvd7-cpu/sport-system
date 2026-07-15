'use client';
import * as React from 'react';
import Link from 'next/link';
import { HP_CLASS_IDS } from '@/lib/hpConfig';
import { assignTrainingGroups, GROUP_COLORS, GROUP_LABELS } from '@/lib/hpScoring';
import { usePrintReport, PrintToast } from '@/components/HPPrintTrigger';

type Row = Record<string, any>;

export default function HPClassesPage() {
  const { print, printing } = usePrintReport();
  const [students,      setStudents]      = React.useState<Row[]>([]);
  const [latestResults, setLatestResults] = React.useState<Record<string,Row>>({});
  const [loading,       setLoading]       = React.useState(true);
  const [selectedClass, setSelectedClass] = React.useState<string|null>(null);
  const [numGroups,     setNumGroups]     = React.useState(3);
  const [saving,        setSaving]        = React.useState(false);
  const [toast,         setToast]         = React.useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  React.useEffect(() => {
    fetch('/api/hp/data?type=trends', { credentials:'include' })
      .then(r => r.json())
      .then(d => {
        const sorted = (d.students || []).sort((a:Row,b:Row) => {
          const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          return sA.localeCompare(sB);
        });
        setStudents(sorted);
        const year = new Date().getFullYear();
        const map: Record<string,Row> = {};
        (d.tests || []).filter((r:Row) => r.year === year)
          .forEach((r:Row) => { map[r.student_id] = r; });
        setLatestResults(map);
        setLoading(false);
      });
  }, []);

  const grade8Classes = HP_CLASS_IDS.filter(c => c[0] === '8');
  const grade9Classes = HP_CLASS_IDS.filter(c => c[0] === '9');

  const classStudents = React.useMemo(() => {
    if (!selectedClass) return [];
    const grade = selectedClass[0] === '8' ? 'Grade 8' : 'Grade 9';
    return students.filter(s => s.grade === grade && s.class_group === selectedClass[1]);
  }, [selectedClass, students]);

  const computedGroups = React.useMemo(() => {
    if (!selectedClass || !classStudents.length) return {};
    return assignTrainingGroups(classStudents, latestResults, numGroups);
  }, [classStudents, latestResults, numGroups, selectedClass]);

  async function saveGroups() {
    setSaving(true);
    await Promise.all(
      Object.entries(computedGroups).map(([id, group]) =>
        fetch('/api/hp/data', {
          method:'POST', credentials:'include',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ action:'update', table:'hp_students', data:{ training_group:group }, matchCol:'id', matchVal:id }),
        })
      )
    );
    setStudents(prev => prev.map(s => ({ ...s, training_group: computedGroups[s.id] ?? s.training_group })));
    showToast(`${numGroups} groups saved ✓`);
    setSaving(false);
  }

  function ClassCard({ id, grade }: { id:string; grade:string }) {
    const gradeLabel = id[0] === '8' ? 'Grade 8' : 'Grade 9';
    const cs = students.filter(s => s.grade === gradeLabel && s.class_group === id[1]);
    const tested = cs.filter(s => latestResults[s.id]).length;
    const isSelected = selectedClass === id;
    const borderCol = id[0] === '8' ? (isSelected ? 'border-sky-500/50 bg-sky-500/12' : 'border-white/6 bg-white/3 hover:border-sky-500/25')
                                    : (isSelected ? 'border-violet-500/50 bg-violet-500/12' : 'border-white/6 bg-white/3 hover:border-violet-500/25');
    const labelCol = id[0] === '8' ? (isSelected ? 'text-sky-400' : 'text-white') : (isSelected ? 'text-violet-400' : 'text-white');

    return (
      <button onClick={() => setSelectedClass(isSelected ? null : id)}
        className={`rounded-2xl border px-5 py-3 text-left transition ${borderCol}`}>
        <p className={`text-2xl font-black ${labelCol}`}>{id}</p>
        <p className="text-[10px] text-white/40 mt-1">{cs.length} students</p>
        <p className="text-[10px] text-white/25">{tested}/{cs.length} tested</p>
      </button>
    );
  }

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{background:'#060c1a'}}>
      {toast && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,
          background:'rgba(124,58,237,0.15)',border:'1px solid rgba(124,58,237,0.4)',
          borderRadius:12,padding:'11px 20px',color:'#a78bfa',fontWeight:700,fontSize:13,
          backdropFilter:'blur(12px)',whiteSpace:'nowrap'}}>
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">High Performance</p>
            <h1 className="mt-1 text-3xl font-black text-white">Classes</h1>
            <p className="mt-1 text-sm text-white/35">Select a class to manage students and training groups</p>
          </div>
        </div>

        {/* Class selector grid */}
        {loading ? (
          <div className="grid grid-cols-5 gap-2 mb-6">
            {Array.from({length:10}).map((_,i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse"/>)}
          </div>
        ) : (
          <div className="mb-8 space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-sky-400">Grade 8</p>
              <div className="flex flex-wrap gap-2">
                {grade8Classes.map(c => <ClassCard key={c} id={c} grade="Grade 8"/>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-violet-400">Grade 9</p>
              <div className="flex flex-wrap gap-2">
                {grade9Classes.map(c => <ClassCard key={c} id={c} grade="Grade 9"/>)}
              </div>
            </div>
          </div>
        )}

        {/* Selected class detail */}
        {selectedClass && (
          <div className="rounded-2xl border border-white/7 bg-white/2 overflow-hidden">

            {/* Class header */}
            <div className="border-b border-white/7 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-black text-white">
                  {selectedClass[0] === '8' ? 'Grade 8' : 'Grade 9'} — Class {selectedClass[1]}
                </p>
                <p className="text-xs text-white/35">
                  {classStudents.length} students · {classStudents.filter(s => latestResults[s.id]).length} with test results
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => print(`/hp-print/class/${selectedClass}`)}
                  className="rounded-xl border border-slate-600/50 bg-white/5 px-3 py-1.5 text-xs font-black text-white/50 hover:text-white hover:border-white/20 transition cursor-pointer">
                  Export PDF
                </button>
                <Link href={`/hp/class/${selectedClass}`}
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-300 hover:bg-emerald-500/20 transition">
                  Full Class View →
                </Link>
              </div>
            </div>

            {/* Training groups */}
            <div className="border-b border-white/7 px-5 py-4 bg-white/1">
              <div className="flex items-center gap-3 flex-wrap mb-3">
                <p className="text-xs font-black text-white/60">Training Groups</p>
                {[2,3,4,5].map(n => (
                  <button key={n} onClick={() => setNumGroups(n)}
                    className={`h-7 w-7 rounded-lg text-xs font-black transition ${numGroups===n ? 'bg-violet-500/20 border border-violet-500/40 text-violet-300' : 'border border-white/8 bg-white/5 text-white/35 hover:text-white'}`}>
                    {n}
                  </button>
                ))}
                <button onClick={saveGroups} disabled={saving || !Object.keys(computedGroups).length}
                  className="ml-auto rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-xs font-black text-violet-300 hover:bg-violet-500/25 transition disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save Groups'}
                </button>
              </div>

              <p className="text-[10px] text-white/25 mb-3">
                Groups are calculated from latest test results. Best composite score → Group 1.
              </p>

              {/* Group strips */}
              <div className="flex flex-wrap gap-2">
                {Array.from({length:numGroups}, (_,i) => i+1).map(g => {
                  const members = classStudents.filter(s => (computedGroups[s.id] ?? s.training_group) === g);
                  return (
                    <div key={g} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black ${GROUP_COLORS[g]}`}>
                      <span>G{g} {GROUP_LABELS[g] ? `· ${GROUP_LABELS[g]}` : ''}</span>
                      <span className="opacity-50">({members.length})</span>
                    </div>
                  );
                })}
                {(() => {
                  const ungrouped = classStudents.filter(s => !computedGroups[s.id] && !s.training_group).length;
                  return ungrouped > 0 ? <span className="text-[10px] text-white/25 self-center">{ungrouped} ungrouped (no results)</span> : null;
                })()}
              </div>
            </div>

            {/* Student list */}
            <div className="divide-y divide-white/5">
              {classStudents.map(s => {
                const group = computedGroups[s.id] ?? s.training_group;
                const hasTested = !!latestResults[s.id];
                return (
                  <Link key={s.id} href={`/hp/students/${s.id}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/3 transition">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-black border ${group ? GROUP_COLORS[group] : 'border-white/8 bg-white/5 text-white/40'}`}>
                      {s.full_name.split(' ').map((n:string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <p className="flex-1 text-sm font-semibold text-white truncate">{s.full_name}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      {group && (
                        <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black ${GROUP_COLORS[group]}`}>
                          G{group}
                        </span>
                      )}
                      {!hasTested && (
                        <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-400">
                          Untested
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <PrintToast show={printing}/>
    </main>
  );
}
