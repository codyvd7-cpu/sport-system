'use client';
import * as React from 'react';

// Global red banner — polls /api/alerts and takes over the top of every page
// while a lightning (or other urgent) alert is active.

export default function UrgentAlertBanner() {
  const [alert, setAlert] = React.useState<{ id: string; message: string; created_at: string } | null>(null);

  React.useEffect(() => {
    let stop = false;
    const load = () => fetch('/api/alerts').then(r => r.json()).then(d => { if (!stop) setAlert(d.alert || null); }).catch(() => {});
    load();
    const iv = setInterval(load, 45_000);
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { stop = true; clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  if (!alert) return null;
  return (
    <div role="alert" style={{
      position: 'sticky', top: 0, zIndex: 500,
      background: 'linear-gradient(90deg, #7f1d1d, #b91c1c 30%, #dc2626 50%, #b91c1c 70%, #7f1d1d)',
      borderBottom: '1px solid rgba(255,255,255,0.25)',
      boxShadow: '0 6px 26px rgba(220,38,38,0.5)',
      padding: '11px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      animation: 'alertPulse 1.6s ease-in-out infinite',
    }}>
      <style>{`@keyframes alertPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.22)}}`}</style>
      <span style={{ fontSize: 17, flexShrink: 0 }}>⚡</span>
      <p style={{ fontSize: 13, fontWeight: 900, color: 'white', letterSpacing: '0.02em', textAlign: 'center', lineHeight: 1.45, textShadow: '0 1px 3px rgba(0,0,0,0.35)' }}>
        {alert.message}
      </p>
      <span style={{ fontSize: 17, flexShrink: 0 }}>⚡</span>
    </div>
  );
}
