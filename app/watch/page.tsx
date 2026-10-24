'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fmtTime12h } from '@/lib/format';

// ─── /watch ───────────────────────────────────────────────────────────────────
// The glance. One screen, one thing: the next thing this athlete needs to know,
// in type big enough to read at arm's length — a wrist, a lock screen, a phone
// held up across a field. It is what the "you're selected" push opens into, and
// it stands alone as a home-screen shortcut.
//
// Deliberately austere: no nav, no tabs, no scrolling for the common case. It
// picks the single most relevant item and shows only that, with the full
// profile one tap away.

type Row = Record<string, any>;
const fd = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s).toLocaleDateString('en-ZA', o);
const fTime = (t?: string) => fmtTime12h(t);

export default function WatchPage() {
  const [data, setData] = React.useState<Row | null>(null);
  const [state, setState] = React.useState<'loading' | 'signedout' | 'noprofile' | 'ready'>('loading');

  const load = React.useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setState('signedout'); return; }
    try {
      const res = await fetch('/api/player/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ action: 'get' }),
      });
      const d = await res.json();
      if (!d || !d.profile) { setState('noprofile'); return; }
      setData(d); setState('ready');
    } catch { /* keep last good data */ }
  }, []);

  React.useEffect(() => {
    load();
    // Refresh quietly while the glance is open — a selection can land while
    // the athlete is looking at it.
    const t = setInterval(load, 60_000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  return (
    <main style={{
      minHeight: '100vh', background: '#05070d', color: 'white',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px', textAlign: 'center', fontFamily: 'var(--font-ui)',
    }}>
      <div style={{ position: 'fixed', top: 16, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.35em', color: 'rgba(255,255,255,0.28)' }}>ALTUS</span>
      </div>

      {state === 'loading' && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid var(--accent, #38bdf8)', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
      )}

      {state === 'signedout' && <Glance eyebrow="Altus" big="Sign in" sub="Open your team on the wrist" href="/player/auth" cta="Sign in"/>}
      {state === 'noprofile' && <Glance eyebrow="Altus" big="Set up" sub="Finish your profile to see your fixtures" href="/player/setup" cta="Complete setup"/>}

      {state === 'ready' && data && <Resolved data={data}/>}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
}

// Pick the single most relevant item: a published selection for an upcoming
// fixture first, else the next team fixture, else today's session, else rest.
function Resolved({ data }: { data: Row }) {
  const ath = data.athlete;
  const fixtures: Row[] = data.fixtures || [];
  const selections: Row[] = data.selections || [];
  const weekItems: Row[] = data.weekItems || [];
  const today0 = new Date(); today0.setHours(0, 0, 0, 0);

  const teamFx = ath?.team ? fixtures.filter(f => f.team === ath.team) : fixtures;
  const nextFx = teamFx[0] || null;

  const sel = React.useMemo(() => {
    const rows = selections.map(s => {
      const ts = Array.isArray(s.team_selections) ? s.team_selections[0] : s.team_selections;
      const fx = ts?.fixture_id ? fixtures.find(f => f.id === ts.fixture_id) : null;
      return { s, ts, fx };
    }).filter(x => x.ts);
    rows.sort((a, b) => (a.fx ? +new Date(a.fx.fixture_date) : Infinity) - (b.fx ? +new Date(b.fx.fixture_date) : Infinity));
    return rows.find(x => !x.fx || new Date(x.fx.fixture_date) >= today0) || null;
  }, [selections, fixtures]);

  // 1 — Selected for an upcoming match
  if (sel && sel.fx) {
    const { s, ts, fx } = sel as any;
    const meet = ts.meet_time ? `${fTime(ts.meet_time)}${ts.meet_place ? ` · ${ts.meet_place}` : ''}` : null;
    return (
      <Glance
        eyebrow={`You're selected${s.shirt_number != null ? ` · #${s.shirt_number}` : ''}`}
        accent
        big={`vs ${fx.opponent}`}
        sub={[fx.team, fd(fx.fixture_date, { weekday: 'long', day: 'numeric', month: 'long' }), fx.fixture_time ? fTime(fx.fixture_time) : null].filter(Boolean).join(' · ')}
        extra={meet ? `Meet ${meet}${ts.kit ? ` · ${ts.kit}` : ''}` : (ts.kit || null)}
        href="/player/profile" cta="Open"
      />
    );
  }

  // 2 — Next team fixture
  if (nextFx) {
    const days = Math.max(0, Math.ceil((+new Date(nextFx.fixture_date) - Date.now()) / 86400000));
    return (
      <Glance
        eyebrow={`Next${nextFx.team ? ` · ${nextFx.team}` : ''}`}
        big={`vs ${nextFx.opponent}`}
        sub={[fd(nextFx.fixture_date, { weekday: 'long', day: 'numeric', month: 'long' }), nextFx.fixture_time ? fTime(nextFx.fixture_time) : null, nextFx.venue].filter(Boolean).join(' · ')}
        extra={days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
        href="/player/profile" cta="Open"
      />
    );
  }

  // 3 — Today's session
  const dow = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
  const todaySession = weekItems.find(w => (w.day_label || '').toLowerCase().startsWith(dow));
  if (todaySession) {
    return (
      <Glance
        eyebrow="Today"
        big={todaySession.title || todaySession.description || 'Training'}
        sub={[todaySession.session_time ? String(todaySession.session_time).slice(0, 5) : null, todaySession.venue, todaySession.team].filter(Boolean).join(' · ')}
        href="/player/profile" cta="Open"
      />
    );
  }

  // 4 — Nothing scheduled
  return <Glance eyebrow="All clear" big="Nothing on" sub="No upcoming fixtures or sessions" href="/player/profile" cta="Open app"/>;
}

function Glance({ eyebrow, big, sub, extra, href, cta, accent }: {
  eyebrow: string; big: string; sub?: string; extra?: string | null; href: string; cta: string; accent?: boolean;
}) {
  const col = 'var(--accent, #38bdf8)';
  return (
    <div style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: accent ? col : 'rgba(255,255,255,0.4)' }}>
        {eyebrow}
      </p>
      <h1 style={{
        fontFamily: 'var(--font-display, Georgia, serif)', fontWeight: 600,
        fontSize: 'clamp(30px, 11vw, 54px)', lineHeight: 1.02, letterSpacing: '-0.01em',
        color: 'white', margin: 0,
      }}>
        {big}
      </h1>
      {sub && <p style={{ fontSize: 'clamp(13px, 4.2vw, 17px)', color: 'rgba(255,255,255,0.62)', lineHeight: 1.45, maxWidth: 360 }}>{sub}</p>}
      {extra && (
        <p style={{
          marginTop: 2, fontSize: 'clamp(12px, 3.6vw, 15px)', fontWeight: 700,
          color: col, background: 'color-mix(in srgb, var(--accent, #38bdf8) 14%, transparent)',
          border: '1px solid color-mix(in srgb, var(--accent, #38bdf8) 34%, transparent)',
          borderRadius: 999, padding: '7px 16px',
        }}>
          {extra}
        </p>
      )}
      <Link href={href} style={{
        marginTop: 10, fontSize: 14, fontWeight: 700, color: '#05070d', background: col,
        borderRadius: 12, padding: '12px 26px', textDecoration: 'none',
      }}>
        {cta}
      </Link>
    </div>
  );
}
