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
    // Static, not sticky. The portal nav is ALSO sticky at top:0, so two
    // sticky elements stacked at the same offset and this one (z-index 500)
    // sat on top of the nav, hiding the crest and controls. A banner that
    // pushes the page down is also more honest: it cannot be scrolled away
    // and then forgotten while the alert is still live.
    <div role="alert" style={{
      position: 'relative', zIndex: 60,
      background: 'linear-gradient(90deg, #7f1d1d, #b91c1c 30%, #dc2626 50%, #b91c1c 70%, #7f1d1d)',
      borderBottom: '1px solid rgba(255,255,255,0.25)',
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
      animation: 'alertPulse 1.6s ease-in-out infinite',
    }}>
      <style>{`@keyframes alertPulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}`}</style>
      <span style={{ fontSize: 15, flexShrink: 0 }}>⚡</span>
      {/* minWidth:0 lets a long message wrap instead of forcing the row wider
          than the viewport, which was pushing content off a phone screen. */}
      <p style={{
        fontSize: 12.5, fontWeight: 800, color: 'white', letterSpacing: '0.01em',
        textAlign: 'center', lineHeight: 1.4, minWidth: 0, textShadow: '0 1px 3px rgba(0,0,0,0.35)',
      }}>
        {alert.message}
      </p>
      <span style={{ fontSize: 15, flexShrink: 0 }}>⚡</span>
    </div>
  );
}
