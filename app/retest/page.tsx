'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── /retest ──────────────────────────────────────────────────────────────────
// Who is overdue for testing.
//
// Shows the HP battery and coach-side athletes separately, because they
// genuinely are two populations until linked — presenting them as one list
// would imply a completeness the data doesn't have. The linkage figure at the
// top makes that split visible rather than hiding it.

type Row = {
  source: 'hp' | 'athlete';
  id: string; athleteId: string | null; name: string; group: string | null;
  lastTested: string | null; daysSince: number | null; reason: string;
  linkedToHp?: boolean;
};
type Data = {
  windowDays: number;
  hp: { overdue: Row[]; total: number; population: number };
  athletes: { overdue: Row[]; total: number; population: number };
  linkage: { hpLinked: number; hpTotal: number };
};

const WINDOWS = [30, 60, 90, 180];

export default function RetestPage() {
  const [data, setData] = React.useState<Data | null>(null);
  const [days, setDays] = React.useState(90);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState('');

  const load = React.useCallback(async (d: number) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErr('Sign in as staff to view this.'); setLoading(false); return; }
      const res = await fetch(`/api/coach/retest?days=${d}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Could not load.');
      setData(await res.json()); setErr('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load.'); }
    setLoading(false);
  }, []);

  React.useEffect(() => { load(days); }, [days, load]);

  const list = (title: string, rows: Row[], total: number, population: number, linkTo: (r: Row) => string | null) => (
    <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
      <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/35">{title}</p>
        <p className="text-[11px] text-white/30">
          <b className="text-white/60">{total}</b> of {population} overdue
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-[12px] text-white/30">Nobody overdue in this window.</p>
      ) : (
        <div className="divide-y divide-white/5">
          {rows.map(r => {
            const href = linkTo(r);
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-semibold text-white">{r.name}</p>
                  <p className="truncate text-[10.5px] text-white/30">
                    {r.group ? `${r.group} · ` : ''}{r.reason}
                  </p>
                </div>
                <span className="shrink-0 text-[11px]" style={{ color: r.daysSince == null ? '#f87171' : r.daysSince > 180 ? '#fb923c' : 'rgba(255,255,255,0.3)' }}>
                  {r.daysSince == null ? 'never' : `${r.daysSince}d`}
                </span>
              </>
            );
            return href ? (
              <Link key={`${r.source}-${r.id}`} href={href} className="flex items-center gap-3 px-5 py-2.5 transition hover:bg-white/[0.03]">
                {inner}
              </Link>
            ) : (
              <div key={`${r.source}-${r.id}`} className="flex items-center gap-3 px-5 py-2.5">{inner}</div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="text-[12px] text-white/35 hover:text-white/60">← Dashboard</Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Retest due</h1>
        <p className="mt-1.5 max-w-xl text-[12.5px] leading-relaxed text-white/40">
          Anyone without a recorded test result in the selected window. A plain rule, not a prediction —
          adjust the window if it doesn&apos;t match how your department tests.
        </p>

        <div className="mt-5 flex gap-1.5">
          {WINDOWS.map(w => (
            <button key={w} onClick={() => setDays(w)}
              className="rounded-xl px-3.5 py-2 text-[12px] font-semibold transition"
              style={{
                background: days === w ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${days === w ? 'rgba(56,189,248,0.4)' : 'rgba(255,255,255,0.07)'}`,
                color: days === w ? '#7dd3fc' : 'rgba(255,255,255,0.4)',
              }}>
              {w} days
            </button>
          ))}
        </div>

        {err && <p className="mt-4 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

        {loading ? (
          <p className="mt-8 text-center text-[12px] text-white/30">Loading…</p>
        ) : data ? (
          <div className="mt-5 space-y-4">
            {data.linkage.hpTotal > 0 && data.linkage.hpLinked < data.linkage.hpTotal && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-3.5">
                <p className="text-[12px] text-amber-200/90">
                  {data.linkage.hpLinked} of {data.linkage.hpTotal} HP students are linked to athlete records.
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                  Unlinked students appear in both lists below as separate people, so these counts overlap.
                </p>
                <Link href="/hp/link" className="mt-1.5 inline-block text-[11.5px] font-bold text-sky-400">Link records →</Link>
              </div>
            )}

            {list('HP testing battery', data.hp.overdue, data.hp.total, data.hp.population,
              r => (r.athleteId ? `/athletes/${r.athleteId}` : null))}

            {list('Team athletes', data.athletes.overdue, data.athletes.total, data.athletes.population,
              r => `/athletes/${r.id}`)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
