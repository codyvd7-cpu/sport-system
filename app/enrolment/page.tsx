'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { getSportColor, type SportKey } from '@/lib/sports';
import { useToast } from '@/components/Toast';

// New players who self-registered and are waiting to be placed in a team.
// A coach sees only their sport's (and, if team-scoped, age-matched) pending
// pool, with a clearance flag but never medical detail.

type Pending = {
  id: string; full_name: string; age_group: string | null; grade: string | null;
  sport: string; position: string | null; height_cm: number | null; weight_kg: number | null;
  date_of_birth: string | null; clearance: string | null;
};

export default function EnrolmentPage() {
  const { showToast } = useToast();
  const { sport, teams, canSeeAllTeams } = useRole();
  const color = getSportColor((sport || 'hockey') as SportKey);

  const [pending, setPending] = React.useState<Pending[]>([]);
  const [assignable, setAssignable] = React.useState<string[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const auth = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/coach/enrolment', { headers: await auth() });
      const d = await res.json();
      if (res.ok) { setPending(d.pending || []); setAssignable(d.assignableTeams); }
    } catch { /* ignore */ }
    setLoading(false);
  }, [auth]);

  React.useEffect(() => { load(); }, [load]);

  async function place(athleteId: string, team: string) {
    setBusy(athleteId);
    try {
      const res = await fetch('/api/coach/enrolment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await auth()) },
        body: JSON.stringify({ athleteId, team }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || 'Could not assign'); setBusy(null); return; }
      setPending(p => p.filter(a => a.id !== athleteId));
      showToast(`Added to ${team}`);
    } catch { showToast('Could not assign'); }
    setBusy(null);
  }

  // Team options: a team coach's own teams, else all teams their school runs.
  const teamOptions = assignable && assignable.length ? assignable
    : canSeeAllTeams ? [] : teams;

  return (
    <main className="min-h-screen pb-24 text-white md:pb-0" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <header className="mb-7">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.35em]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {sport ? sport[0].toUpperCase() + sport.slice(1) : 'Sport'}
          </p>
          <h1 className="text-4xl font-black leading-none tracking-tight">New players</h1>
          <p className="mt-2 text-sm text-white/40">Players who signed up and are waiting to be added to a team.</p>
        </header>

        {loading && <p className="py-10 text-center text-sm text-white/30">Loading…</p>}

        {!loading && pending.length === 0 && (
          <div className="rounded-2xl border border-white/8 p-10 text-center">
            <p className="text-sm text-white/40">No one waiting right now.</p>
            <p className="mt-1 text-xs text-white/25">New sign-ups for your sport will appear here.</p>
          </div>
        )}

        <div className="space-y-3">
          {pending.map(a => (
            <div key={a.id} className="rounded-2xl border border-white/8 p-4"
              style={{ background: 'rgba(255,255,255,0.015)' }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <p className="text-[15px] font-bold">{a.full_name}</p>
                    {a.clearance && a.clearance !== 'cleared' && (
                      <span className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                        style={{ background: 'rgba(251,191,36,0.14)', color: '#fbbf24' }}>
                        {a.clearance === 'see_head' ? 'Medical — see head of sport' : 'Modified'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-white/40">
                    {[a.age_group, a.grade, a.position,
                      a.height_cm ? `${a.height_cm}cm` : null,
                      a.weight_kg ? `${a.weight_kg}kg` : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>

                {/* Assign-to-team control */}
                <div className="shrink-0">
                  {teamOptions.length > 0 ? (
                    <select
                      disabled={busy === a.id}
                      onChange={e => e.target.value && place(a.id, e.target.value)}
                      defaultValue=""
                      className="rounded-lg border border-white/12 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none"
                    >
                      <option value="">Add to team…</option>
                      {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    // School-wide roles type any team name.
                    <input
                      placeholder="Team name, Enter"
                      disabled={busy === a.id}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const v = (e.target as HTMLInputElement).value.trim();
                          if (v) place(a.id, v);
                        }
                      }}
                      className="w-36 rounded-lg border border-white/12 bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm text-white outline-none"
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
