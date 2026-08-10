'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

// ─── ReturnToPlayPanel ─────────────────────────────────────────────────────────
// The school's own return-to-play protocol, as a working checklist.
//
// Two things make this more than a status field:
//   • Stages that require medical clearance are GATED — the advance button is
//     disabled until clearance is recorded. The protocol is enforced, not
//     just described.
//   • Stages that require baseline testing show the athlete's OWN baseline and
//     latest values side by side, so "back to baseline?" is answerable on the
//     spot rather than from memory.

type Stage = {
  id: string; stage_order: number; name: string; description: string | null;
  owner_role: string | null; requires_medical_clearance: boolean;
  requires_baseline_tests: boolean; sets_availability: string | null;
};
type Case = {
  id: string; injury_summary: string; body_area: string | null;
  reported_on: string; current_stage_id: string | null; status: string;
  medical_cleared_on: string | null; medical_cleared_by: string | null;
  medical_clearance_note: string | null; expected_return: string | null;
};
type Progress = { stage_name: string; outcome: string; note: string | null; recorded_by: string | null; created_at: string };
type Baseline = { test: string; baseline: number; unit: string; latest: number | null; baselineDate: string; latestDate: string | null };

export default function ReturnToPlayPanel({ athleteId, accent = '#38bdf8' }: { athleteId: string; accent?: string }) {
  const [stages, setStages] = React.useState<Stage[]>([]);
  const [openCase, setOpenCase] = React.useState<Case | null>(null);
  const [progress, setProgress] = React.useState<Progress[]>([]);
  const [baselines, setBaselines] = React.useState<Baseline[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const [showNew, setShowNew] = React.useState(false);
  const [form, setForm] = React.useState({ injurySummary: '', bodyArea: '', occurredOn: '', expectedReturn: '' });
  const [showMed, setShowMed] = React.useState(false);
  const [med, setMed] = React.useState({ clearedBy: '', clearedOn: '', note: '' });

  const authed = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/athlete/rtp', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch(`/api/athlete/rtp?athleteId=${athleteId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.ok) {
        const d = await res.json();
        setStages(d.stages || []); setOpenCase(d.openCase || null);
        setProgress(d.progress || []); setBaselines(d.baselines || []);
      }
    } catch { /* panel stays empty */ }
    setLoading(false);
  }, [athleteId]);

  React.useEffect(() => { load(); }, [load]);

  async function openCaseSubmit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await authed({ method: 'POST', body: JSON.stringify({ athleteId, ...form }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not open case.');
      setForm({ injurySummary: '', bodyArea: '', occurredOn: '', expectedReturn: '' }); setShowNew(false); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not open case.'); }
    setBusy(false);
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!openCase) return;
    setBusy(true); setErr('');
    try {
      const res = await authed({ method: 'PATCH', body: JSON.stringify({ caseId: openCase.id, action, ...extra }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Action failed.');
      setShowMed(false); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Action failed.'); }
    setBusy(false);
  }

  if (loading) return <p className="px-1 text-[12px] text-white/30">Loading…</p>;

  const input = 'rounded-xl border border-white/10 bg-[#04060e] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-white/25';
  const currentIdx = stages.findIndex(s => s.id === openCase?.current_stage_id);
  const current = currentIdx >= 0 ? stages[currentIdx] : null;
  const next = currentIdx >= 0 ? stages[currentIdx + 1] : null;
  const blockedByMedical = !!next?.requires_medical_clearance && !openCase?.medical_cleared_on;

  return (
    <div className="space-y-4">
      {err && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

      {!openCase && !showNew && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-8 text-center">
          <p className="text-[13px] text-white/40">No active injury.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/25">
            Opening a case starts your school&apos;s return-to-play protocol and tracks the athlete through each stage.
          </p>
          <button onClick={() => setShowNew(true)} className="mt-4 rounded-xl px-4 py-2 text-[12px] font-bold"
            style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5' }}>
            Report an injury
          </button>
        </div>
      )}

      {showNew && (
        <form onSubmit={openCaseSubmit} className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">Report injury</p>
          <input className={`w-full ${input}`} value={form.injurySummary} onChange={e => setForm({ ...form, injurySummary: e.target.value })} placeholder="What happened — e.g. Hamstring strain in match" required />
          <div className="grid grid-cols-3 gap-2">
            <input className={input} value={form.bodyArea} onChange={e => setForm({ ...form, bodyArea: e.target.value })} placeholder="Body area" />
            <input className={input} type="date" value={form.occurredOn} onChange={e => setForm({ ...form, occurredOn: e.target.value })} title="Date of injury" />
            <input className={input} type="date" value={form.expectedReturn} onChange={e => setForm({ ...form, expectedReturn: e.target.value })} title="Expected return" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="rounded-xl px-4 py-2 text-[12px] font-bold disabled:opacity-50"
              style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', color: '#fca5a5' }}>Open case</button>
            <button type="button" onClick={() => setShowNew(false)} className="rounded-xl border border-white/10 px-4 py-2 text-[12px] text-white/50">Cancel</button>
          </div>
        </form>
      )}

      {openCase && (
        <>
          <div className="rounded-2xl border p-4" style={{ background: 'rgba(248,113,113,0.05)', borderColor: 'rgba(248,113,113,0.25)' }}>
            <p className="text-[13px] font-bold text-white">{openCase.injury_summary}</p>
            <p className="mt-0.5 text-[11px] text-white/40">
              {openCase.body_area ? `${openCase.body_area} · ` : ''}
              Reported {new Date(openCase.reported_on).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              {openCase.expected_return ? ` · Expected back ${new Date(openCase.expected_return).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : ''}
            </p>
            {openCase.medical_cleared_on ? (
              <p className="mt-2 text-[11px] text-emerald-300">
                ✓ Medically cleared {new Date(openCase.medical_cleared_on).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                {openCase.medical_cleared_by ? ` by ${openCase.medical_cleared_by}` : ''}
                {openCase.medical_clearance_note ? ` — ${openCase.medical_clearance_note}` : ''}
              </p>
            ) : (
              <button onClick={() => setShowMed(v => !v)} className="mt-2 text-[11px] font-bold" style={{ color: accent }}>
                {showMed ? 'Cancel' : '+ Record medical clearance'}
              </button>
            )}
            {showMed && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input className={input} value={med.clearedBy} onChange={e => setMed({ ...med, clearedBy: e.target.value })} placeholder="Cleared by — e.g. Dr A. Patel" />
                  <input className={input} type="date" value={med.clearedOn} onChange={e => setMed({ ...med, clearedOn: e.target.value })} />
                </div>
                <input className={`w-full ${input}`} value={med.note} onChange={e => setMed({ ...med, note: e.target.value })} placeholder="Practical note — e.g. no change-of-direction work for 2 weeks" />
                <button onClick={() => act('clear-medical', med)} disabled={busy}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-[12px] font-bold text-emerald-300 disabled:opacity-50">
                  Record clearance
                </button>
                <p className="text-[10.5px] leading-relaxed text-white/25">
                  Records who cleared the athlete and when. Altus does not store diagnoses or treatment detail — clinical decisions stay with qualified medical staff.
                </p>
              </div>
            )}
          </div>

          {/* Stage ladder */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
            <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">Protocol</p>
            <div className="divide-y divide-white/5">
              {stages.map((st, i) => {
                const done = currentIdx >= 0 && i < currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={st.id} className={`flex items-start gap-3 px-5 py-3 ${isCurrent ? 'bg-white/[0.02]' : ''}`}>
                    <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: done ? 'rgba(52,211,153,0.15)' : isCurrent ? accent + '25' : 'rgba(255,255,255,0.04)',
                        color: done ? '#34d399' : isCurrent ? accent : 'rgba(255,255,255,0.3)',
                        border: `1px solid ${done ? 'rgba(52,211,153,0.4)' : isCurrent ? accent + '60' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      {done ? '✓' : st.stage_order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12.5px] font-semibold ${isCurrent ? 'text-white' : done ? 'text-white/45' : 'text-white/35'}`}>{st.name}</p>
                      {isCurrent && st.description && <p className="mt-0.5 text-[11px] text-white/40">{st.description}</p>}
                      {isCurrent && st.owner_role && <p className="mt-0.5 text-[10.5px] text-white/25">Owner: {st.owner_role}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Baselines, shown when the current stage requires them */}
          {current?.requires_baseline_tests && baselines.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
              <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
                Against their own baseline
              </p>
              <div className="divide-y divide-white/5">
                {baselines.map(b => {
                  const back = b.latest != null && b.latest <= b.baseline;
                  return (
                    <div key={b.test} className="flex items-center justify-between px-5 py-2.5 text-[12px]">
                      <span className="text-white/70">{b.test}</span>
                      <span className="text-white/35">
                        <b className="text-white/60">{b.baseline}{b.unit}</b> → {' '}
                        <b style={{ color: b.latest == null ? 'rgba(255,255,255,0.3)' : back ? '#34d399' : '#fbbf24' }}>
                          {b.latest ?? 'not retested'}{b.latest != null ? b.unit : ''}
                        </b>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          {next && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button onClick={() => act('advance')} disabled={busy || blockedByMedical}
                  className="rounded-xl px-4 py-2.5 text-[12px] font-bold disabled:opacity-40"
                  style={{ background: accent + '20', border: `1px solid ${accent}55`, color: accent }}>
                  Pass → {next.name}
                </button>
                <button onClick={() => act('fail', { note: 'Did not meet criteria' })} disabled={busy}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-[12px] font-semibold text-white/50 disabled:opacity-50">
                  Not ready
                </button>
              </div>
              {blockedByMedical && (
                <p className="text-[11px] text-amber-300/80">
                  &ldquo;{next.name}&rdquo; requires medical clearance to be recorded first.
                </p>
              )}
            </div>
          )}

          {progress.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
              <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">History</p>
              <div className="divide-y divide-white/5">
                {[...progress].reverse().map((p, i) => (
                  <div key={i} className="flex items-baseline justify-between px-5 py-2 text-[11.5px]">
                    <span className="text-white/60">
                      {p.stage_name} — <span className={p.outcome === 'failed' ? 'text-amber-300/70' : 'text-white/35'}>{p.outcome}</span>
                      {p.note ? <span className="text-white/30"> · {p.note}</span> : null}
                    </span>
                    <span className="shrink-0 text-white/25">
                      {new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
