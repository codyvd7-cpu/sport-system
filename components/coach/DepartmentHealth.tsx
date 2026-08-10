'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// ─── DepartmentHealth ──────────────────────────────────────────────────────────
// Department health for a Head of Sport, as separate components rather than a
// single score.
//
// Each component shows its status and the evidence behind it — "62% · 148 of
// 240 athletes tested in the last 90 days", not "Department Health: 74". A
// composite number would hide precisely what a head of sport needs to act on,
// and imply a precision that averaging attendance with injury counts doesn't
// have.

type Component = {
  key: string; label: string; value: string;
  status: 'good' | 'watch' | 'attention';
  reason: string; href: string;
};
type TeamRow = {
  team: string; squad: number; attendance: number | null;
  unavailable: number; tested: number; openCases: number;
};
type Data = {
  squadSize: number;
  components: Component[];
  teams: TeamRow[];
  linkage: { hpLinked: number; hpTotal: number };
};

const TONE = {
  good:      { dot: '#34d399', text: 'rgba(255,255,255,0.9)' },
  watch:     { dot: '#fbbf24', text: 'rgba(255,255,255,0.9)' },
  attention: { dot: '#f87171', text: '#fca5a5' },
};

export default function DepartmentHealth() {
  const [data, setData] = React.useState<Data | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { setLoading(false); return; }
        const res = await fetch('/api/coach/department', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) setData(await res.json());
      } catch { /* the rest of the overview still renders */ }
      if (!stop) setLoading(false);
    })();
    return () => { stop = true; };
  }, []);

  if (loading || !data || data.squadSize === 0) return null;

  const needsAttention = data.components.filter(c => c.status === 'attention');

  return (
    <div className="space-y-4">
      {/* Components */}
      <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
        <div className="flex items-baseline justify-between border-b border-white/5 px-5 py-3">
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/35">Department health</p>
          {needsAttention.length > 0 && (
            <p className="text-[11px]" style={{ color: '#fca5a5' }}>
              {needsAttention.length} need{needsAttention.length === 1 ? 's' : ''} attention
            </p>
          )}
        </div>

        <div className="divide-y divide-white/5">
          {data.components.map(c => {
            const tone = TONE[c.status];
            return (
              <Link key={c.key} href={c.href}
                className="flex items-center gap-3 px-5 py-3 transition hover:bg-white/[0.03]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone.dot }} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold" style={{ color: tone.text }}>{c.label}</p>
                  <p className="truncate text-[10.5px] text-white/30">{c.reason}</p>
                </div>
                <span className="shrink-0 text-[15px] font-black" style={{ color: tone.dot }}>{c.value}</span>
              </Link>
            );
          })}
        </div>

        <p className="border-t border-white/5 px-5 py-2.5 text-[10px] leading-relaxed text-white/20">
          Reported as separate measures on purpose. A single combined score would hide which area is actually slipping.
        </p>
      </div>

      {/* Per-team */}
      {data.teams.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
          <p className="border-b border-white/5 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-white/35">
            By team
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px]">
              <thead>
                <tr className="text-left text-white/25">
                  <th className="px-5 py-2 font-medium">Team</th>
                  <th className="px-3 py-2 text-right font-medium">Squad</th>
                  <th className="px-3 py-2 text-right font-medium">Att.</th>
                  <th className="px-3 py-2 text-right font-medium">Tested</th>
                  <th className="px-5 py-2 text-right font-medium">Out</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.teams.map(t => (
                  <tr key={t.team}>
                    <td className="px-5 py-2.5 font-semibold text-white/85">{t.team}</td>
                    <td className="px-3 py-2.5 text-right text-white/45">{t.squad}</td>
                    <td className="px-3 py-2.5 text-right"
                      style={{ color: t.attendance == null ? 'rgba(255,255,255,0.2)' : t.attendance < 70 ? '#f87171' : t.attendance < 85 ? '#fbbf24' : 'rgba(255,255,255,0.6)' }}>
                      {t.attendance == null ? '—' : `${t.attendance}%`}
                    </td>
                    <td className="px-3 py-2.5 text-right text-white/45">{t.tested}/{t.squad}</td>
                    <td className="px-5 py-2.5 text-right"
                      style={{ color: t.unavailable > 0 ? '#fca5a5' : 'rgba(255,255,255,0.2)' }}>
                      {t.unavailable || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.linkage.hpTotal > 0 && data.linkage.hpLinked < data.linkage.hpTotal && (
        <Link href="/hp/link"
          className="block rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-5 py-3 transition hover:bg-amber-500/[0.1]">
          <p className="text-[12px] text-amber-200/90">
            {data.linkage.hpTotal - data.linkage.hpLinked} HP students not linked to athlete records
          </p>
          <p className="mt-0.5 text-[10.5px] text-white/30">
            Testing coverage above may understate reality until they&apos;re linked →
          </p>
        </Link>
      )}
    </div>
  );
}
