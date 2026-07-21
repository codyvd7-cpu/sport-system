'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

// ─── "Enable alerts" button ─────────────────────────────────────────────────────
// Registers the service worker + push subscription. Works for signed-in players
// (subscription tied to their account) and anonymous portal parents alike.
// iOS note: Apple only allows web push for sites ADDED TO THE HOME SCREEN.

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on' | 'busy';

export default function PushAlerts({ color = '#10b981', compact = false }: { color?: string; compact?: boolean }) {
  const [state, setState] = React.useState<State>('loading');
  const [note, setNote] = React.useState('');

  React.useEffect(() => {
    (async () => {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setState('unsupported'); return;
      }
      if (Notification.permission === 'denied') { setState('denied'); return; }
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          // A subscription already exists in this browser. Re-save it (upsert,
          // so this is always safe/cheap) in case it was previously lost server-
          // side — silently repairs anyone stuck showing ON with nothing saved.
          const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
          fetch('/api/push/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
            body: JSON.stringify({ subscription: sub.toJSON(), label: session ? 'player' : 'portal' }),
          }).catch(() => {});
        }
        setState(sub ? 'on' : 'off');
      } catch { setState('unsupported'); }
    })();
  }, []);

  async function toggle() {
    if (state === 'busy') return;
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!pub) { setNote('Alerts not configured yet.'); return; }
    setState('busy'); setNote('');
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await fetch('/api/push/subscribe', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint }) });
        await existing.unsubscribe();
        setState('off');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(pub) });
      const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ subscription: sub.toJSON(), label: session ? 'player' : 'portal' }),
      });
      if (!saveRes.ok) {
        // Browser subscribed fine, but the server never got a matching row —
        // previously this showed "ON" anyway with nothing actually saved.
        // Roll the browser subscription back so state stays truthful.
        await sub.unsubscribe().catch(() => {});
        const errBody = await saveRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Could not save your subscription — try again.');
      }
      setState('on');
    } catch (e: any) {
      setNote(e?.message?.includes('applicationServerKey') ? 'Alert keys misconfigured.' : 'Could not enable alerts on this device.');
      setState('off');
    }
  }

  if (state === 'loading') return null;
  if (state === 'unsupported') {
    return compact ? null : <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
      Push alerts aren&apos;t supported in this browser. On iPhone: add this site to your Home Screen first (Share → Add to Home Screen), then enable alerts from there.
    </p>;
  }

  const on = state === 'on';
  return (
    <div>
      <button onClick={toggle} disabled={state === 'busy' || state === 'denied'} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: compact ? 'auto' : '100%',
        padding: compact ? '9px 16px' : '14px 16px', borderRadius: 13, cursor: state === 'denied' ? 'default' : 'pointer',
        border: `1px solid ${on ? `${color}45` : 'rgba(255,255,255,0.1)'}`,
        background: on ? `${color}14` : 'rgba(255,255,255,0.03)',
        color: 'white', textAlign: 'left', opacity: state === 'denied' ? 0.55 : 1,
      }}>
        <span style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: on ? `${color}20` : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {state === 'busy'
            ? <span style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${color}`, borderTopColor: 'transparent', display: 'inline-block', animation: 'spin 0.7s linear infinite' }}/>
            : <svg viewBox="0 0 24 24" fill="none" stroke={on ? color : 'rgba(255,255,255,0.5)'} strokeWidth={1.9} strokeLinecap="round" style={{ width: 16, height: 16 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>
            {state === 'denied' ? 'Alerts blocked in browser settings' : on ? 'Lightning & urgent alerts ON' : 'Enable lightning & urgent alerts'}
          </span>
          {!compact && <span style={{ display: 'block', fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
            {on ? 'This device will be notified the moment an alert goes out.' : 'Get notified instantly if training is suspended for lightning.'}
          </span>}
        </span>
        {on && <span style={{ fontSize: 9, fontWeight: 900, color, letterSpacing: '0.1em' }}>ON</span>}
      </button>
      {note && <p style={{ fontSize: 10.5, color: '#fbbf24', marginTop: 6 }}>{note}</p>}
    </div>
  );
}

function urlB64(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
