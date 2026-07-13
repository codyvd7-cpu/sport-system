'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function PlayerCodeEntry() {
  const router  = useRouter();
  const [code,  setCode]  = React.useState('');
  const [error, setError] = React.useState('');
  const [busy,  setBusy]  = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true); setError('');
    const res = await fetch(`/api/player/check?code=${encodeURIComponent(c)}`, { credentials:'include' });
    if (res.ok) {
      const d = await res.json();
      if (d.exists) router.push(`/player/${c}`);
      else { setError('Player code not found. Check your card and try again.'); setBusy(false); }
    } else {
      setError('Could not verify code. Please try again.'); setBusy(false);
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#040810', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px', color:'white' }}>
      <div style={{ width:'100%', maxWidth:380 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Image src="/altus-icon.png" alt="Altus" width={52} height={52} style={{ objectFit:'contain', marginBottom:16 }}/>
          <p style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.25em', marginBottom:6 }}>Player Access</p>
          <h1 style={{ fontSize:22, fontWeight:900, letterSpacing:'-0.01em', marginBottom:4 }}>Enter your player code</h1>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', lineHeight:1.5 }}>Your unique code is printed on your player card or issued by your coach.</p>
        </div>

        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="e.g. BHK-0042"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            maxLength={12}
            style={{
              width:'100%', boxSizing:'border-box',
              background:'rgba(255,255,255,0.06)',
              border:`1px solid ${error ? '#f87171' : 'rgba(255,255,255,0.12)'}`,
              borderRadius:12, padding:'14px 16px',
              color:'white', fontSize:18, fontWeight:700,
              letterSpacing:'0.12em', textAlign:'center',
              outline:'none', fontFamily:'monospace',
            }}
          />
          {error && <p style={{ fontSize:12, color:'#f87171', textAlign:'center' }}>{error}</p>}
          <button type="submit" disabled={busy || !code.trim()} style={{
            padding:'14px', borderRadius:12, border:'none',
            background: '#38bdf8', color:'#040810',
            fontWeight:800, fontSize:14, cursor:'pointer',
            opacity: busy || !code.trim() ? 0.5 : 1, transition:'opacity .15s',
          }}>
            {busy ? 'Checking…' : 'View My Profile →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:24, fontSize:12, color:'rgba(255,255,255,0.2)' }}>
          Don't have a code? Ask your coach.
        </p>
      </div>
    </div>
  );
}
