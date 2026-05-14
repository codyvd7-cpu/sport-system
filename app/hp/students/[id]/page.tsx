'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

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

function getTier(key: string, value: number, lower: boolean) {
  const b = BENCHMARKS[key]; if (!b) return null;
  if (lower) { if (value <= b[0]) return 0; if (value <= b[1]) return 1; if (value <= b[2]) return 2; if (value <= b[3]) return 3; return 4; }
  else { if (value >= b[0]) return 0; if (value >= b[1]) return 1; if (value >= b[2]) return 2; if (value >= b[3]) return 3; return 4; }
}

export default function HPStudentProfile({ params }: PageProps) {
  const { id } = React.use(params);
  const [student, setStudent] = React.useState<Row | null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const [sRes, aRes, rRes] = await Promise.all([
        supabase.from('hp_students').select('*').eq('id', id).single(),
        supabase.from('hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
        supabase.from('hp_test_results').select('*').eq('student_id', id).order('test_date', { ascending: false }),
      ]);
      setStudent(sRes.data);
      setAttendance(aRes.data || []);
      setResults(rRes.data || []);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <main className="flex min-h-screen items-center justify-center bg-slate-950"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"/></main>;
  if (!student) return <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white"><p>Student not found</p></main>;

  const attRate = attendance.length > 0 ? Math.round((attendance.filter(a => ['Present','Late'].includes(a.status)).length / attendance.length) * 100) : null;

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link href="/hp/students" className="mb-6 inline-block text-xs text-slate-500 hover:text-slate-300">← Students</Link>

        {/* Hero */}
        <div className="mb-8 flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/30 to-emerald-500/10 text-xl font-black text-emerald-300">
            {student.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">HP Student</p>
            <h1 className="mt-0.5 text-3xl font-black text-white">{student.full_name}</h1>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">{student.grade}</span>
              {attRate !== null && <span className={`rounded-full px-3 py-1 text-xs font-black ${attRate >= 80 ? 'bg-emerald-500/15 text-emerald-300' : attRate >= 60 ? 'bg-amber-500/15 text-amber-300' : 'bg-red-500/15 text-red-300'}`}>{attRate}% attendance</span>}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Test results by term */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-black text-white">Test Results</h2>
            {results.length === 0 ? <p className="text-sm text-slate-500">No test results yet.</p> : (
              <div className="space-y-4">
                {results.map(r => (
                  <div key={r.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <p className="mb-3 text-xs font-black uppercase tracking-wide text-emerald-400">{r.term} {r.year} · {new Date(r.test_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {TESTS.map(t => {
                        const val = r[t.key];
                        if (val === null || val === undefined) return null;
                        const tier = getTier(t.key, val, t.lower);
                        return (
                          <div key={t.key} className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">{t.label}</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-white">{val}{t.unit}</span>
                              {tier !== null && <span className={`text-[9px] font-black ${TIER_COLORS[tier]}`}>{TIERS[tier]}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance history */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="mb-4 text-lg font-black text-white">Attendance ({attendance.length} sessions)</h2>
            {attendance.length === 0 ? <p className="text-sm text-slate-500">No attendance records yet.</p> : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {attendance.map(a => {
                  const cls = a.status === 'Present' ? 'bg-emerald-500/15 text-emerald-300' : a.status === 'Late' ? 'bg-amber-500/15 text-amber-300' : a.status === 'Absent' ? 'bg-red-500/15 text-red-300' : 'bg-sky-500/15 text-sky-300';
                  return (
                    <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-2.5">
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black ${cls}`}>{a.status}</span>
                      <p className="flex-1 text-xs text-slate-300">{a.session_type}</p>
                      <p className="text-[10px] text-slate-500">{new Date(a.session_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
