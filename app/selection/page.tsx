'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { getSportColor, type SportKey } from '@/lib/sports';
import { useToast } from '@/components/Toast';

// ─── Team Selection ────────────────────────────────────────────────────────────
// Picking a side for a fixture — the ritual the app was missing. Fixtures
// recorded that a match exists and attendance recorded who trained, but
// nothing recorded WHO IS PLAYING, the question every player and parent asks.
//
// Design: a team sheet, not a dashboard. The coach picks a fixture, then works
// down a squad list moving players into the side. Availability and recent
// attendance sit inline as CONSEQUENCE — an injured player can't be selected,
// a patchy trainer is flagged — so the register the coach takes finally has a
// use. The one bold element is the live "picked / to go" count; everything
// else stays quiet. Nothing here reaches a player until the coach publishes.

type Row = Record<string, any>;
type Fixture = { id: string; team: string; opponent: string; fixture_date: string; fixture_time: string | null; venue: string | null; home_away: string | null; sport: string };
type SquadMember = {
  id: string; full_name: string; position: string | null; team: string;
  availability: string | null; flag: string | null; selectable: boolean;
  attendedRecent: number | null; sessionsRecent: number | null;
};

export default function SelectionPage() {
  const { showToast } = useToast();
  const { sport } = useRole();
  const color = getSportColor((sport || 'hockey') as SportKey);

  const [fixtures, setFixtures] = React.useState<Fixture[]>([]);
  const [fixtureId, setFixtureId] = React.useState('');
  const [squad, setSquad] = React.useState<SquadMember[]>([]);
  const [picked, setPicked] = React.useState<Record<string, 'starting' | 'bench'>>({});
  const [logistics, setLogistics] = React.useState({ meetTime: '', meetPlace: '', kit: '', transport: '', notes: '' });
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [status, setStatus] = React.useState<'draft' | 'published' | null>(null);

  const authHeader = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session ? { Authorization: `Bearer ${session.access_token}` } : {};
  }, []);

  // Upcoming fixtures to pick from.
  React.useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from('portal_fixtures')
        .select('id,team,opponent,fixture_date,fixture_time,venue,home_away,sport')
        .gte('fixture_date', today).order('fixture_date').limit(40);
      setFixtures((data as Fixture[]) || []);
    })();
  }, []);

  // Load the squad + any existing selection for the chosen fixture.
  React.useEffect(() => {
    if (!fixtureId) { setSquad([]); setPicked({}); setStatus(null); return; }
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/coach/selection?fixtureId=${fixtureId}`, { headers: await authHeader() });
        const d = await res.json();
        if (!res.ok) { showToast(d.error || 'Could not load squad'); setLoading(false); return; }
        setSquad(d.squad || []);
        const p: Record<string, 'starting' | 'bench'> = {};
        for (const row of (d.picked || [])) {
          if (row.role === 'starting' || row.role === 'bench') p[row.athlete_id] = row.role;
        }
        setPicked(p);
        setStatus(d.selection?.status ?? null);
        if (d.selection) {
          setLogistics({
            meetTime: d.selection.meet_time?.slice(0, 5) || '',
            meetPlace: d.selection.meet_place || '', kit: d.selection.kit || '',
            transport: d.selection.transport || '', notes: d.selection.notes || '',
          });
        } else {
          setLogistics({ meetTime: '', meetPlace: '', kit: '', transport: '', notes: '' });
        }
      } catch { showToast('Could not load squad'); }
      setLoading(false);
    })();
  }, [fixtureId, authHeader, showToast]);

  const fixture = fixtures.find(f => f.id === fixtureId);
  const startingCount = Object.values(picked).filter(r => r === 'starting').length;
  const benchCount = Object.values(picked).filter(r => r === 'bench').length;

  function cycle(id: string, selectable: boolean) {
    if (!selectable) return;
    setPicked(prev => {
      const cur = prev[id];
      const next = { ...prev };
      if (!cur) next[id] = 'starting';
      else if (cur === 'starting') next[id] = 'bench';
      else delete next[id];
      return next;
    });
  }

  async function save(publish: boolean) {
    if (!fixtureId) return;
    setSaving(true);
    try {
      const players = Object.entries(picked).map(([athleteId, role]) => ({ athleteId, role }));
      const res = await fetch('/api/coach/selection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ fixtureId, publish, players, ...logistics }),
      });
      const d = await res.json();
      if (!res.ok) { showToast(d.error || 'Could not save'); setSaving(false); return; }
      setStatus(publish ? 'published' : 'draft');
      showToast(publish ? 'Team published — players can now see it' : 'Saved as draft');
    } catch { showToast('Could not save'); }
    setSaving(false);
  }

  const fDate = (d: string) => new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <main className="min-h-screen pb-24 text-white md:pb-0" style={{ background: 'var(--bg)' }}>
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">

        <header className="mb-7">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {sport ? sport[0].toUpperCase() + sport.slice(1) : 'Sport'}
          </p>
          <h1 className="text-4xl font-black tracking-tight leading-none">Team selection</h1>
          <p className="mt-2 text-sm text-white/40">Pick a side for a fixture. Nothing is visible to players until you publish.</p>
        </header>

        {/* Fixture picker */}
        <div className="mb-6">
          <select
            value={fixtureId}
            onChange={e => setFixtureId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-3.5 text-sm text-white outline-none focus:border-white/30"
          >
            <option value="">Choose a fixture…</option>
            {fixtures.map(f => (
              <option key={f.id} value={f.id}>
                {f.team} vs {f.opponent} — {fDate(f.fixture_date)}{f.fixture_time ? ` ${f.fixture_time.slice(0, 5)}` : ''}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="py-10 text-center text-sm text-white/30">Loading squad…</p>}

        {!loading && fixture && (
          <>
            {/* The one bold element: the live count and the fixture it's for. */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4 rounded-2xl border p-5"
              style={{ borderColor: `${color}33`, background: `linear-gradient(135deg, ${color}14, rgba(255,255,255,0.01))` }}>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color }}>{fixture.team}</p>
                <p className="mt-1 text-2xl font-black leading-none">vs {fixture.opponent}</p>
                <p className="mt-2 text-xs text-white/40">
                  {fDate(fixture.fixture_date)}{fixture.fixture_time ? ` · ${fixture.fixture_time.slice(0, 5)}` : ''}
                  {fixture.venue ? ` · ${fixture.venue}` : ''}{fixture.home_away ? ` · ${fixture.home_away.toUpperCase()}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-5 text-center">
                <div><p className="text-3xl font-black tabular-nums" style={{ color }}>{startingCount}</p><p className="text-[10px] uppercase tracking-wider text-white/35">Starting</p></div>
                <div><p className="text-3xl font-black tabular-nums text-white/70">{benchCount}</p><p className="text-[10px] uppercase tracking-wider text-white/35">Bench</p></div>
                {status && (
                  <div className="ml-1 rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ background: status === 'published' ? `${color}22` : 'rgba(255,255,255,0.06)', color: status === 'published' ? color : 'rgba(255,255,255,0.5)' }}>
                    {status}
                  </div>
                )}
              </div>
            </div>

            {/* Squad — tap a player to cycle Starting → Bench → out. Availability
                and attendance are shown so the register has consequence. */}
            <div className="overflow-hidden rounded-2xl border border-white/8">
              {squad.length === 0 && <p className="p-8 text-center text-sm text-white/30">No athletes in this team yet.</p>}
              {squad.map((a, i) => {
                const role = picked[a.id];
                const surname = a.full_name.split(' ').slice(-1)[0];
                return (
                  <button
                    key={a.id}
                    onClick={() => cycle(a.id, a.selectable)}
                    disabled={!a.selectable}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition disabled:cursor-not-allowed"
                    style={{
                      borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                      background: role ? `${color}0f` : 'transparent',
                      opacity: a.selectable ? 1 : 0.55,
                    }}
                  >
                    {/* Role marker doubles as the tap target's state. */}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-black"
                      style={{
                        background: role === 'starting' ? color : role === 'bench' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
                        color: role === 'starting' ? '#03060c' : role === 'bench' ? 'white' : 'rgba(255,255,255,0.3)',
                        border: role ? 'none' : '1px solid rgba(255,255,255,0.1)',
                      }}>
                      {role === 'starting' ? 'XI' : role === 'bench' ? 'SUB' : '+'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {a.full_name}
                        {a.position && <span className="ml-2 text-xs font-normal text-white/35">{a.position}</span>}
                      </p>
                      {a.flag ? (
                        <p className="mt-0.5 text-[11px]" style={{ color: a.selectable ? 'rgba(255,255,255,0.4)' : '#fca5a5' }}>{a.flag}</p>
                      ) : a.sessionsRecent ? (
                        <p className="mt-0.5 text-[11px] text-white/30">{a.attendedRecent}/{a.sessionsRecent} at training</p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Logistics — the WhatsApp details, captured once. */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([['meetTime', 'Meet time', 'time'], ['meetPlace', 'Meet place', 'text'], ['kit', 'Kit', 'text'], ['transport', 'Transport', 'text']] as const).map(([k, label, type]) => (
                <div key={k}>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-white/30">{label}</label>
                  <input type={type} value={(logistics as any)[k]}
                    onChange={e => setLogistics(l => ({ ...l, [k]: e.target.value }))}
                    className="w-full rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-white outline-none focus:border-white/25" />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => save(true)} disabled={saving || startingCount === 0}
                className="rounded-xl px-6 py-3 text-sm font-bold disabled:opacity-40"
                style={{ background: color, color: '#03060c' }}>
                {saving ? 'Saving…' : status === 'published' ? 'Update published team' : 'Publish team'}
              </button>
              <button onClick={() => save(false)} disabled={saving}
                className="rounded-xl border border-white/12 px-6 py-3 text-sm font-semibold text-white/70 disabled:opacity-40">
                Save draft
              </button>
              {startingCount === 0 && <p className="self-center text-xs text-white/30">Pick at least one player to publish.</p>}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
