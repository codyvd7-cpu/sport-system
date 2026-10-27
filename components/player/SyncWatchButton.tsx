'use client';
import * as React from 'react';
import { isNativeApp, syncHealth } from '@/lib/altus-native';
import { supabase } from '@/lib/supabase';

// "Sync my watch" — only appears inside the Altus app (a browser can't read a
// phone's health store). When there's no data yet it's a full connect prompt;
// once the athlete has synced it's a slim re-sync link under the load card.
export default function SyncWatchButton({ C, hasData }: { C: string; hasData: boolean }) {
  const [native, setNative] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'syncing' | 'error'>('idle');
  const [msg, setMsg] = React.useState('');

  React.useEffect(() => { setNative(isNativeApp()); }, []);
  if (!native) return null;

  async function run() {
    setStatus('syncing'); setMsg('');
    const getToken = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    };
    const r = await syncHealth(getToken);
    if ('error' in r) { setStatus('error'); setMsg(r.error); return; }
    setMsg(`Synced ${r.imported} session${r.imported === 1 ? '' : 's'}`);
    // Reload so the Training Load card picks up the new sessions.
    setTimeout(() => window.location.reload(), 800);
  }

  const B = 'rgba(255,255,255,0.08)';

  // Slim re-sync when data already exists.
  if (hasData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: -4 }}>
        <button onClick={run} disabled={status === 'syncing'} style={{
          fontSize: 11.5, fontWeight: 700, color: C, background: `${C}14`, border: `1px solid ${C}33`,
          borderRadius: 10, padding: '7px 14px', cursor: 'pointer',
        }}>
          {status === 'syncing' ? 'Syncing…' : 'Sync my watch'}
        </button>
        {msg && <span style={{ fontSize: 11, color: status === 'error' ? '#f87171' : 'rgba(255,255,255,0.4)' }}>{msg}</span>}
      </div>
    );
  }

  // Full connect prompt when there's nothing yet.
  return (
    <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.035)', border: `1px solid ${B}`, padding: 20, textAlign: 'center' }}>
      <p style={{ fontSize: 28, marginBottom: 8 }}>⌚</p>
      <p style={{ fontSize: 14.5, fontWeight: 800, color: 'white', marginBottom: 4 }}>Connect your watch</p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, maxWidth: 300, margin: '0 auto 14px' }}>
        Pull your recent training from Apple Health or Google Health so your coach can see your load.
      </p>
      <button onClick={run} disabled={status === 'syncing'} style={{
        fontSize: 13, fontWeight: 800, color: '#05070d', background: C, border: 'none',
        borderRadius: 12, padding: '11px 24px', cursor: 'pointer',
      }}>
        {status === 'syncing' ? 'Syncing…' : 'Sync my watch'}
      </button>
      {msg && <p style={{ fontSize: 11.5, color: status === 'error' ? '#f87171' : 'rgba(255,255,255,0.4)', marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
