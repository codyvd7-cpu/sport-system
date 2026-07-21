'use client';
import * as React from 'react';
import jsQR from 'jsqr';

// In-profile QR scanner — opens the camera, finds the gym QR, extracts the
// check-in token (works on the raw token or the full /player/checkin?t= URL)
// and hands it back. Falls back gracefully when camera access is denied.

export default function QrScanModal({ onToken, onClose, C }: {
  onToken: (token: string) => void;
  onClose: () => void;
  C: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        const scan = () => {
          if (stopped) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth; canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (code?.data) {
              // Accept the full URL from the poster, or a bare token
              const m = code.data.match(/[?&]t=([^&\s]+)/);
              const token = m ? decodeURIComponent(m[1]) : code.data.trim();
              if (token.startsWith('v1.')) { stopped = true; onToken(token); return; }
            }
          }
          raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch (e: any) {
        const name = e?.name || '';
        setErr(
          name === 'NotAllowedError' ? 'Camera permission was denied. Check your browser\u2019s site settings and allow Camera for this site, then try again.'
          : name === 'NotFoundError' ? 'No camera found on this device.'
          : name === 'NotReadableError' ? 'Camera is already in use by another app — close it and try again.'
          : name === 'SecurityError' ? 'Camera blocked — this page must be loaded over https://.'
          : 'Camera access was blocked. Allow camera permission, or scan the poster with your phone camera app instead.'
        );
      }
    }
    start();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [onToken]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(3,6,14,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 380, borderRadius: 22, overflow: 'hidden', border: `1px solid ${C}35`, background: '#0a1120', boxShadow: '0 40px 90px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 900, color: 'white' }}>Scan to Check In</p>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Point at the gym QR poster</p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ width: 28, height: 28, borderRadius: 9, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700 }}>×</button>
        </div>
        <div style={{ position: 'relative', aspectRatio: '1', background: '#000' }}>
          {err ? (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 26, textAlign: 'center' }}>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>{err}</p>
            </div>
          ) : (
            <>
              <video ref={videoRef} playsInline muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}/>
              {/* Scan frame */}
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <div style={{ width: '62%', aspectRatio: '1', position: 'relative' }}>
                  {[
                    { top: 0, left: 0, borderTop: `3px solid ${C}`, borderLeft: `3px solid ${C}`, borderTopLeftRadius: 14 },
                    { top: 0, right: 0, borderTop: `3px solid ${C}`, borderRight: `3px solid ${C}`, borderTopRightRadius: 14 },
                    { bottom: 0, left: 0, borderBottom: `3px solid ${C}`, borderLeft: `3px solid ${C}`, borderBottomLeftRadius: 14 },
                    { bottom: 0, right: 0, borderBottom: `3px solid ${C}`, borderRight: `3px solid ${C}`, borderBottomRightRadius: 14 },
                  ].map((s, i) => <div key={i} style={{ position: 'absolute', width: 30, height: 30, ...s } as React.CSSProperties}/>)}
                  <div style={{ position: 'absolute', left: 6, right: 6, height: 2, background: `linear-gradient(90deg, transparent, ${C}, transparent)`, animation: 'scanline 1.8s ease-in-out infinite', boxShadow: `0 0 12px ${C}` }}/>
                </div>
              </div>
              <style>{`@keyframes scanline{0%,100%{top:8%}50%{top:88%}}`}</style>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
