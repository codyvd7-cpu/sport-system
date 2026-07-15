'use client';
import * as React from 'react';

type Row = Record<string, any>;
interface Props { reminders: Row[]; color: string; sport: string; }

// Compact department-notice card shown at the top of the portal.
// Dismissible — the dismissal is remembered per sport, keyed to the newest
// reminder, so the card automatically reappears when a NEW notice is published.
export default function NoticeCard({ reminders, color, sport }: Props) {
  const [dismissed, setDismissed] = React.useState(true); // start hidden to avoid flash
  const [expanded, setExpanded]   = React.useState(false);

  // Newest reminder identifies "the current batch" of notices
  const latestKey = React.useMemo(() => {
    if (!reminders.length) return null;
    const newest = [...reminders].sort((a, b) =>
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    )[0];
    return String(newest.created_at || newest.id || reminders.length);
  }, [reminders]);

  React.useEffect(() => {
    if (!latestKey) return;
    try {
      const seen = localStorage.getItem(`ap_notice_seen_${sport}`);
      setDismissed(seen === latestKey);
    } catch { setDismissed(false); }
  }, [latestKey, sport]);

  function dismiss() {
    setDismissed(true);
    try { if (latestKey) localStorage.setItem(`ap_notice_seen_${sport}`, latestKey); } catch {}
  }

  if (!reminders.length || dismissed || !latestKey) return null;

  const primary = reminders[0];
  const rest    = reminders.slice(1);

  return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '16px 24px 0', position: 'relative', zIndex: 5 }}>
      <div style={{
        borderRadius: 16,
        border: `1px solid ${color}30`,
        background: `linear-gradient(150deg, ${color}14, rgba(255,255,255,0.02))`,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        boxShadow: `0 10px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)`,
        overflow: 'hidden',
      }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:13, padding:'14px 16px' }}>
          {/* Bell */}
          <div style={{ width:34, height:34, borderRadius:10, background:`${color}22`, border:`1px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={{ width:15, height:15 }}>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>

          {/* Content */}
          <div style={{ flex:1, minWidth:0, paddingTop:1 }}>
            <p style={{ fontSize:9.5, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.18em', marginBottom:3 }}>
              Department Notice
            </p>
            <p style={{ fontSize:13.5, fontWeight:700, color:'rgba(255,255,255,0.92)', lineHeight:1.5 }}>
              {primary.message || primary.title}
            </p>
            {primary.subtitle && (
              <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.45)', marginTop:2 }}>{primary.subtitle}</p>
            )}

            {/* More notices toggle */}
            {rest.length > 0 && (
              <button onClick={() => setExpanded(e => !e)} style={{
                marginTop:8, background:'none', border:'none', cursor:'pointer', padding:0,
                fontSize:11.5, fontWeight:800, color, display:'flex', alignItems:'center', gap:5,
              }}>
                {expanded ? 'Show less' : `+${rest.length} more ${rest.length === 1 ? 'notice' : 'notices'}`}
                <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}
                  style={{ width:11, height:11, transform: expanded ? 'rotate(180deg)' : 'none', transition:'transform .2s' }}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            )}

            {expanded && rest.length > 0 && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8, borderTop:'1px solid rgba(255,255,255,0.07)', paddingTop:10 }}>
                {rest.map((r, i) => (
                  <div key={r.id || i} style={{ display:'flex', gap:9, alignItems:'flex-start' }}>
                    <span style={{ width:5, height:5, borderRadius:'50%', background:color, flexShrink:0, marginTop:6 }}/>
                    <div>
                      <p style={{ fontSize:12.5, fontWeight:600, color:'rgba(255,255,255,0.8)', lineHeight:1.5 }}>{r.message || r.title}</p>
                      {r.subtitle && <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:1 }}>{r.subtitle}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss */}
          <button onClick={dismiss} aria-label="Dismiss notice" style={{
            width:28, height:28, borderRadius:8, border:'1px solid rgba(255,255,255,0.1)',
            background:'rgba(255,255,255,0.05)', cursor:'pointer', flexShrink:0,
            display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} style={{ width:12, height:12 }}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
