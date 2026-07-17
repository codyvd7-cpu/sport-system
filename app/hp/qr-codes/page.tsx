'use client';
import * as React from 'react';
import QRCode from 'qrcode';

// ─── /hp/qr-codes — print QR check-in posters ─────────────────────────────────
// Coaches generate a poster per venue (Gym, Astro, Pool…). The QR encodes a
// signed URL, so players can scan it with the phone camera OR the in-profile
// scanner. Tokens are static per venue — print once, laminate, done.

const PRESETS = ['Gym', 'Astro', 'Pool', 'Field'];

export default function QrCodesPage() {
  const [venue, setVenue] = React.useState('Gym');
  const [custom, setCustom] = React.useState('');
  const [qr, setQr] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [err, setErr] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const activeVenue = custom.trim() || venue;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setErr(''); setQr('');
      try {
        const r = await fetch(`/api/player/checkin?make=${encodeURIComponent(activeVenue)}`, { credentials: 'include' });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not generate code');
        if (cancelled) return;
        setUrl(d.url);
        const dataUrl = await QRCode.toDataURL(d.url, { width: 640, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
        if (!cancelled) setQr(dataUrl);
      } catch (e: any) { if (!cancelled) setErr(e.message); }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [activeVenue]);

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{ background: '#060c1a' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-sheet { position: fixed; inset: 0; background: white !important; display: flex !important; }
          main { background: white !important; }
        }
      `}</style>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <div className="no-print mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{ color: 'rgba(16,185,129,0.7)' }}>High Performance</p>
          <h1 className="text-4xl font-black tracking-tight leading-none">Check-In QR Posters</h1>
          <p className="mt-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Players scan these to log gym sessions in their own training log. Print, laminate, stick on the wall.
          </p>
        </div>

        <div className="no-print mb-6 flex flex-wrap items-center gap-2">
          {PRESETS.map(v => (
            <button key={v} onClick={() => { setVenue(v); setCustom(''); }}
              className="rounded-xl border px-4 py-2 text-[12px] font-black transition"
              style={{
                borderColor: activeVenue === v ? 'rgba(16,185,129,0.5)' : 'rgba(255,255,255,0.1)',
                background: activeVenue === v ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.03)',
                color: activeVenue === v ? '#10b981' : 'rgba(255,255,255,0.45)',
              }}>{v}</button>
          ))}
          <input value={custom} onChange={e => setCustom(e.target.value)} placeholder="Custom venue…"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-500"/>
        </div>

        {err && <p className="no-print mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12.5px] text-red-300">{err}</p>}

        {/* The poster */}
        <div className="print-sheet mx-auto flex max-w-md flex-col items-center rounded-3xl bg-white p-10 text-center" style={{ color: '#0f172a' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/st-benedicts-logo.png" alt="SBC" style={{ width: 56, height: 56, objectFit: 'contain', marginBottom: 10 }}/>
          <p style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.04em' }}>ST BENEDICT&apos;S COLLEGE</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.16em', marginTop: 2 }}>Altus Performance</p>
          <h2 style={{ fontSize: 30, fontWeight: 900, marginTop: 18, letterSpacing: '-0.01em' }}>{activeVenue} Check-In</h2>
          <p style={{ fontSize: 12.5, color: '#475569', marginTop: 6, lineHeight: 1.6, maxWidth: 280 }}>
            Scan with your phone camera or the scanner in your Altus profile to log today&apos;s session.
          </p>
          <div style={{ marginTop: 20, padding: 14, borderRadius: 20, border: '2px solid #e2e8f0' }}>
            {loading || !qr ? (
              <div style={{ width: 256, height: 256, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 13 }}>Generating…</div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qr} alt={`${activeVenue} check-in QR`} style={{ width: 256, height: 256, display: 'block' }}/>
            )}
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 16 }}>One check-in per day counts toward your streak</p>
        </div>

        <div className="no-print mt-6 flex justify-center gap-3">
          <button onClick={() => window.print()} disabled={!qr}
            className="rounded-xl border border-emerald-500 bg-emerald-500/15 px-6 py-2.5 text-[13px] font-black text-emerald-300 disabled:opacity-40">
            Print Poster
          </button>
          {url && <button onClick={() => navigator.clipboard?.writeText(url)}
            className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 text-[13px] font-bold text-slate-300">
            Copy Link
          </button>}
        </div>
      </div>
    </main>
  );
}
