'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

// ─── DevelopmentPanel ──────────────────────────────────────────────────────────
// Individual Development Plans on the athlete profile.
//
// The point is the closed loop, shown explicitly on each goal:
//   BASELINE → TARGET → LATEST
// so "is this working?" is answered by measurement, not opinion. A goal with
// no numbers is still allowed (technical and psychological goals often have
// none), but where numbers exist they're front and centre.

type Goal = {
  id: string; category: string; goal: string;
  test_key: string | null; baseline_value: number | null; target_value: number | null;
  latest_value: number | null; unit: string | null;
  intervention: string | null; review_date: string | null;
  status: string; outcome_note: string | null; achieved_at: string | null;
};
type Plan = { id: string; title: string; period: string | null; status: string; created_at: string; goals: Goal[] };

const CATEGORY_TONE: Record<string, string> = {
  physical: '#38bdf8', technical: '#34d399', tactical: '#fbbf24', psychological: '#a78bfa',
};

export default function DevelopmentPanel({ athleteId, accent = '#38bdf8' }: { athleteId: string; accent?: string }) {
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const [showNewPlan, setShowNewPlan] = React.useState(false);
  const [planTitle, setPlanTitle] = React.useState('');
  const [planPeriod, setPlanPeriod] = React.useState('');

  const [goalFor, setGoalFor] = React.useState<string | null>(null);
  const [g, setG] = React.useState({ category: 'physical', goal: '', testKey: '', baselineValue: '', targetValue: '', unit: '', intervention: '', reviewDate: '' });

  const authed = React.useCallback(async (init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Signed out.');
    return fetch('/api/athlete/development', {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(init?.headers || {}) },
    });
  }, []);

  const load = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const res = await fetch(`/api/athlete/development?athleteId=${athleteId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setPlans((await res.json()).plans || []);
    } catch { /* panel simply stays empty */ }
    setLoading(false);
  }, [athleteId]);

  React.useEffect(() => { load(); }, [load]);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await authed({ method: 'POST', body: JSON.stringify({ athleteId, title: planTitle, period: planPeriod }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not create plan.');
      setPlanTitle(''); setPlanPeriod(''); setShowNewPlan(false); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not create plan.'); }
    setBusy(false);
  }

  async function addGoal(planId: string, e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await authed({ method: 'POST', body: JSON.stringify({ planId, ...g }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not add goal.');
      setG({ category: 'physical', goal: '', testKey: '', baselineValue: '', targetValue: '', unit: '', intervention: '', reviewDate: '' });
      setGoalFor(null); await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add goal.'); }
    setBusy(false);
  }

  async function updateGoal(goalId: string, patch: Record<string, unknown>) {
    setBusy(true); setErr('');
    try {
      const res = await authed({ method: 'PATCH', body: JSON.stringify({ goalId, ...patch }) });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not update goal.');
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not update goal.'); }
    setBusy(false);
  }

  if (loading) return <p className="px-1 text-[12px] text-white/30">Loading…</p>;

  const input = 'rounded-xl border border-white/10 bg-[#04060e] px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-white/25';

  return (
    <div className="space-y-4">
      {err && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

      {plans.length === 0 && !showNewPlan && (
        <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-8 text-center">
          <p className="text-[13px] text-white/40">No development plan yet.</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/25">
            A plan turns test results into a development process: set a goal against a measurable baseline, assign an intervention, then retest.
          </p>
          <button onClick={() => setShowNewPlan(true)}
            className="mt-4 rounded-xl px-4 py-2 text-[12px] font-bold"
            style={{ background: accent + '20', border: `1px solid ${accent}55`, color: accent }}>
            Create a plan
          </button>
        </div>
      )}

      {showNewPlan && (
        <form onSubmit={createPlan} className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">New plan</p>
          <input className={`w-full ${input}`} value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="e.g. Speed & Acceleration Focus" required />
          <input className={`w-full ${input}`} value={planPeriod} onChange={e => setPlanPeriod(e.target.value)} placeholder="Period — e.g. Term 3 2026" />
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={busy} className="rounded-xl px-4 py-2 text-[12px] font-bold disabled:opacity-50"
              style={{ background: accent + '20', border: `1px solid ${accent}55`, color: accent }}>Create</button>
            <button type="button" onClick={() => setShowNewPlan(false)} className="rounded-xl border border-white/10 px-4 py-2 text-[12px] text-white/50">Cancel</button>
          </div>
        </form>
      )}

      {plans.map(plan => (
        <div key={plan.id} className="rounded-2xl border border-white/5 bg-white/[0.015] overflow-hidden">
          <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3.5">
            <div>
              <p className="text-[14px] font-bold text-white">{plan.title}</p>
              {plan.period && <p className="text-[11px] text-white/30">{plan.period}</p>}
            </div>
            <button onClick={() => setGoalFor(goalFor === plan.id ? null : plan.id)}
              className="text-[11px] font-bold" style={{ color: accent }}>
              {goalFor === plan.id ? 'Cancel' : '+ Goal'}
            </button>
          </div>

          {goalFor === plan.id && (
            <form onSubmit={e => addGoal(plan.id, e)} className="space-y-2 border-b border-white/5 bg-white/[0.01] p-4">
              <div className="grid grid-cols-2 gap-2">
                <select className={input} value={g.category} onChange={e => setG({ ...g, category: e.target.value })}>
                  <option value="physical">Physical</option>
                  <option value="technical">Technical</option>
                  <option value="tactical">Tactical</option>
                  <option value="psychological">Psychological</option>
                </select>
                <input className={input} value={g.reviewDate} onChange={e => setG({ ...g, reviewDate: e.target.value })} type="date" title="Review date" />
              </div>
              <input className={`w-full ${input}`} value={g.goal} onChange={e => setG({ ...g, goal: e.target.value })} placeholder="Goal — e.g. Improve first-step acceleration" required />
              <div className="grid grid-cols-4 gap-2">
                <input className={input} value={g.testKey} onChange={e => setG({ ...g, testKey: e.target.value })} placeholder="Test" />
                <input className={input} value={g.baselineValue} onChange={e => setG({ ...g, baselineValue: e.target.value })} placeholder="Baseline" />
                <input className={input} value={g.targetValue} onChange={e => setG({ ...g, targetValue: e.target.value })} placeholder="Target" />
                <input className={input} value={g.unit} onChange={e => setG({ ...g, unit: e.target.value })} placeholder="Unit" />
              </div>
              <input className={`w-full ${input}`} value={g.intervention} onChange={e => setG({ ...g, intervention: e.target.value })} placeholder="Intervention — e.g. Acceleration programme assigned" />
              <button type="submit" disabled={busy} className="rounded-xl px-4 py-2 text-[12px] font-bold disabled:opacity-50"
                style={{ background: accent + '20', border: `1px solid ${accent}55`, color: accent }}>Add goal</button>
            </form>
          )}

          {plan.goals.length === 0 ? (
            <p className="px-5 py-5 text-[12px] text-white/25">No goals in this plan yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {plan.goals.map(goal => {
                const tone = CATEGORY_TONE[goal.category] || accent;
                const achieved = goal.status === 'achieved';
                return (
                  <div key={goal.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: achieved ? '#34d399' : tone }} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] font-semibold ${achieved ? 'text-white/45 line-through' : 'text-white'}`}>{goal.goal}</p>
                        <p className="mt-0.5 text-[10.5px] uppercase tracking-wider" style={{ color: tone }}>{goal.category}</p>

                        {(goal.baseline_value != null || goal.target_value != null) && (
                          <div className="mt-2.5 flex items-center gap-4 text-[11px]">
                            <span className="text-white/35">Baseline <b className="text-white/70">{goal.baseline_value ?? '—'}{goal.unit}</b></span>
                            <span className="text-white/20">→</span>
                            <span className="text-white/35">Target <b className="text-white/70">{goal.target_value ?? '—'}{goal.unit}</b></span>
                            <span className="text-white/20">→</span>
                            <span className="text-white/35">Latest <b style={{ color: goal.latest_value != null ? (achieved ? '#34d399' : tone) : 'rgba(255,255,255,0.3)' }}>
                              {goal.latest_value ?? 'not retested'}{goal.latest_value != null ? goal.unit : ''}
                            </b></span>
                          </div>
                        )}

                        {goal.intervention && <p className="mt-2 text-[11px] text-white/40">Intervention: {goal.intervention}</p>}
                        {goal.review_date && !achieved && <p className="mt-1 text-[11px] text-white/30">Review {new Date(goal.review_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>}

                        {!achieved && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <input className={`${input} w-28`} placeholder="Retest value"
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const v = (e.target as HTMLInputElement).value;
                                  if (v) updateGoal(goal.id, { latestValue: v });
                                }
                              }} />
                            <button onClick={() => updateGoal(goal.id, { status: 'achieved' })} disabled={busy}
                              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 disabled:opacity-50">
                              Mark achieved
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {plans.length > 0 && !showNewPlan && (
        <button onClick={() => setShowNewPlan(true)} className="text-[12px] font-bold" style={{ color: accent }}>+ New plan</button>
      )}
    </div>
  );
}
