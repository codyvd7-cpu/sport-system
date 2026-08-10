'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── HPResultsPanel ────────────────────────────────────────────────────────────
// Shows an athlete's high-performance testing battery on their athlete profile
// — the payoff of linking HP student records to athlete records.
//
// Each test shows its tier, and the direction of travel against the previous
// term. Direction respects whether lower is better (a faster sprint time is a
// smaller number), which is easy to get backwards and has been a real bug here
// before.

type TestRow = {
  key: string; label: string; unit: string; category?: string;
  value: number | null; formatted: string | null;
  term?: string; date?: string | null;
  tier: { label: string; color: string } | null;
  previous: { value: number; formatted: string; term: string } | null;
  direction: 'improved' | 'declined' | 'unchanged' | null;
};
type Data = {
  linked: boolean;
  student?: { name: string; grade: string; classGroup: string };
  tests?: TestRow[];
  counts?: { tested: number; total: number; sessions: number };
  lastTested?: string | null;
};

export default function HPResultsPanel({ athleteId }: { athleteId: string }) {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch(`/api/athlete/hp-results?athleteId=${athleteId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) setData(await res.json());
      } catch { /* panel simply doesn't render */ }
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, [athleteId]);

  if (loading || !data) return null;

  // Not linked — say so plainly and offer the fix, rather than showing nothing
  if (!data.linked) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
        <p className="text-[12.5px] text-white/45">No high-performance testing linked to this athlete.</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/25">
          If they take part in HP testing, linking their records shows the full battery here.
        </p>
        <Link href="/hp/link" className="mt-2.5 inline-block text-[11.5px] font-bold text-sky-400">
          Link records →
        </Link>
      </div>
    );
  }

  const tested = (data.tests || []).filter(t => t.value != null);
  if (tested.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-white/[0.015] p-5">
        <p className="text-[12.5px] text-white/45">
          Linked to <b className="text-white/70">{data.student?.name}</b> — no test results recorded yet.
        </p>
      </div>
    );
  }

  const arrow = (d: TestRow['direction']) =>
    d === 'improved' ? { s: '↑', c: '#34d399' } :
    d === 'declined' ? { s: '↓', c: '#f87171' } :
    d === 'unchanged' ? { s: '→', c: 'rgba(255,255,255,0.3)' } : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-white/[0.015]">
      <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3">
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/35">HP Testing Battery</p>
        <p className="text-[10.5px] text-white/25">
          {data.student?.grade}
          {data.lastTested ? ` · last ${new Date(data.lastTested).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}` : ''}
        </p>
      </div>

      <div className="divide-y divide-white/5">
        {tested.map(t => {
          const a = arrow(t.direction);
          return (
            <div key={t.key} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-white">{t.label}</p>
                <p className="text-[10.5px] text-white/30">
                  {t.term}
                  {t.previous ? ` · was ${t.previous.formatted} (${t.previous.term})` : ' · first result'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="flex items-center justify-end gap-1.5 text-[13px] font-bold text-white">
                  {a && <span style={{ color: a.c }}>{a.s}</span>}
                  {t.formatted}
                </p>
                {t.tier && (
                  <span className="mt-0.5 inline-block rounded-full px-2 py-0.5 text-[9.5px] font-bold"
                    style={{ background: t.tier.color + '22', color: t.tier.color }}>
                    {t.tier.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="border-t border-white/5 px-5 py-2.5 text-[10.5px] text-white/25">
        {data.counts?.tested} of {data.counts?.total} tests recorded · {data.counts?.sessions} testing session{data.counts?.sessions === 1 ? '' : 's'}
      </p>
    </div>
  );
}
