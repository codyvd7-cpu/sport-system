'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const TESTS = [
  { key: 'sprint_10m', label: '10m Sprint', unit: 's', lower: true },
  { key: 'sprint_30m', label: '30m Sprint', unit: 's', lower: true },
  { key: 'agility_505_left', label: '505 Left', unit: 's', lower: true },
  { key: 'agility_505_right', label: '505 Right', unit: 's', lower: true },
  { key: 'cmj', label: 'CMJ', unit: 'cm', lower: false },
  { key: 'yoyo_ir1', label: 'Yo-Yo IR1', unit: 'm', lower: false },
  { key: 'rsa_best', label: 'RSA Best', unit: 's', lower: true },
  { key: 'rsa_mean', label: 'RSA Mean', unit: 's', lower: true },
  { key: 'rsa_decrement', label: 'RSA Dec%', unit: '%', lower: true },
];

const BENCHMARKS: Record<string, number[]> = {
  sprint_10m: [1.72, 1.82, 1.92, 2.02],
  sprint_30m: [4.25, 4.45, 4.65, 4.85],
  agility_505_left: [2.35, 2.50, 2.65, 2.80],
  agility_505_right: [2.35, 2.50, 2.65, 2.80],
  cmj: [40, 35, 30, 25],
  yoyo_ir1: [1200, 900, 700, 500],
  rsa_best: [3.5, 3.8, 4.1, 4.4],
  rsa_mean: [3.8, 4.1, 4.4, 4.7],
  rsa_decrement: [3.0, 5.0, 7.0, 10.0],
};

const TIERS = ['Elite','Good','Average','Developing','Poor'];
const TIER_COLORS = ['text-emerald-400','text-sky-400','text-amber-400','text-orange-400','text-red-400'];
const TIER_BG = ['bg-emerald-500/10 border-emerald-500/30','bg-sky-500/10 border-sky-500/30','bg-amber-500/10 border-amber-500/30','bg-orange-500/10 border-orange-500/30','bg-red-500/10 border-red-500/30'];

function getTier(key: string, value: number, lower: boolean) {
  const b = BENCHMARKS[key]; if (!b) return null;
  if (lower) { if (value <= b[0]) return 0; if (value <= b[1]) return 1; if (value <= b[2]) return 2; if (value <= b[3]) return 3; return 4; }
  else { if (value >= b[0]) return 0; if (value >= b[1]) return 1; if (value >= b[2]) return 2; if (value >= b[3]) return 3; return 4; }
}

function Sparkline({ values, lower }: { values: number[]; lower: boolean }) {
  if (values.length < 2) return null;
  const min = Math.min(...values); const max = Math.max(...values); const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = values.map((v, i) => `${(i/(values.length-1))*W},${H-((v-min)/range)*H}`).join(' ');
  const improved = lower ? values[values.length-1] < values[0] : values[values.length-1] > values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-20 h-7" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={improved ? '#10b981' : '#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HPTrendsPage() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedTest, setSelectedTest] = React.useState('sprint_10m');
  const [gradeFilter, setGradeFilter] = React.useState('All');

  React.useEffect(() => {
    async function load() {
      const [sRes, rRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('is_active', true).order('grade').order('full_name'),
        supabase.from('hp_test_results').select('*').order('year').order('term'),
      ]);
      setStudents(sRes.data || []);
      setResults(rRes.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const test = TESTS.find(t => t.key === selectedTest)!;
  const filtered = gradeFilter === 'All' ? students : students.filter(s => s.grade === gradeFilter);
  const TERMS = ['Term 1','Term 2','Term 3'];

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/hp" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← HP Classes</Link>
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">HP Classes</p>
          <h1 className="mt-1 text-3xl font-black text-white">Trends</h1>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-3">
          <select value={selectedTest} onChange={e => setSelectedTest(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
            {TESTS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <div className="flex gap-1">
            {['All','Grade 8','Grade 9'].map(g => (
              <button key={g} onClick={() => setGradeFilter(g)} className={`rounded-xl px-3 py-2.5 text-sm font-black transition ${gradeFilter === g ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>{g}</button>
            ))}
          </div>
        </div>

        {loading ? <p className="text-sm text-slate-400">Loading...</p> : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
            {/* Header */}
            <div className="grid border-b border-slate-800 bg-slate-950/50 px-5 py-3" style={{ gridTemplateColumns: '1fr 80px repeat(3, 1fr) 80px' }}>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Student</p>
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 text-center">Trend</p>
              {TERMS.map(t => <p key={t} className="text-[10px] font-black uppercase tracking-wide text-slate-500 text-center">{t}</p>)}
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 text-center">Best</p>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-800/50">
              {filtered.map(s => {
                const studentResults = results.filter(r => r.student_id === s.id);
                const termVals = TERMS.map(term => {
                  const r = studentResults.find(r => r.term === term);
                  return r ? r[selectedTest] : null;
                });
                const validVals = termVals.filter(v => v !== null) as number[];
                const best = validVals.length > 0 ? (test.lower ? Math.min(...validVals) : Math.max(...validVals)) : null;
                const bestTier = best !== null ? getTier(selectedTest, best, test.lower) : null;

                return (
                  <div key={s.id} className="grid items-center gap-2 px-5 py-3 hover:bg-slate-800/20 transition" style={{ gridTemplateColumns: '1fr 80px repeat(3, 1fr) 80px' }}>
                    <div>
                      <Link href={`/hp/students/${s.id}`} className="text-sm font-semibold text-white hover:text-sky-400 truncate block">{s.full_name}</Link>
                      <p className="text-[10px] text-slate-600">{s.grade}</p>
                    </div>
                    <div className="flex justify-center">
                      {validVals.length >= 2 ? <Sparkline values={validVals} lower={test.lower} /> : <span className="text-[10px] text-slate-700">—</span>}
                    </div>
                    {termVals.map((val, i) => {
                      if (val === null) return <div key={i} className="text-center text-slate-700 text-sm">—</div>;
                      const tier = getTier(selectedTest, val, test.lower);
                      return (
                        <div key={i} className="text-center">
                          <p className="text-sm font-black text-white">{val}{test.unit}</p>
                          {tier !== null && <p className={`text-[9px] font-black ${TIER_COLORS[tier]}`}>{TIERS[tier]}</p>}
                        </div>
                      );
                    })}
                    <div className="text-center">
                      {best !== null ? (
                        <div>
                          <p className="text-sm font-black text-white">{best}{test.unit}</p>
                          {bestTier !== null && <p className={`text-[9px] font-black ${TIER_COLORS[bestTier]}`}>{TIERS[bestTier]}</p>}
                        </div>
                      ) : <span className="text-slate-700 text-sm">—</span>}
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
