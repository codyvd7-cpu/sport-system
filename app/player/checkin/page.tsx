'use client';
import * as React from 'react';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

// Landing page for scanning the gym QR with the normal phone camera.
// The QR encodes /player/checkin?t=<token> — signed-in players are checked
// in automatically; signed-out ones get a login link (token survives in URL).

function CheckinInner() {
  const params = useSearchParams();
  const token = params.get('t') || '';
  const [state, setState] = React.useState<'working'|'done'|'already'|'signin'|'error'>('working');
  const [msg, setMsg] = React.useState('');
  const [venue, setVenue] = React.useState('');

  React.useEffect(() => {
    (async () => {
      if (!token) { setState('error'); setMsg('No check-in code found in this link.'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setState('signin'); return; }
      try {
        const r = await fetch('/api/player/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ token }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Check-in failed');
        setVenue(d.venue || 'Gym');
        setState(d.already ? 'already' : 'done');
      } catch (e: any) { setState('error'); setMsg(e.message); }
    })();
  }, [token]);

  const C = '#10b981';
  return (
    <main style={{ minHeight: '100vh', background: '#060916', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pop{0%{transform:scale(0.4);opacity:0}60%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes ripple{from{transform:scale(0.6);opacity:0.6}to{transform:scale(1.9);opacity:0}}
      `}</style>
      <div style={{ textAlign: 'center', maxWidth: 340 }}>
        {state === 'working' && (
          <>
            <div style={{ width: 30, height: 30, borderRadius: '50%', border: `3px solid ${C}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}/>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Checking you in…</p>
          </>
        )}
        {(state === 'done' || state === 'already') && (
          <>
            <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 20px' }}>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${C}`, animation: 'ripple 1.2s ease-out 0.15s' }}/>
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `${C}1c`, border: `2px solid ${C}`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'pop 0.5s cubic-bezier(0.16,1,0.3,1) both', boxShadow: `0 0 40px ${C}50` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ width: 42, height: 42 }}><path d="M20 6L9 17l-5-5"/></svg>
              </div>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 8 }}>{state === 'done' ? 'Checked in!' : 'Already logged ✓'}</h1>
            <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              {state === 'done'
                ? `${venue} session logged for today. Keep the streak alive.`
                : `You already checked in at ${venue} today — it's on your log.`}
            </p>
            <Link href="/player/profile" style={{ display: 'inline-block', marginTop: 20, padding: '12px 26px', borderRadius: 12, background: `${C}1a`, border: `1px solid ${C}50`, color: C, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>
              View my training log →
            </Link>
          </>
        )}
        {state === 'signin' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10 }}>Almost there</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 18 }}>Sign in to your player account, then scan the poster again to log this session.</p>
            <Link href="/player/auth" style={{ display: 'inline-block', padding: '12px 26px', borderRadius: 12, background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Sign In</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <h1 style={{ fontSize: 20, fontWeight: 900, marginBottom: 10, color: '#f87171' }}>Check-in failed</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{msg}</p>
            <Link href="/player/profile" style={{ display: 'inline-block', marginTop: 18, fontSize: 13, fontWeight: 800, color: '#38bdf8', textDecoration: 'none' }}>Back to profile →</Link>
          </>
        )}
      </div>
    </main>
  );
}

export default function CheckinPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#060916' }}/>}><CheckinInner/></Suspense>;
}
