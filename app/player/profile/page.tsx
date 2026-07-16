'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GRADE8_TESTS, GRADE9_TESTS, TIERS, fmtValue, fmtValueWithUnit, TERM_ORDER, type TestKey } from '@/lib/hpTests';
import { getSportColor, getSportLabel } from '@/lib/sports';

type Row = Record<string, any>;

const BG = '#050814', SIDE = '#03050e', CARD = 'rgba(255,255,255,0.035)', B = 'rgba(255,255,255,0.08)';

const NAV = [
  { id: 'overview', l: 'Overview',       i: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id: 'schedule', l: 'Schedule',       i: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id: 'perf',     l: 'Performance',    i: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id: 'att',      l: 'Attendance',     i: 'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { id: 'programs', l: 'Programs',       i: 'M18 20V10M12 20V4M6 20v-6' },
  { id: 'feedback', l: 'Coach Feedback', i: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { id: 'notices',  l: 'Notices',        i: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0' },
  { id: 'settings', l: 'Settings',       i: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
];

const CATEGORIES: { label: string; keys: string[] }[] = [
  { label: 'Speed',     keys: ['sprint_10m', 'sprint_30m'] },
  { label: 'Power',     keys: ['broad_jump', 'triple_broad_jump'] },
  { label: 'Strength',  keys: ['chin_up_hang', 'pushup_2min'] },
  { label: 'Endurance', keys: ['run_500m'] },
];

const fd = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s).toLocaleDateString('en-ZA', o);
function ago(s: string) { const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); if (d <= 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d / 7)}w ago`; return `${Math.floor(d / 30)}mo ago`; }
function fTime(t?: string) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); if (isNaN(hr)) return t; return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`; }
function outcome(score?: string) { const p = (score || '').split(/[-–]/).map(x => parseInt(x.trim())); if (p.length !== 2 || p.some(isNaN)) return null; return p[0] > p[1] ? 'WIN' : p[0] < p[1] ? 'LOSS' : 'DRAW'; }
const OUT_COL: Record<string, string> = { WIN: '#22c55e', LOSS: '#f87171', DRAW: '#fbbf24' };

// ─── hooks ───────────────────────────────────────────────────────────────────
function useCountUp(target: number, dur = 1000) {
  const [v, setV] = React.useState(0);
  React.useEffect(() => {
    let start: number | null = null, raf = 0;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

// ─── micro-components ────────────────────────────────────────────────────────
function Ic({ d, sz = 16, col = 'currentColor', sw = 1.8 }: { d: string; sz?: number; col?: string; sw?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ width: sz, height: sz, flexShrink: 0 }}>{d.split(' M').map((s, i) => <path key={i} d={i === 0 ? s : 'M' + s} />)}</svg>;
}
function TierBadge({ label }: { label: string }) {
  const t = TIERS.find(x => x.label === label) || TIERS[2];
  return <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, padding: '2.5px 9px', borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{t.label}</span>;
}
function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return <div className={className} style={{ borderRadius: 18, background: CARD, border: `1px solid ${B}`, padding: 20, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', ...style }}>{children}</div>;
}
function SecHead({ label, right }: { label: string; right?: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
    <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.38)', textTransform: 'uppercase', letterSpacing: '0.16em' }}>{label}</p>
    {right}
  </div>;
}
function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '44px 24px', textAlign: 'center' }}>
    <Ic d={icon} sz={34} col="rgba(255,255,255,0.1)"/>
    <div><p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 5 }}>{title}</p>
    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6, maxWidth: 280 }}>{body}</p></div>
  </div>;
}
function ChangeChip({ change }: { change: string | null }) {
  if (!change) return null;
  const cfg = change === 'improved'
    ? { t: '▲ Meaningful improvement', c: '#10b981', bg: 'rgba(16,185,129,0.1)', bd: 'rgba(16,185,129,0.3)' }
    : change === 'declined'
    ? { t: '▼ Meaningful dip', c: '#f87171', bg: 'rgba(248,113,113,0.08)', bd: 'rgba(248,113,113,0.25)' }
    : { t: '≈ Holding steady', c: 'rgba(255,255,255,0.45)', bg: 'rgba(255,255,255,0.04)', bd: 'rgba(255,255,255,0.12)' };
  return <span style={{ fontSize: 9.5, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: cfg.bg, color: cfg.c, border: `1px solid ${cfg.bd}`, whiteSpace: 'nowrap' }}>{cfg.t}</span>;
}

