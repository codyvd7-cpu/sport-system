'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// ─── MyAthleteCard ─────────────────────────────────────────────────────────────
// The bridge between the shared portal and a family's own information.
//
// The portal is deliberately open — fixtures, results, notices, nothing
// personal. But until now there was no route at all from there to your own
// child, so a parent could see Saturday's kick-off and had no idea the app
// also held their daughter's attendance, test results and coach feedback.
//
// Three states, because a parent arrives in one of exactly three situations:
//   1. Not signed in           → explain what an account gets you
//   2. Signed in, not linked   → point them at claiming their child
//   3. Signed in and approved  → take them straight to the athlete
//
// It never shows personal data itself; it's a doorway, not a dashboard.

type LinkState =
  | { state: 'loading' }
  | { state: 'anonymous' }
  | { state: 'pending' }
  | { state: 'unlinked' }
  | { state: 'linked'; athleteName: string; athleteId: string };

export default function MyAthleteCard() {
  const { branding } = useBranding();
  const [s, setS] = React.useState<LinkState>({ state: 'loading' });
  // The prompt is useful once, not on every visit. Dismissal is remembered
  // per device — a parent who has already signed in elsewhere, or who simply
  // isn't interested, shouldn't be asked again each time they check a fixture.
  const [dismissed, setDismissed] = React.useState(false);
  React.useEffect(() => {
    try { setDismissed(localStorage.getItem('altus_hide_signin_prompt') === '1'); } catch {}
  }, []);
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('altus_hide_signin_prompt', '1'); } catch {}
  };

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { if (!stop) setS({ state: 'anonymous' }); return; }

        const res = await fetch('/api/player/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'status' }),
        });
        if (!res.ok) { if (!stop) setS({ state: 'anonymous' }); return; }
        const d = await res.json();

        if (stop) return;
        if (d.athlete?.id) setS({ state: 'linked', athleteName: d.athlete.full_name, athleteId: d.athlete.id });
        else if (d.claimPending) setS({ state: 'pending' });
        else setS({ state: 'unlinked' });
      } catch {
        if (!stop) setS({ state: 'anonymous' });
      }
    })();
    return () => { stop = true; };
  }, []);

  if (s.state === 'loading') return null;

  const accent = branding.primaryColor;
  const shell: React.CSSProperties = {
    borderRadius: 16,
    border: `1px solid ${accent}33`,
    background: `${accent}0d`,
    padding: '20px 22px',
  };

  if (s.state === 'linked') {
    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.32)' }}>
          Your athlete
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 19, fontWeight: 900, color: 'white' }}>{s.athleteName}</p>
        <p style={{ margin: '4px 0 14px', fontSize: 12.5, color: 'rgba(255,255,255,0.42)' }}>
          Attendance, test results, training and coach feedback
        </p>
        <Link href="/player/profile"
          style={{
            display: 'inline-block', padding: '11px 20px', borderRadius: 12,
            background: `${accent}22`, border: `1px solid ${accent}66`,
            color: accent, fontSize: 13, fontWeight: 800, textDecoration: 'none',
          }}>
          Open profile →
        </Link>
      </div>
    );
  }

  if (s.state === 'pending') {
    return (
      <div style={{ ...shell, borderColor: 'rgba(251,191,36,0.3)', background: 'rgba(251,191,36,0.06)' }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: '#fcd34d' }}>Waiting for approval</p>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)' }}>
          A coach is confirming your request. You&apos;ll see attendance, results and feedback as soon as
          they&apos;ve approved it — usually within a day or two.
        </p>
      </div>
    );
  }

  if (s.state === 'unlinked') {
    return (
      <div style={shell}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 800, color: 'white' }}>Connect to your athlete</p>
        <p style={{ margin: '6px 0 14px', fontSize: 12.5, lineHeight: 1.55, color: 'rgba(255,255,255,0.45)' }}>
          Tell us who your child is and a coach will confirm it. Then you&apos;ll see their attendance,
          test results and feedback here.
        </p>
        <Link href="/player/setup"
          style={{
            display: 'inline-block', padding: '11px 20px', borderRadius: 12,
            background: `${accent}22`, border: `1px solid ${accent}66`,
            color: accent, fontSize: 13, fontWeight: 800, textDecoration: 'none',
          }}>
          Find your athlete →
        </Link>
      </div>
    );
  }

  // Anonymous — the common case. Now a single quiet line rather than a full
  // panel: it used to sit high on the page as a large card with two buttons,
  // which made the portal open with an ask. The information here is genuinely
  // secondary to the fixtures, so it reads as a footnote.
  if (dismissed) return null;

  return (
    <div style={{
      display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
      borderRadius:14, border:'1px solid rgba(255,255,255,0.07)',
      borderLeft:`2px solid ${accent}`,
      background:'rgba(255,255,255,0.022)', padding:'14px 16px',
    }}>
      <div style={{ minWidth:0, flex:1 }}>
        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.88)' }}>
          Parents &amp; players — see your own results
        </p>
        <p style={{ margin:'3px 0 0', fontSize:11.5, lineHeight:1.5, color:'rgba(255,255,255,0.38)' }}>
          Attendance, testing and coach feedback are private to each athlete.
        </p>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
        <Link href="/player/auth" style={{
          padding:'9px 18px', borderRadius:10,
          background:`${accent}1f`, border:`1px solid ${accent}55`,
          color:accent, fontSize:12.5, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap',
        }}>
          Sign in
        </Link>
        <button onClick={dismiss} aria-label="Dismiss"
          style={{
            width:30, height:30, borderRadius:8, flexShrink:0,
            border:'1px solid rgba(255,255,255,0.09)', background:'transparent',
            color:'rgba(255,255,255,0.3)', fontSize:15, lineHeight:1, cursor:'pointer',
          }}>
          ×
        </button>
      </div>
    </div>
  );
}
