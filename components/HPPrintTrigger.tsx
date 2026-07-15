'use client';
import * as React from 'react';

// ─── In-place report printing ────────────────────────────────────────────────
// Loads an /hp-print/* page in a hidden same-origin iframe. The print page
// fires window.print() itself once its data is ready, which opens the print
// dialog over the CURRENT page — no new tab, no navigation.
//
// Usage:
//   const { print, printing } = usePrintReport();
//   <button onClick={() => print(`/hp-print/student/${id}`)}>Export PDF</button>
//   <PrintToast show={printing}/>

export function usePrintReport() {
  const [printing, setPrinting] = React.useState(false);
  const activeRef = React.useRef<HTMLIFrameElement | null>(null);

  const print = React.useCallback((url: string) => {
    if (activeRef.current) return; // one report at a time

    const frame = document.createElement('iframe');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';
    frame.setAttribute('aria-hidden', 'true');
    frame.src = url;

    let done = false;
    const cleanup = () => {
      if (done) return;
      done = true;
      // Small delay so the print dialog fully detaches from the frame first
      setTimeout(() => {
        frame.remove();
        activeRef.current = null;
        setPrinting(false);
      }, 400);
    };

    frame.onload = () => {
      try {
        // Same-origin: hide the toast the moment the dialog opens,
        // and tear the frame down after the dialog closes.
        frame.contentWindow?.addEventListener('beforeprint', () => setPrinting(false));
        frame.contentWindow?.addEventListener('afterprint', cleanup);
      } catch { /* fall through to safety timeout */ }
    };

    // Safety net — never leave a stuck frame/toast (AI reports can take ~20s)
    setTimeout(cleanup, 90_000);

    activeRef.current = frame;
    setPrinting(true);
    document.body.appendChild(frame);
  }, []);

  return { print, printing };
}

export function PrintToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 18px', borderRadius: 12,
      background: 'rgba(13,20,36,0.96)', border: '1px solid rgba(16,185,129,0.35)',
      boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
      backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
    }}>
      <style>{`@keyframes ptSpin{to{transform:rotate(360deg)}}`}</style>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
        border: '2px solid #10b981', borderTopColor: 'transparent',
        animation: 'ptSpin .8s linear infinite',
      }}/>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>
        Preparing report… the print dialog will open here
      </span>
    </div>
  );
}