// Animated percentile ring
function Ring({ pct, col, sz = 54 }: { pct: number; col: string; sz?: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
    <svg width={sz} height={sz} viewBox="0 0 54 54" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={27} cy={27} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={4.5}/>
      <circle cx={27} cy={27} r={r} fill="none" stroke={col} strokeWidth={4.5} strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} style={{ filter: `drop-shadow(0 0 4px ${col}70)`, transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)' }}/>
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 13, fontWeight: 900, lineHeight: 1 }}>{pct}</span>
      <span style={{ fontSize: 6.5, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>PCT</span>
    </div>
  </div>;
}

// ─── RADAR — the centrepiece ─────────────────────────────────────────────────
function Radar({ cats, C, size = 250 }: { cats: { label: string; pct: number }[]; C: string; size?: number }) {
  const [drawn, setDrawn] = React.useState(false);
  React.useEffect(() => { const t = setTimeout(() => setDrawn(true), 150); return () => clearTimeout(t); }, []);
  const n = cats.length;
  const cx = size / 2, cy = size / 2, R = size * 0.34;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, frac: number) => `${cx + Math.cos(angle(i)) * R * frac},${cy + Math.sin(angle(i)) * R * frac}`;
  const poly = cats.map((c, i) => pt(i, drawn ? Math.max(0.06, c.pct / 100) : 0.06)).join(' ');
  const gid = React.useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`rg-${gid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C} stopOpacity="0.55"/>
          <stop offset="100%" stopColor={C} stopOpacity="0.12"/>
        </linearGradient>
        <filter id={`glow-${gid}`}><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      {[0.25, 0.5, 0.75, 1].map(f => (
        <polygon key={f} points={cats.map((_, i) => pt(i, f)).join(' ')} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1}/>
      ))}
      {cats.map((_, i) => <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(angle(i)) * R} y2={cy + Math.sin(angle(i)) * R} stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>)}
      <polygon points={poly} fill={`url(#rg-${gid})`} stroke={C} strokeWidth={2.2} strokeLinejoin="round"
        filter={`url(#glow-${gid})`} style={{ transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1)' }}/>
      {cats.map((c, i) => {
        const frac = drawn ? Math.max(0.06, c.pct / 100) : 0.06;
        const x = cx + Math.cos(angle(i)) * R * frac, y = cy + Math.sin(angle(i)) * R * frac;
        return <circle key={i} cx={x} cy={y} r={3.4} fill={C} style={{ filter: `drop-shadow(0 0 5px ${C})`, transition: 'all 1.1s cubic-bezier(0.16,1,0.3,1)' }}/>;
      })}
      {cats.map((c, i) => {
        const lx = cx + Math.cos(angle(i)) * (R + 26), ly = cy + Math.sin(angle(i)) * (R + 26);
        return <g key={i} textAnchor="middle">
          <text x={lx} y={ly - 4} fill="rgba(255,255,255,0.55)" fontSize={9.5} fontWeight={800} letterSpacing="0.1em" style={{ textTransform: 'uppercase' }}>{c.label.toUpperCase()}</text>
          <text x={lx} y={ly + 10} fill={C} fontSize={12.5} fontWeight={900}>{c.pct}</text>
        </g>;
      })}
    </svg>
  );
}

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ D, C, radarCats, onPhoto, uploading }: any) {
  const { profile: P, athlete: ath, hpStudent } = D;
  const ini = (P.full_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const prim = ((P.sports || [])[0] || 'hockey').toLowerCase();
  const fileRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="rise" style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', border: `1px solid ${C}28`, background: `linear-gradient(150deg, ${C}16 0%, rgba(255,255,255,0.015) 45%, ${C}08 100%)`, marginBottom: 16 }}>
      {/* Specular top edge + ambient inner glow */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${C}80 50%, transparent)` }}/>
      <div style={{ position: 'absolute', top: -120, left: -60, width: 340, height: 340, borderRadius: '50%', background: `radial-gradient(circle, ${C}22, transparent 65%)`, pointerEvents: 'none' }}/>

      <div className="hero-inner" style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 26, padding: '26px 28px', flexWrap: 'wrap' }}>
        {/* Avatar with rotating conic ring + camera upload */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div className="avatar-ring" style={{ position: 'absolute', inset: -5, borderRadius: '50%', background: `conic-gradient(from 0deg, ${C}, transparent 30%, ${C}55 55%, transparent 80%, ${C})`, filter: 'blur(0.5px)' }}/>
          <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', background: BG }}/>
          {ath?.photo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={ath.photo_url} alt={P.full_name} style={{ position: 'relative', width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', display: 'block' }}/>
          ) : (
            <div style={{ position: 'relative', width: 104, height: 104, borderRadius: '50%', background: `linear-gradient(135deg,#111c3d,${C}55)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 900 }}>{ini}</div>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="Upload photo" style={{ position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: '50%', border: `2px solid ${BG}`, background: C, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 14px ${C}60` }}>
            {uploading
              ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid #04060f', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/>
              : <Ic d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" sz={14} col="#04060f" sw={2.2}/>}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }}/>
        </div>

        {/* Identity */}
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '0.28em', marginBottom: 6 }}>Athlete Profile</p>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.02 }}>{P.full_name}</h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {[getSportLabel(prim), ath?.team, ath?.position, P.grade, hpStudent?.training_group ? `HP Group ${hpStudent.training_group}` : null].filter(Boolean).map((v: string) => (
              <span key={v} style={{ fontSize: 10, fontWeight: 800, padding: '4.5px 12px', borderRadius: 20, background: `${C}14`, color: C, border: `1px solid ${C}30`, letterSpacing: '0.04em' }}>{v}</span>
            ))}
          </div>
          {!ath && (
            <Link href="/player/setup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 13, fontSize: 11.5, fontWeight: 800, color: '#fbbf24', textDecoration: 'none' }}>
              ⚠ Link your athlete record to unlock everything →
            </Link>
          )}
        </div>

        {/* Radar */}
        {radarCats.length >= 3 && (
          <div className="hero-radar" style={{ flexShrink: 0 }}>
            <Radar cats={radarCats} C={C} size={240}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ D, C, attPct, setNav }: any) {
  const { athlete: ath, fixtures, results, reminders, hpInsights, hpStudent } = D;
  const teamFx = ath?.team ? fixtures.filter((f: Row) => f.team === ath.team) : fixtures;
  const nxt = teamFx[0] || fixtures[0] || null;
  const teamRes = ath?.team ? results.filter((r: Row) => r.team === ath.team) : results;
  const wins = teamRes.filter((r: Row) => outcome(r.final_score) === 'WIN').length;
  const draws = teamRes.filter((r: Row) => outcome(r.final_score) === 'DRAW').length;
  const losses = teamRes.filter((r: Row) => outcome(r.final_score) === 'LOSS').length;
  const cAtt = useCountUp(attPct ?? 0);
  const cW = useCountUp(wins), cD = useCountUp(draws), cL = useCountUp(losses);
  const tested = Object.values(hpInsights || {}).filter((v: any) => v.latest !== null).length;
  const cT = useCountUp(tested);
  const bestTests = Object.entries(hpInsights || {})
    .filter(([, v]: any) => v.percentile !== null)
    .sort((a: any, b: any) => b[1].percentile - a[1].percentile).slice(0, 3);
  const allTests = [...GRADE8_TESTS, ...GRADE9_TESTS];
  const daysTo = nxt ? Math.max(0, Math.ceil((new Date(nxt.fixture_date).getTime() - Date.now()) / 86400000)) : null;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    {/* Next fixture — countdown card */}
    {nxt ? (
      <div className="rise d1" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', border: `1px solid ${C}35`, background: `linear-gradient(120deg, ${C}20, rgba(255,255,255,0.02) 60%)`, padding: '20px 22px', boxShadow: `0 14px 44px ${C}12` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
          <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 62, padding: '10px 12px', borderRadius: 14, background: 'rgba(0,0,0,0.28)', border: `1px solid ${C}30` }}>
            <p style={{ fontSize: 24, fontWeight: 900, color: C, lineHeight: 1 }}>{daysTo === 0 ? '🔥' : daysTo}</p>
            <p style={{ fontSize: 7.5, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>{daysTo === 0 ? 'Today' : daysTo === 1 ? 'Day to go' : 'Days to go'}</p>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <p style={{ fontSize: 9.5, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 5 }}>Next Fixture{nxt.team ? ` · ${nxt.team}` : ''}</p>
            <p style={{ fontSize: 21, fontWeight: 900, letterSpacing: '-0.01em' }}>vs {nxt.opponent}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
              {fd(nxt.fixture_date, { weekday: 'long', day: 'numeric', month: 'long' })}{nxt.fixture_time ? ` · ${fTime(nxt.fixture_time)}` : ''}{nxt.venue ? ` · ${nxt.venue}` : ''}
            </p>
          </div>
          <button onClick={() => setNav('schedule')} style={{ background: `${C}18`, border: `1px solid ${C}40`, color: C, fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '9px 16px', borderRadius: 11, flexShrink: 0 }}>Schedule →</button>
        </div>
      </div>
    ) : (
      <Card className="rise d1"><Empty icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" title="No upcoming fixtures" body="Your team's next fixtures will appear here once published."/></Card>
    )}

    {/* Animated stat band */}
    <div className="stat-grid rise d2">
      {[
        { v: attPct !== null ? `${cAtt}%` : '—', l: 'Attendance', c: attPct !== null ? (attPct >= 80 ? '#22c55e' : attPct >= 60 ? '#fbbf24' : '#f87171') : 'rgba(255,255,255,0.25)' },
        { v: <><span style={{ color: '#22c55e' }}>{cW}</span><span style={{ color: 'rgba(255,255,255,0.18)', margin: '0 3px' }}>·</span><span style={{ color: '#fbbf24' }}>{cD}</span><span style={{ color: 'rgba(255,255,255,0.18)', margin: '0 3px' }}>·</span><span style={{ color: '#f87171' }}>{cL}</span></>, l: `${ath?.team || 'Team'} W·D·L`, c: 'white' },
        { v: hpStudent ? `${cT}/${(hpStudent.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS).length}` : '—', l: 'Tests done', c: hpStudent ? C : 'rgba(255,255,255,0.25)' },
      ].map((x, i) => (
        <div key={i} style={{ borderRadius: 16, background: CARD, border: `1px solid ${B}`, padding: '16px 12px', textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: x.c as string }}>{x.v}</p>
          <p style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 4 }}>{x.l}</p>
        </div>
      ))}
    </div>

    {/* Best percentile tests with rings */}
    {bestTests.length > 0 && (
      <Card className="rise d3">
        <SecHead label="Where you shine" right={<button onClick={() => setNav('perf')} style={{ background: 'none', border: 'none', color: C, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>All results →</button>}/>
        <div className="shine-grid">
          {bestTests.map(([key, v]: any) => {
            const t = allTests.find(x => x.key === key);
            return <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
              <Ring pct={v.percentile} col={C}/>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t?.label || key}</p>
                <p style={{ fontSize: 15, fontWeight: 900, color: C, marginTop: 2 }}>{t ? fmtValueWithUnit(t.key as TestKey, v.latest) : v.latest}</p>
                {v.tier && <div style={{ marginTop: 4 }}><TierBadge label={v.tier}/></div>}
              </div>
            </div>;
          })}
        </div>
      </Card>
    )}

    {/* Latest notice */}
    {reminders.length > 0 && (
      <Card className="rise d4">
        <SecHead label="Latest notice" right={<button onClick={() => setNav('notices')} style={{ background: 'none', border: 'none', color: C, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>All notices →</button>}/>
        <p style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>{reminders[0].title || reminders[0].message}</p>
        {reminders[0].details && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginTop: 6 }}>{reminders[0].details}</p>}
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>{reminders[0].created_at ? ago(reminders[0].created_at) : ''}</p>
      </Card>
    )}
  </div>;
}

