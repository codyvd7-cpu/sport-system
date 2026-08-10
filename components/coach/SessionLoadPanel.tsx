'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

// ─── SessionLoadPanel ──────────────────────────────────────────────────────────
// Squad-wide session RPE capture.
//
// Placed alongside the register because that's when it actually gets done —
// immediately after a session, on a phone, beside the field. Asking a coach to
// navigate elsewhere afterwards means it never happens.
//
// Duration is set once for the whole session; each athlete just gets an RPE
// tap. That's one tap per athlete, which is the difference between this being
// used daily and abandoned in week two.
//
// Deliberately shows the raw load figure (RPE × minutes) rather than a
// "readiness" or "risk" score — the underlying data doesn't support those
// claims, and presenting them would be inventing certainty.

// The dashboard's squad rows are loosely typed (Record<string, any>), so this
// accepts that and reads the two fields it needs defensively rather than
// pretending a stricter contract exists.
type Athlete = Record<string, unknown>;

const idOf = (a: Athlete) => String(a.id ?? '');
const nameOf = (a: Athlete) => String(a.full_name ?? a.name ?? 'Athlete');

const RPE_SCALE = [
  { v: 1, label: 'Very easy' }, { v: 2, label: 'Easy' }, { v: 3, label: 'Moderate' },
  { v: 4, label: 'Somewhat hard' }, { v: 5, label: 'Hard' }, { v: 6, label: 'Hard+' },
  { v: 7, label: 'Very hard' }, { v: 8, label: 'Very hard+' }, { v: 9, label: 'Near max' },
  { v: 10, label: 'Maximal' },
];

function rpeColour(v: number) {
  if (v <= 3) return '#34d399';
  if (v <= 6) return '#fbbf24';
  if (v <= 8) return '#fb923c';
  return '#f87171';
}

export default function SessionLoadPanel({
  squad, sessionType = 'Training', accent = '#38bdf8',
}: { squad: Athlete[]; sessionType?: string; accent?: string }) {
  const [duration, setDuration] = React.useState('90');
  const [rpes, setRpes] = React.useState<Record<string, number>>({});
  const [saving, setSaving] = React.useState(false);
  const [savedCount, setSavedCount] = React.useState(0);
  const [err, setErr] = React.useState('');

  const durationNum = Number(duration) || 0;
  const entered = Object.keys(rpes).length;

  async function saveAll() {
    if (!durationNum || entered === 0) return;
    setSaving(true); setErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Signed out.');
      let ok = 0;
      // Sequential rather than parallel: a squad is small, and this keeps the
      // failure mode simple — a partial save is obvious rather than silent.
      for (const [athleteId, rpe] of Object.entries(rpes)) {
        const res = await fetch('/api/athlete/load', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ athleteId, rpe, durationMin: durationNum, sessionType }),
        });
        if (res.ok) ok++;
      }
      setSavedCount(ok);
      if (ok < entered) setErr(`Saved ${ok} of ${entered}. Try again for the rest.`);
      else setRpes({});
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.');
    }
    setSaving(false);
  }

  if (squad.length === 0) {
    return <p className="px-1 py-6 text-center text-[12px] text-white/30">No athletes in this squad.</p>;
  }

  return (
    <div className="space-y-4">
      {err && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}
      {savedCount > 0 && !err && (
        <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-[12px] text-emerald-300">
          Saved for {savedCount} athlete{savedCount === 1 ? '' : 's'}.
        </p>
      )}

      {/* Duration once for the whole session */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <span className="text-[11px] font-bold uppercase tracking-widest text-white/35">Session length</span>
        <input value={duration} onChange={e => setDuration(e.target.value)} type="number" inputMode="numeric"
          className="w-20 rounded-xl border border-white/10 bg-[#04060e] px-3 py-1.5 text-[13px] text-white outline-none focus:border-white/25" />
        <span className="text-[12px] text-white/40">minutes</span>
      </div>

      {/* One row per athlete, one tap each */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
        <div className="divide-y divide-white/5">
          {squad.map(a => {
            const aid = idOf(a);
            const v = rpes[aid];
            return (
              <div key={aid} className="px-4 py-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-[13px] font-semibold text-white">{nameOf(a)}</p>
                  {v != null && (
                    <p className="text-[11px]" style={{ color: rpeColour(v) }}>
                      RPE {v} · {v * durationNum} AU
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  {RPE_SCALE.map(r => (
                    <button key={r.v}
                      onClick={() => setRpes(p => (p[aid] === r.v ? (({ [aid]: _drop, ...rest }) => rest)(p) : { ...p, [aid]: r.v }))}
                      title={r.label}
                      className="h-8 flex-1 rounded-lg text-[11px] font-bold transition"
                      style={{
                        background: v === r.v ? rpeColour(r.v) + '30' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${v === r.v ? rpeColour(r.v) + '80' : 'rgba(255,255,255,0.06)'}`,
                        color: v === r.v ? rpeColour(r.v) : 'rgba(255,255,255,0.3)',
                      }}>
                      {r.v}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={saveAll} disabled={saving || entered === 0 || !durationNum}
          className="flex-1 rounded-xl py-3 text-[13px] font-bold disabled:opacity-40"
          style={{ background: accent + '20', border: `1px solid ${accent}55`, color: accent }}>
          {saving ? 'Saving…' : `Save ${entered || ''} ${entered === 1 ? 'entry' : 'entries'}`.trim()}
        </button>
      </div>

      <p className="text-center text-[10.5px] leading-relaxed text-white/25">
        Load is RPE × session minutes, in arbitrary units. It is a record of what was done,
        not a readiness or injury-risk measure.
      </p>
    </div>
  );
}
