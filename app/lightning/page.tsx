'use client';
import * as React from 'react';
import AuthGuard from '@/components/AuthGuard';
import { supabase } from '@/lib/supabase';

// ─── /lightning — the big red button ─────────────────────────────────────────
// Coach hears the school's lightning siren → taps once → red banner across the
// whole platform + push notification to every subscribed device. Memorable URL
// on purpose: altusperformance.co.za/lightning

function LightningInner() {
  const [active, setActive] = React.useState<any>(null);
  const [msg, setMsg] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState('');

  const load = React.useCallback(() => {
    fetch('/api/alerts').then(r => r.json()).then(d => setActive(d.alert || null)).catch(() => {});
  }, []);
  React.useEffect(() => { load(); }, [load]);

  async function post(action: 'activate' | 'clear') {
    setBusy(true); setResult('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ action, message: msg.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setResult(action === 'activate'
        ? `Alert is LIVE — pushed to ${d.pushed} device${d.pushed === 1 ? '' : 's'}.`
        : `All-clear sent to ${d.pushed} device${d.pushed === 1 ? '' : 's'}.`);
      setMsg('');
      load();
    } catch (e: any) { setResult(e.message); }
    setBusy(false);
  }

  return (
    <main style={{ minHeight: '100vh', background: '#060916', color: 'white', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.3em', marginBottom: 6, textAlign: 'center' }}>Emergency Broadcast</p>
        <h1 style={{ fontSize: 30, fontWeight: 900, textAlign: 'center', marginBottom: 26 }}>⚡ Lightning Alert</h1>

        {active ? (
          <div style={{ borderRadius: 20, border: '1px solid rgba(220,38,38,0.5)', background: 'rgba(220,38,38,0.1)', padding: 22, marginBottom: 18 }}>
            <p style={{ fontSize: 10, fontWeight: 900, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>● Alert currently LIVE</p>
            <p style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.6 }}>{active.message}</p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 10 }}>
              Since {new Date(active.created_at).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <button onClick={() => post('clear')} disabled={busy} style={{ marginTop: 16, width: '100%', padding: '15px', borderRadius: 14, border: '1px solid rgba(34,197,94,0.5)', background: 'rgba(34,197,94,0.14)', color: '#22c55e', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
              {busy ? 'Sending…' : '✓ SEND ALL-CLEAR'}
            </button>
          </div>
        ) : (
          <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.02)', padding: 22, marginBottom: 18 }}>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              placeholder="Optional custom message — leave blank for the standard lightning suspension notice"
              style={{ width: '100%', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.3)', color: 'white', padding: '12px 14px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', marginBottom: 14 }}/>
            <button onClick={() => post('activate')} disabled={busy} style={{
              width: '100%', padding: '20px', borderRadius: 16, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #b91c1c, #dc2626)', color: 'white', fontSize: 17, fontWeight: 900, letterSpacing: '0.04em',
              boxShadow: '0 12px 40px rgba(220,38,38,0.45)',
            }}>
              {busy ? 'BROADCASTING…' : '⚡ ACTIVATE LIGHTNING ALERT'}
            </button>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 12, lineHeight: 1.6, textAlign: 'center' }}>
              Instantly shows the red banner on every portal page and sends a push notification to every subscribed phone.
            </p>
          </div>
        )}

        {result && <p style={{ textAlign: 'center', fontSize: 12.5, fontWeight: 700, color: result.includes('LIVE') ? '#f87171' : '#22c55e' }}>{result}</p>}
      </div>
    </main>
  );
}

export default function LightningPage() {
  return <AuthGuard requiredRoles={['owner', 'head_of_sport']}><LightningInner/></AuthGuard>;
}