// ─── SCHEDULE ────────────────────────────────────────────────────────────────
function Schedule({ D, C }: any) {
  const { athlete: ath, fixtures, results } = D;
  const [scope, setScope] = React.useState<'team'|'all'>(ath?.team ? 'team' : 'all');
  const fx = scope === 'team' && ath?.team ? fixtures.filter((f: Row) => f.team === ath.team) : fixtures;
  const res = scope === 'team' && ath?.team ? results.filter((r: Row) => r.team === ath.team) : results;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <div className="rise" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Schedule</h2>
      {ath?.team && <div style={{ display: 'flex', gap: 6 }}>
        {(['team', 'all'] as const).map(s => (
          <button key={s} onClick={() => setScope(s)} style={{ padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${scope === s ? `${C}60` : B}`, background: scope === s ? `${C}18` : 'transparent', color: scope === s ? C : 'rgba(255,255,255,0.4)' }}>
            {s === 'team' ? ath.team : 'All teams'}
          </button>
        ))}
      </div>}
    </div>
    <Card className="rise d1">
      <SecHead label={`Upcoming fixtures (${fx.length})`}/>
      {fx.length === 0 ? <Empty icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" title="Nothing scheduled" body="Published fixtures will appear here."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fx.map((f: Row) => (
            <div key={f.id} className="hover-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
              <div style={{ width: 48, textAlign: 'center', flexShrink: 0, padding: '7px 0', borderRadius: 10, background: `${C}10`, border: `1px solid ${C}22` }}>
                <p style={{ fontSize: 16, fontWeight: 900, color: C, lineHeight: 1 }}>{new Date(f.fixture_date).getDate()}</p>
                <p style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 2 }}>{fd(f.fixture_date, { month: 'short' })}</p>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800 }}>vs {f.opponent}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                  {f.team}{f.fixture_time ? ` · ${fTime(f.fixture_time)}` : ''}{f.venue ? ` · ${f.venue}` : ''}{f.notes ? ` · ${f.notes}` : ''}
                </p>
              </div>
              {f.home_away && <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, flexShrink: 0, background: f.home_away === 'home' ? `${C}1c` : 'rgba(255,255,255,0.06)', color: f.home_away === 'home' ? C : 'rgba(255,255,255,0.4)', letterSpacing: '0.06em' }}>{f.home_away.toUpperCase()}</span>}
            </div>
          ))}
        </div>
      )}
    </Card>
    <Card className="rise d2">
      <SecHead label={`Recent results (${res.length})`}/>
      {res.length === 0 ? <Empty icon="M22 12h-4l-3 9L9 3l-3 9H2" title="No results yet" body="Match results will appear here once published."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {res.map((r: Row) => {
            const o = outcome(r.final_score);
            return <div key={r.id} className="hover-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}`, borderLeft: `3px solid ${o ? OUT_COL[o] : B}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800 }}>{r.team} vs {r.opponent}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{fd(r.result_date, { day: 'numeric', month: 'short' })}{r.goal_scorers ? ` · ${r.goal_scorers}` : ''}</p>
              </div>
              {o && <span style={{ fontSize: 8.5, fontWeight: 900, padding: '3px 8px', borderRadius: 6, background: `${OUT_COL[o]}1c`, color: OUT_COL[o], letterSpacing: '0.08em', flexShrink: 0 }}>{o}</span>}
              <p style={{ fontSize: 16, fontWeight: 900, color: o ? OUT_COL[o] : 'white', flexShrink: 0 }}>{r.final_score}</p>
            </div>;
          })}
        </div>
      )}
    </Card>
  </div>;
}

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────
function Performance({ D, C }: any) {
  const { hpStudent, hpTests, hpInsights, perfTests } = D;
  const year = new Date().getFullYear();
  const tests = hpStudent?.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Performance</h2>
    {hpStudent ? (
      <>
        <p className="rise" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -6 }}>
          High Performance testing · {hpStudent.grade}{hpStudent.training_group ? ` · Training Group ${hpStudent.training_group}` : ''} · {year}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map((t, ti) => {
            const ins = hpInsights?.[t.key];
            const rows = (hpTests || []).filter((r: Row) => r.year === year && r[t.key] != null && !isNaN(parseFloat(r[t.key])));
            const byTerm: Record<string, number> = {};
            rows.forEach((r: Row) => { byTerm[r.term] = parseFloat(r[t.key]); });
            const termsWithData = TERM_ORDER.filter(term => byTerm[term] !== undefined);
            if (!ins?.latest && termsWithData.length === 0) {
              return <Card key={t.key} className={`rise d${Math.min(5, ti + 1)}`} style={{ padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.55 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{t.label}</p>
                <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.2)' }}>Not tested yet</p>
              </Card>;
            }
            return <Card key={t.key} className={`hover-lift rise d${Math.min(5, ti + 1)}`} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 13, marginBottom: termsWithData.length > 1 ? 12 : 0 }}>
                {ins?.percentile !== null && ins?.percentile !== undefined && <Ring pct={ins.percentile} col={C}/>}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 800 }}>{t.label}</p>
                  {ins?.percentile !== null && ins?.percentile !== undefined && (
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      Better than {ins.percentile}% of {hpStudent.grade}
                    </p>
                  )}
                </div>
                {ins?.latest !== null && <p style={{ fontSize: 21, fontWeight: 900, color: C, textShadow: `0 0 22px ${C}40` }}>{fmtValueWithUnit(t.key as TestKey, ins.latest)}</p>}
                {ins?.tier && <TierBadge label={ins.tier}/>}
                <ChangeChip change={ins?.change ?? null}/>
              </div>
              {termsWithData.length > 1 && (
                <div style={{ display: 'flex', gap: 14, paddingTop: 11, borderTop: `1px solid ${B}` }}>
                  {termsWithData.map(term => (
                    <div key={term} style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{term.replace('Term ', 'T')}</p>
                      <p style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{fmtValue(t.key as TestKey, byTerm[term])}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>;
          })}
        </div>
        <p className="rise d5" style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
          PCT = the share of your grade you beat on that test. Change labels compare your latest result to the previous one, measured against your grade&apos;s normal test-to-test variation — &quot;meaningful&quot; means a real shift, not noise.
        </p>
      </>
    ) : perfTests?.length > 0 ? null : (
      <Card className="rise d1"><Empty icon="M22 12h-4l-3 9L9 3l-3 9H2" title="No performance data linked" body="Once your account is linked to your athlete record, your testing results will appear here automatically."/></Card>
    )}
    {perfTests?.length > 0 && (
      <Card className="rise d3">
        <SecHead label="Sport testing"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {perfTests.slice(0, 12).map((p: Row) => (
            <div key={p.id} className="hover-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
              <div>
                <p style={{ fontSize: 12.5, fontWeight: 700 }}>{p.test_type}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{p.test_date ? fd(p.test_date, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 900, color: C }}>{p.value}{p.unit ? ` ${p.unit}` : ''}</p>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>;
}

// ─── ATTENDANCE / PROGRAMS / FEEDBACK / NOTICES / SETTINGS ───────────────────
function Attendance({ D, attPct }: any) {
  const att: Row[] = D.attendance || [];
  const counts = {
    Present: att.filter(a => (a.status || '').toLowerCase() === 'present').length,
    Late:    att.filter(a => (a.status || '').toLowerCase() === 'late').length,
    Absent:  att.filter(a => (a.status || '').toLowerCase() === 'absent').length,
    Excused: att.filter(a => (a.status || '').toLowerCase() === 'excused').length,
  };
  const COLS: Record<string, string> = { Present: '#22c55e', Late: '#fbbf24', Absent: '#f87171', Excused: '#60a5fa' };
  const ringCol = attPct !== null && attPct >= 80 ? '#22c55e' : attPct !== null && attPct >= 60 ? '#fbbf24' : '#f87171';
  const c = useCountUp(attPct ?? 0);

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Attendance</h2>
    {att.length === 0 ? (
      <Card className="rise d1"><Empty icon="M9 11l3 3L22 4" title="No attendance recorded" body="Your session attendance will appear here once your account is linked to your athlete record."/></Card>
    ) : (
      <>
        <Card className="rise d1" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
            <svg width={110} height={110} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={40} cy={40} r={32} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8}/>
              <circle cx={40} cy={40} r={32} fill="none" stroke={ringCol} strokeWidth={8} strokeLinecap="round"
                strokeDasharray={`${((attPct ?? 0) / 100) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`}
                style={{ filter: `drop-shadow(0 0 6px ${ringCol}70)`, transition: 'stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1)' }}/>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 23, fontWeight: 900 }}>{c}%</span>
              <span style={{ fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>RATE</span>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', width: 54 }}>{k}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(v / att.length) * 100}%`, background: COLS[k], borderRadius: 3, transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)' }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: COLS[k], width: 24, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{att.length} sessions recorded</p>
          </div>
        </Card>
        <Card className="rise d2">
          <SecHead label="Session history"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
            {att.map((a: Row) => {
              const s = (a.status || '').charAt(0).toUpperCase() + (a.status || '').slice(1).toLowerCase();
              return <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: 12.5, fontWeight: 700 }}>{fd(a.session_date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  {a.session_type && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{a.session_type}</p>}
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, background: `${COLS[s] || '#94a3b8'}18`, color: COLS[s] || '#94a3b8', border: `1px solid ${COLS[s] || '#94a3b8'}35` }}>{s}</span>
              </div>;
            })}
          </div>
        </Card>
      </>
    )}
  </div>;
}

function Programs({ D, C }: any) {
  const progs: Row[] = D.programs || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Training Programs</h2>
    {progs.length === 0 ? (
      <Card className="rise d1"><Empty icon="M18 20V10M12 20V4M6 20v-6" title="No programs published" body="Gym, mobility and recovery programs shared by your coaches will be available to download here."/></Card>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {progs.map((p: Row, i: number) => (
          <Card key={p.id} className={`hover-lift rise d${Math.min(5, i + 1)}`} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: `${C}14`, border: `1px solid ${C}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" sz={17} col={C}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13.5, fontWeight: 800 }}>{p.title}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{[p.category, p.day_label, p.details].filter(Boolean).join(' · ')}</p>
            </div>
            {p.file_url && (
              <a href={p.file_url} target="_blank" rel="noreferrer" style={{ padding: '8px 16px', borderRadius: 10, background: `${C}18`, border: `1px solid ${C}35`, color: C, fontSize: 11.5, fontWeight: 800, textDecoration: 'none', flexShrink: 0 }}>Download</a>
            )}
          </Card>
        ))}
      </div>
    )}
  </div>;
}

function Feedback({ D, C }: any) {
  const fb: Row[] = D.feedback || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Coach Feedback</h2>
    {D.coachName && <p className="rise" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -6 }}>Team coach: <span style={{ color: 'white', fontWeight: 700 }}>{D.coachName}</span></p>}
    {fb.length === 0 ? (
      <Card className="rise d1"><Empty icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" title="No feedback shared yet" body="When your coach publishes feedback — strengths, focus areas and comments — it will appear here."/></Card>
    ) : fb.map((f: Row, i: number) => (
      <Card key={i} className={`rise d${Math.min(5, i + 1)}`}>
        <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>{f.created_at ? ago(f.created_at) : ''}</p>
        {f.strengths && <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Strengths</p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)' }}>{f.strengths}</p>
        </div>}
        {f.current_focus && <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Current focus</p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)' }}>{f.current_focus}</p>
        </div>}
        {f.coach_comment && <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>Coach comment</p>
          <p style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic' }}>&quot;{f.coach_comment}&quot;</p>
        </div>}
      </Card>
    ))}
  </div>;
}

function Notices({ D }: any) {
  const rem: Row[] = D.reminders || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Notices</h2>
    {rem.length === 0 ? (
      <Card className="rise d1"><Empty icon="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" title="No notices" body="Department notices from your coaching staff will appear here."/></Card>
    ) : rem.map((r: Row, i: number) => (
      <Card key={r.id} className={`rise d${Math.min(5, i + 1)}`} style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.45 }}>{r.title || r.message}</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{r.created_at ? ago(r.created_at) : ''}</span>
        </div>
        {r.details && <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginTop: 7 }}>{r.details}</p>}
      </Card>
    ))}
  </div>;
}

function Settings({ D, C, out, onPhoto, uploading }: any) {
  const P = D.profile;
  const fileRef = React.useRef<HTMLInputElement>(null);
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <h2 className="rise" style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Settings</h2>
    <Card className="rise d1">
      <SecHead label="Account"/>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[{ l: 'Full Name', v: P.full_name }, { l: 'Email', v: P.email }, { l: 'Grade', v: P.grade }, { l: 'Linked athlete', v: D.athlete ? `${D.athlete.full_name} · ${D.athlete.team}` : 'Not linked' }].map(item => (
          <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }}>{item.l}</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, textAlign: 'right' }}>{item.v || '—'}</span>
          </div>
        ))}
      </div>
    </Card>
    <button onClick={() => fileRef.current?.click()} disabled={uploading} className="rise d2" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: `1px solid ${B}`, background: CARD, cursor: 'pointer', color: 'white', width: '100%', textAlign: 'left' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {uploading ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${C}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }}/> : <Ic d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" sz={16} col={C}/>}
      </div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{uploading ? 'Uploading…' : 'Profile Photo'}</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Upload or change your photo (JPEG/PNG/WebP, max 5MB)</p></div>
      <Ic d="M9 18l6-6-6-6" sz={14} col="rgba(255,255,255,0.3)"/>
    </button>
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
      onChange={e => { const f = e.target.files?.[0]; if (f) onPhoto(f); e.target.value = ''; }}/>
    <Link href="/player/setup" className="rise d3" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: `1px solid ${B}`, background: CARD, textDecoration: 'none', color: 'white' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" sz={15} col={C}/></div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Edit Profile & Athlete Link</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Update your details or re-link your athlete record</p></div>
      <Ic d="M9 18l6-6-6-6" sz={14} col="rgba(255,255,255,0.3)"/>
    </Link>
    <button onClick={out} className="rise d4" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(248,113,113,0.22)', background: 'rgba(248,113,113,0.06)', cursor: 'pointer', color: '#f87171', width: '100%', textAlign: 'left' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" sz={15} col="#f87171"/></div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700 }}>Sign Out</p></div>
    </button>
  </div>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function PlayerProfile() {
  const router = useRouter();
  const [nav, setNav] = React.useState('overview');
  const [D, setD] = React.useState<Row | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errMsg, setErrMsg] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [toast, setToast] = React.useState('');

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/player/auth'); return; }
      try {
        const r = await fetch('/api/player/me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ action: 'get' }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load');
        if (!data.profile) { router.replace('/player/setup'); return; }
        setD(data);
      } catch (e: any) {
        setErrMsg(e.message || 'Could not load your profile.');
      }
      setLoading(false);
    });
  }, [router]);

  async function uploadPhoto(file: File) {
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Signed out — please log in again.');
      const fd = new FormData();
      fd.append('photo', file);
      const r = await fetch('/api/player/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Upload failed');
      setD(prev => prev ? { ...prev, athlete: { ...prev.athlete, photo_url: data.url } } : prev);
      setToast('Photo updated ✓');
    } catch (e: any) {
      setToast(e.message || 'Upload failed');
    }
    setUploading(false);
    setTimeout(() => setToast(''), 3500);
  }

  // Radar categories from cohort percentiles
  const radarCats = React.useMemo(() => {
    if (!D?.hpInsights) return [];
    return CATEGORIES.map(cat => {
      const ps = cat.keys.map(k => D.hpInsights[k]?.percentile).filter((p: any) => p !== null && p !== undefined);
      return ps.length ? { label: cat.label, pct: Math.round(ps.reduce((a: number, b: number) => a + b, 0) / ps.length) } : null;
    }).filter((x): x is { label: string; pct: number } => x !== null);
  }, [D]);

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;

  if (errMsg || !D) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter,sans-serif', fontSize: 14, padding: 24, textAlign: 'center' }}>{errMsg || 'Something went wrong.'}</div>;

  const P = D.profile;
  const ath = D.athlete;
  const prim = ((P.sports || [])[0] || 'hockey').toLowerCase();
  const C = getSportColor(prim);
  const ini = (P.full_name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();
  const att: Row[] = D.attendance || [];
  const attPct = att.length ? Math.round(att.filter((a: Row) => ['present', 'late'].includes((a.status || '').toLowerCase())).length / att.length * 100) : null;
  const curLabel = NAV.find(n => n.id === nav)?.l || 'Overview';
  const botTabs = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[7]];

  async function signOut() { await supabase.auth.signOut(); router.push('/player/auth'); }

  const SECTIONS: Record<string, React.ReactNode> = {
    overview: <Overview D={D} C={C} attPct={attPct} setNav={setNav}/>,
    schedule: <Schedule D={D} C={C}/>,
    perf:     <Performance D={D} C={C}/>,
    att:      <Attendance D={D} attPct={attPct}/>,
    programs: <Programs D={D} C={C}/>,
    feedback: <Feedback D={D} C={C}/>,
    notices:  <Notices D={D}/>,
    settings: <Settings D={D} C={C} out={signOut} onPhoto={uploadPhoto} uploading={uploading}/>,
  };

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,sans-serif;background:${BG};color:white;overflow-x:hidden;max-width:100vw;}
      ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      @keyframes ringSpin{to{transform:rotate(360deg)}}
      @keyframes orbDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(30px,-24px)}}
      .rise{animation:rise 0.5s cubic-bezier(0.16,1,0.3,1) both}
      .d1{animation-delay:0.06s}.d2{animation-delay:0.12s}.d3{animation-delay:0.18s}.d4{animation-delay:0.24s}.d5{animation-delay:0.3s}
      .avatar-ring{animation:ringSpin 7s linear infinite}
      .hover-lift{transition:transform .25s cubic-bezier(0.16,1,0.3,1),box-shadow .25s ease}
      .hover-lift:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,0.35)}
      .hover-row{transition:background .15s ease}
      .hover-row:hover{background:rgba(255,255,255,0.05)!important}
      .navbtn:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
      .sidebar{width:230px;position:fixed;inset:0 auto 0 0;background:${SIDE};border-right:1px solid ${B};display:flex;flex-direction:column;z-index:40;overflow-y:auto;}
      .body{margin-left:230px;min-height:100vh;position:relative;}
      .mob-bar{display:none!important;}
      .bot-nav{display:none!important;}
      .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
      .shine-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;}
      .orb{position:fixed;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:0;animation:orbDrift 16s ease-in-out infinite;}
      @media(max-width:1080px){.hero-radar{width:100%;display:flex;justify-content:center;}}
      @media(max-width:900px){
        .sidebar{display:none!important;}
        .body{margin-left:0!important;}
        .mob-bar{display:flex!important;}
        .bot-nav{display:flex!important;}
        .page-wrap{padding:14px 14px 96px!important;}
        .stat-grid{gap:8px;}
        .hero-inner{padding:20px 16px!important;gap:18px!important;}
      }
    `}</style>

    {/* Ambient sport-colour glow field */}
    <div className="orb" style={{ width: 460, height: 460, top: '-12%', right: '-8%', background: `${C}14` }}/>
    <div className="orb" style={{ width: 380, height: 380, bottom: '-10%', left: '6%', background: `${C}0d`, animationDelay: '4s' }}/>

    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div style={{ padding: '16px 14px', borderBottom: `1px solid ${B}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/st-benedicts-logo.png" alt="SBC" style={{ width: 30, height: 30, objectFit: 'contain', flexShrink: 0 }}/>
          <div><p style={{ fontSize: 10, fontWeight: 900, lineHeight: 1.2 }}>ST BENEDICT&apos;S</p><p style={{ fontSize: 9, fontWeight: 700, color: C, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Altus Performance</p></div>
        </div>
        <nav style={{ padding: 8, flex: 1, overflowY: 'auto' }}>
          {NAV.map(n => { const a = nav === n.id; return <button key={n.id} className="navbtn" onClick={() => setNav(n.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 1, textAlign: 'left', background: a ? `${C}16` : 'transparent', color: a ? C : 'rgba(255,255,255,0.42)', fontWeight: a ? 700 : 500, fontSize: 12.5, transition: 'all 0.12s' }}>
            <Ic d={n.i} sz={15} col={a ? C : 'rgba(255,255,255,0.38)'}/>{n.l}
          </button>; })}
        </nav>
        <div style={{ padding: '0 8px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 11px', borderRadius: 10, border: `1px solid ${B}`, background: 'rgba(255,255,255,0.03)' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,#111c3d,${C}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0, overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {ath?.photo_url ? <img src={ath.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : ini}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{P.full_name}</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>{getSportLabel(prim)}{ath?.team ? ` · ${ath.team}` : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── BODY ── */}
      <div className="body" style={{ flex: 1, minWidth: 0 }}>
        <div className="mob-bar" style={{ position: 'sticky', top: 0, zIndex: 30, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(5,8,20,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${B}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/st-benedicts-logo.png" alt="SBC" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
            <p style={{ fontSize: 13, fontWeight: 800 }}>{curLabel}</p>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,#111c3d,${C}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, overflow: 'hidden' }} onClick={() => setNav('settings')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {ath?.photo_url ? <img src={ath.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : ini}
          </div>
        </div>

        <div className="page-wrap" style={{ position: 'relative', zIndex: 1, padding: '26px 28px 44px', maxWidth: 920, margin: '0 auto' }}>
          {nav === 'overview' && <Hero D={D} C={C} radarCats={radarCats} onPhoto={uploadPhoto} uploading={uploading}/>}
          {SECTIONS[nav]}
        </div>
      </div>
    </div>

    {/* Upload toast */}
    {toast && (
      <div style={{ position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)', zIndex: 60, padding: '10px 18px', borderRadius: 12, background: 'rgba(10,15,30,0.96)', border: `1px solid ${C}40`, fontSize: 12.5, fontWeight: 700, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>{toast}</div>
    )}

    {/* ── BOTTOM NAV (mobile) ── */}
    <div className="bot-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(3,5,14,0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: `1px solid ${B}`, padding: '8px 6px calc(8px + env(safe-area-inset-bottom))', justifyContent: 'space-around' }}>
      {botTabs.map(n => { const a = nav === n.id; return <button key={n.id} onClick={() => setNav(n.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', color: a ? C : 'rgba(255,255,255,0.35)' }}>
        <Ic d={n.i} sz={17} col={a ? C : 'rgba(255,255,255,0.35)'}/>
        <span style={{ fontSize: 8.5, fontWeight: a ? 800 : 600 }}>{n.l.split(' ')[0]}</span>
      </button>; })}
    </div>
  </>;
}
