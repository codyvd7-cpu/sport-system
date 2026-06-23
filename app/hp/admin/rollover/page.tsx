'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';
import { PageLoader, IconGraduate, IconArrowUp } from '@/components/HPIcons';

type Row = Record<string, any>;
const HP_CLASSES = ['B','E','F','J','M'];

export default function HPRolloverPage() {
  const { showToast } = useToast();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [step, setStep] = React.useState<1|2|3|4>(1);
  const [processing, setProcessing] = React.useState(false);
  const [done, setDone] = React.useState<string[]>([]);
  const [confirmText, setConfirmText] = React.useState('');
  const CONFIRM_PHRASE = 'YEAR END ROLLOVER';

  // New Grade 8 bulk add
  const [newNames, setNewNames] = React.useState('');
  const [newClass, setNewClass] = React.useState('B');
  const [addingNew, setAddingNew] = React.useState(false);
  const [addedCount, setAddedCount] = React.useState(0);

  async function load() {
    const { data } = await supabase.from('hp_students').select('*').eq('is_active', true);
    const sorted = (data || []).sort((a: Row, b: Row) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
      return sA.localeCompare(sB);
    });
    setStudents(sorted);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  const grade8s = students.filter(s => s.grade === 'Grade 8');
  const grade9s = students.filter(s => s.grade === 'Grade 9');
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;

  // Step 2: Graduate Grade 9s
  async function graduateGrade9s() {
    setProcessing(true);
    const ids = grade9s.map(s => s.id);
    if (ids.length > 0) {
      const { error } = await supabase.from('hp_students')
        .update({ is_active: false, notes: `Graduated ${currentYear}` })
        .in('id', ids);
      if (error) { showToast(`Error: ${error.message}`); setProcessing(false); return; }
    }
    setDone(prev => [...prev, `${grade9s.length} Grade 9 students graduated and archived`]);
    showToast(`${grade9s.length} Grade 9 students graduated ✓`);
    setProcessing(false);
    setStep(3);
    await load();
  }

  // Step 3: Promote Grade 8s to Grade 9
  async function promoteGrade8s() {
    setProcessing(true);
    if (grade8s.length > 0) {
      const { error } = await supabase.from('hp_students')
        .update({ grade: 'Grade 9', training_group: null })
        .in('id', grade8s.map(s => s.id));
      if (error) { showToast(`Error: ${error.message}`); setProcessing(false); return; }
    }
    setDone(prev => [...prev, `${grade8s.length} Grade 8 students promoted to Grade 9`]);
    showToast(`${grade8s.length} students promoted to Grade 9 ✓`);
    setProcessing(false);
    setStep(4);
    await load();
  }

  // Step 4: Bulk add new Grade 8s
  async function addNewGrade8s() {
    const names = newNames.split('\n').map(n => n.trim()).filter(Boolean);
    if (!names.length) { showToast('No names entered.'); return; }
    setAddingNew(true);
    const rows = names.map(name => ({ full_name: name, grade: 'Grade 8', class_group: newClass, is_active: true }));
    const { error } = await supabase.from('hp_students').insert(rows);
    if (error) { showToast(`Error: ${error.message}`); setAddingNew(false); return; }
    setAddedCount(prev => prev + names.length);
    setNewNames('');
    showToast(`${names.length} students added to Grade 8${newClass} ✓`);
    setAddingNew(false);
    await load();
  }

  if (loading) return (
    <main className="min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-10 bg-[#030810] pb-24 text-white md:pb-0 flex items-center justify-center">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"/>
    </main>
  );

  return (
    <main className="min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-10 bg-[#030810] pb-24 text-white md:pb-0">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">High Performance · Admin</p>
          <h1 className="mt-1 text-3xl font-black text-white">Year End Rollover</h1>
          <p className="mt-1 text-sm text-slate-500">{currentYear} → {nextYear} transition</p>
        </div>

        {/* Warning banner */}
        {step === 1 && (
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-black text-amber-300 mb-2"><span>Read before proceeding</span></p>
            <ul className="space-y-1.5 text-sm text-amber-200/80">
              <li>• All test results and attendance history is <strong>preserved</strong> — nothing is deleted</li>
              <li>• Grade 9 students will be <strong>archived</strong> (no longer appear in active lists)</li>
              <li>• Grade 8 students will be <strong>promoted to Grade 9</strong> — their training groups will reset</li>
              <li>• You will then add new Grade 8 students for {nextYear}</li>
              <li>• This action <strong>cannot be undone</strong> — do this at the end of the school year only</li>
            </ul>
          </div>
        )}

        {/* Progress steps */}
        <div className="mb-6 flex items-center gap-2">
          {[
            { n:1, label:'Review' },
            { n:2, label:'Graduate' },
            { n:3, label:'Promote' },
            { n:4, label:'New 8s' },
          ].map((s, i) => (
            <React.Fragment key={s.n}>
              <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition ${step === s.n ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : step > s.n ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-slate-900 border border-slate-800 text-slate-600'}`}>
                {step > s.n ? '✓' : s.n} {s.label}
              </div>
              {i < 3 && <span className="text-slate-700 text-xs">→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Review */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-white">Grade 9 — Will be graduated</p>
                <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-black text-red-400">{grade9s.length} students</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grade9s.map(s => (
                  <span key={s.id} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                    {s.full_name.trim().split(' ').pop()} ({s.class_group})
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">Their records stay in the database for historical reference.</p>
            </div>

            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-white">Grade 8 — Will be promoted to Grade 9</p>
                <span className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1 text-xs font-black text-sky-400">{grade8s.length} students</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {grade8s.map(s => (
                  <span key={s.id} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                    {s.full_name.trim().split(' ').pop()} ({s.class_group})
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-600">All test results and attendance history carry over. Training groups will reset — you will re-assign after new testing.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <p className="text-xs text-slate-500 mb-2">Type <span className="font-black text-white">{CONFIRM_PHRASE}</span> to confirm</p>
              <input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Type here..."
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={confirmText !== CONFIRM_PHRASE}
              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-3 text-sm font-black text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-30 disabled:cursor-not-allowed">
              I understand — Begin Rollover →
            </button>
          </div>
        )}

        {/* Step 2: Graduate Grade 9s */}
        {step === 2 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4">
            <IconGraduate className="h-10 w-10 text-slate-400"/>
            <h2 className="text-xl font-black text-white">Graduate Grade 9s</h2>
            <p className="text-sm text-slate-400">
              <span className="text-white font-black">{grade9s.length} students</span> will be archived. Their results and attendance are preserved.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pb-2">
              {grade9s.map(s => (
                <span key={s.id} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                  {s.full_name.trim().split(' ').pop()}
                </span>
              ))}
            </div>
            <button onClick={graduateGrade9s} disabled={processing}
              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-black text-red-300 hover:bg-red-500/20 transition disabled:opacity-50">
              {processing ? 'Archiving...' : `Archive ${grade9s.length} Grade 9 Students`}
            </button>
            {grade9s.length === 0 && (
              <button onClick={() => setStep(3)} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-black text-slate-400 hover:text-white transition">
                No Grade 9s — Skip →
              </button>
            )}
          </div>
        )}

        {/* Step 3: Promote Grade 8s */}
        {step === 3 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4">
            <IconArrowUp className="h-10 w-10 text-slate-400"/>
            <h2 className="text-xl font-black text-white">Promote to Grade 9</h2>
            <p className="text-sm text-slate-400">
              <span className="text-white font-black">{grade8s.length} students</span> currently in Grade 8 will become Grade 9. Their class groups carry over — you can reassign after testing.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5 pb-2">
              {grade8s.map(s => (
                <span key={s.id} className="rounded-lg bg-slate-800 px-2 py-1 text-[10px] text-slate-400">
                  {s.full_name.trim().split(' ').pop()} 8{s.class_group} → 9{s.class_group}
                </span>
              ))}
            </div>
            <button onClick={promoteGrade8s} disabled={processing}
              className="w-full rounded-xl border border-sky-500/30 bg-sky-500/10 py-3 text-sm font-black text-sky-300 hover:bg-sky-500/20 transition disabled:opacity-50">
              {processing ? 'Promoting...' : `Promote ${grade8s.length} Students to Grade 9`}
            </button>
            {grade8s.length === 0 && (
              <button onClick={() => setStep(4)} className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 text-sm font-black text-slate-400 hover:text-white transition">
                No Grade 8s — Skip →
              </button>
            )}
          </div>
        )}

        {/* Step 4: Add new Grade 8s */}
        {step === 4 && (
          <div className="space-y-5">
            {done.length > 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <p className="text-xs font-black text-emerald-400 mb-2">✓ Completed</p>
                {done.map((d, i) => <p key={i} className="text-sm text-emerald-300">{d}</p>)}
              </div>
            )}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm font-black text-white mb-1">Add New Grade 8 Students</p>
              <p className="text-xs text-slate-500 mb-4">Paste one full name per line. Select which class to add them to. Repeat for each class.</p>

              <div className="mb-3">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Class</label>
                <div className="flex gap-2 flex-wrap">
                  {HP_CLASSES.map(c => (
                    <button key={c} onClick={() => setNewClass(c)}
                      className={`rounded-xl border px-4 py-2 text-sm font-black transition ${newClass === c ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'}`}>
                      8{c}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-3">
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Names — one per line</label>
                <textarea
                  value={newNames}
                  onChange={e => setNewNames(e.target.value)}
                  rows={8}
                  placeholder={'Lorenzo Carrozzo\nJoshua Cowan\nAaryan Doorasamy'}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 font-mono resize-none"
                />
                <p className="mt-1 text-[10px] text-slate-600">{newNames.split('\n').filter(n => n.trim()).length} names entered</p>
              </div>

              <button onClick={addNewGrade8s} disabled={addingNew || !newNames.trim()}
                className="w-full rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-3 text-sm font-black text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50">
                {addingNew ? 'Adding...' : `Add to Grade 8${newClass}`}
              </button>

              {addedCount > 0 && (
                <p className="mt-2 text-center text-xs text-emerald-400 font-black">{addedCount} new students added so far ✓</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-center">
              <p className="text-xs text-slate-600 mb-3">Once all new Grade 8s are added, you are done for the year.</p>
              <a href="/hp" className="inline-block rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-6 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/25 transition">
                Back to HP Dashboard →
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
