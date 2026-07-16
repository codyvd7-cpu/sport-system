'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GRADE8_TESTS, GRADE9_TESTS, TIERS, fmtValue, fmtValueWithUnit, TERM_ORDER, type TestKey } from '@/lib/hpTests';
import { getSportColor, getSportLabel } from '@/lib/sports';

type Row = Record<string, any>;

// ─── tokens ───────────────────────────────────────────────────────────────────
const BG = '#060916', SIDE = '#04060f', CARD = 'rgba(255,255,255,0.035)', B = 'rgba(255,255,255,0.08)';

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

const fd = (s: string, o: Intl.DateTimeFormatOptions) => new Date(s).toLocaleDateString('en-ZA', o);
function ago(s: string) { const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000); if (d <= 0) return 'Today'; if (d === 1) return 'Yesterday'; if (d < 7) return `${d}d ago`; if (d < 30) return `${Math.floor(d / 7)}w ago`; return `${Math.floor(d / 30)}mo ago`; }
function fTime(t?: string) { if (!t) return ''; const [h, m] = t.split(':'); const hr = parseInt(h); if (isNaN(hr)) return t; return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`; }
function outcome(score?: string) {
  const p = (score || '').split(/[-–]/).map(x => parseInt(x.trim()));
  if (p.length !== 2 || p.some(isNaN)) return null;
  return p[0] > p[1] ? 'WIN' : p[0] < p[1] ? 'LOSS' : 'DRAW';
}
const OUT_COL: Record<string, string> = { WIN: '#22c55e', LOSS: '#f87171', DRAW: '#fbbf24' };

// ─── micro-components ───────────────────────────────────────────────────────
function Ic({ d, sz = 16, col = 'currentColor', sw = 1.8 }: { d: string; sz?: number; col?: string; sw?: number }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{ width: sz, height: sz, flexShrink: 0 }}>{d.split(' M').map((s, i) => <path key={i} d={i === 0 ? s : 'M' + s} />)}</svg>;
}
function TierBadge({ label }: { label: string }) {
  const t = TIERS.find(x => x.label === label) || TIERS[2];
  return <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, padding: '2.5px 9px', borderRadius: 20, background: t.bg, color: t.color, border: `1px solid ${t.border}`, letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{t.label}</span>;
}
function Donut({ pct, col, sz = 96, label, sub }: { pct: number; col: string; sz?: number; label: string; sub: string }) {
  const r = 32, c = 2 * Math.PI * r, dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return <div style={{ position: 'relative', width: sz, height: sz, flexShrink: 0 }}>
    <svg width={sz} height={sz} viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8}/>
      <circle cx={40} cy={40} r={r} fill="none" stroke={col} strokeWidth={8} strokeDasharray={`${dash} ${c}`} strokeLinecap="round"/>
    </svg>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: sz / 5, fontWeight: 900, color: 'white', lineHeight: 1 }}>{label}</span>
      <span style={{ fontSize: 8.5, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{sub}</span>
    </div>
  </div>;
}
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ borderRadius: 18, background: CARD, border: `1px solid ${B}`, padding: 20, ...style }}>{children}</div>;
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

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
function Overview({ D, C, attPct, setNav }: any) {
  const { profile: P, athlete: ath, fixtures, results, reminders, hpInsights, hpStudent } = D;
  const teamFx = ath?.team ? fixtures.filter((f: Row) => f.team === ath.team) : fixtures;
  const nxt = teamFx[0] || fixtures[0] || null;
  const teamRes = ath?.team ? results.filter((r: Row) => r.team === ath.team) : results;
  const wins = teamRes.filter((r: Row) => outcome(r.final_score) === 'WIN').length;
  const draws = teamRes.filter((r: Row) => outcome(r.final_score) === 'DRAW').length;
  const losses = teamRes.filter((r: Row) => outcome(r.final_score) === 'LOSS').length;
  const last = teamRes[0] || null;
  const lastOut = last ? outcome(last.final_score) : null;
  const bestTests = Object.entries(hpInsights || {})
    .filter(([, v]: any) => v.percentile !== null)
    .sort((a: any, b: any) => b[1].percentile - a[1].percentile).slice(0, 2);
  const allTests = [...GRADE8_TESTS, ...GRADE9_TESTS];

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    {/* Next fixture hero */}
    {nxt ? (
      <div style={{ borderRadius: 20, overflow: 'hidden', border: `1px solid ${C}30`, background: `linear-gradient(135deg, ${C}1a, rgba(255,255,255,0.02) 55%)`, padding: '22px 22px' }}>
        <p style={{ fontSize: 9.5, fontWeight: 800, color: C, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 10 }}>Next Fixture{nxt.team ? ` · ${nxt.team}` : ''}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 10 }}>
          <p style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.01em' }}>vs {nxt.opponent}</p>
          {nxt.fixture_time && <span style={{ fontSize: 15, fontWeight: 900, color: C }}>{fTime(nxt.fixture_time)}</span>}
        </div>
        <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
          {fd(nxt.fixture_date, { weekday: 'long', day: 'numeric', month: 'long' })}{nxt.venue ? ` · ${nxt.venue}` : ''}{nxt.home_away ? ` · ${nxt.home_away.toUpperCase()}` : ''}
        </p>
        <button onClick={() => setNav('schedule')} style={{ marginTop: 12, background: 'none', border: 'none', color: C, fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0 }}>Full schedule →</button>
      </div>
    ) : (
      <Card><Empty icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" title="No upcoming fixtures" body="Your team's next fixtures will appear here once published."/></Card>
    )}

    {/* Stat row */}
    <div className="stat-grid">
      <Card style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: attPct !== null ? (attPct >= 80 ? '#22c55e' : attPct >= 60 ? '#fbbf24' : '#f87171') : 'rgba(255,255,255,0.25)' }}>{attPct !== null ? `${attPct}%` : '—'}</p>
        <p style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>Attendance</p>
      </Card>
      <Card style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 900 }}>
          <span style={{ color: '#22c55e' }}>{wins}</span><span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
          <span style={{ color: '#fbbf24' }}>{draws}</span><span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 4px' }}>·</span>
          <span style={{ color: '#f87171' }}>{losses}</span>
        </p>
        <p style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>{ath?.team || 'Team'} W·D·L</p>
      </Card>
      <Card style={{ padding: 16, textAlign: 'center' }}>
        <p style={{ fontSize: 22, fontWeight: 900, color: lastOut ? OUT_COL[lastOut] : 'rgba(255,255,255,0.25)' }}>{lastOut || '—'}</p>
        <p style={{ fontSize: 8.5, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginTop: 3 }}>Last Result</p>
      </Card>
    </div>

    {/* Performance highlights */}
    {bestTests.length > 0 && (
      <Card>
        <SecHead label="Performance highlights" right={<button onClick={() => setNav('perf')} style={{ background: 'none', border: 'none', color: C, fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>All results →</button>}/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {bestTests.map(([key, v]: any) => {
            const t = allTests.find(x => x.key === key);
            return <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 800 }}>{t?.label || key}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Top {Math.max(1, 100 - v.percentile)}% of {hpStudent?.grade || 'cohort'}</p>
              </div>
              <p style={{ fontSize: 16, fontWeight: 900, color: C }}>{t ? fmtValueWithUnit(t.key as TestKey, v.latest) : v.latest}</p>
              {v.tier && <TierBadge label={v.tier}/>}
            </div>;
          })}
        </div>
      </Card>
    )}

    {/* Latest notice */}
    {reminders.length > 0 && (
      <Card>
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

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
      <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Schedule</h2>
      {ath?.team && <div style={{ display: 'flex', gap: 6 }}>
        {(['team', 'all'] as const).map(s => (
          <button key={s} onClick={() => setScope(s)} style={{ padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 800, cursor: 'pointer', border: `1px solid ${scope === s ? `${C}60` : B}`, background: scope === s ? `${C}18` : 'transparent', color: scope === s ? C : 'rgba(255,255,255,0.4)' }}>
            {s === 'team' ? ath.team : 'All teams'}
          </button>
        ))}
      </div>}
    </div>

    <Card>
      <SecHead label={`Upcoming fixtures (${fx.length})`}/>
      {fx.length === 0 ? <Empty icon="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" title="Nothing scheduled" body="Published fixtures will appear here."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fx.map((f: Row) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
              <div style={{ width: 46, textAlign: 'center', flexShrink: 0 }}>
                <p style={{ fontSize: 17, fontWeight: 900, color: C, lineHeight: 1 }}>{new Date(f.fixture_date).getDate()}</p>
                <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginTop: 2 }}>{fd(f.fixture_date, { month: 'short' })}</p>
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

    <Card>
      <SecHead label={`Recent results (${res.length})`}/>
      {res.length === 0 ? <Empty icon="M22 12h-4l-3 9L9 3l-3 9H2" title="No results yet" body="Match results will appear here once published."/> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {res.map((r: Row) => {
            const o = outcome(r.final_score);
            return <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}`, borderLeft: `3px solid ${o ? OUT_COL[o] : B}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13.5, fontWeight: 800 }}>{r.team} vs {r.opponent}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{fd(r.result_date, { day: 'numeric', month: 'short' })}{r.goal_scorers ? ` · ${r.goal_scorers}` : ''}</p>
              </div>
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

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Performance</h2>

    {hpStudent ? (
      <>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -6 }}>
          High Performance testing · {hpStudent.grade}{hpStudent.training_group ? ` · Training Group ${hpStudent.training_group}` : ''} · {year}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tests.map(t => {
            const ins = hpInsights?.[t.key];
            const rows = (hpTests || []).filter((r: Row) => r.year === year && r[t.key] != null && !isNaN(parseFloat(r[t.key])));
            const byTerm: Record<string, number> = {};
            rows.forEach((r: Row) => { byTerm[r.term] = parseFloat(r[t.key]); });
            const termsWithData = TERM_ORDER.filter(term => byTerm[term] !== undefined);
            if (!ins?.latest && termsWithData.length === 0) {
              return <Card key={t.key} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{t.label}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Not tested yet</p>
              </Card>;
            }
            return <Card key={t.key} style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: termsWithData.length > 1 ? 12 : 0 }}>
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ fontSize: 13.5, fontWeight: 800 }}>{t.label}</p>
                  {ins?.percentile !== null && ins?.percentile !== undefined && (
                    <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                      Better than {ins.percentile}% of {hpStudent.grade} ({ins.cohortTested} tested)
                    </p>
                  )}
                </div>
                {ins?.latest !== null && <p style={{ fontSize: 20, fontWeight: 900, color: C }}>{fmtValueWithUnit(t.key as TestKey, ins.latest)}</p>}
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
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', lineHeight: 1.6 }}>
          Change labels compare your latest result to the previous one, measured against your grade&apos;s normal test-to-test variation — so &quot;meaningful&quot; means a real shift, not noise.
        </p>
      </>
    ) : perfTests?.length > 0 ? null : (
      <Card><Empty icon="M22 12h-4l-3 9L9 3l-3 9H2" title="No performance data linked" body="Once your account is linked to your athlete record, your testing results will appear here automatically."/></Card>
    )}

    {/* Sport-specific tests (separate battery from HP) */}
    {perfTests?.length > 0 && (
      <Card>
        <SecHead label="Sport testing"/>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {perfTests.slice(0, 12).map((p: Row) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.03)', border: `1px solid ${B}` }}>
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

// ─── ATTENDANCE ──────────────────────────────────────────────────────────────
function Attendance({ D, C, attPct }: any) {
  const att: Row[] = D.attendance || [];
  const counts = {
    Present: att.filter(a => (a.status || '').toLowerCase() === 'present').length,
    Late:    att.filter(a => (a.status || '').toLowerCase() === 'late').length,
    Absent:  att.filter(a => (a.status || '').toLowerCase() === 'absent').length,
    Excused: att.filter(a => (a.status || '').toLowerCase() === 'excused').length,
  };
  const COLS: Record<string, string> = { Present: '#22c55e', Late: '#fbbf24', Absent: '#f87171', Excused: '#60a5fa' };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Attendance</h2>
    {att.length === 0 ? (
      <Card><Empty icon="M9 11l3 3L22 4" title="No attendance recorded" body="Your session attendance will appear here once your account is linked to your athlete record."/></Card>
    ) : (
      <>
        <Card style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 22 }}>
          <Donut pct={attPct ?? 0} col={attPct !== null && attPct >= 80 ? '#22c55e' : attPct !== null && attPct >= 60 ? '#fbbf24' : '#f87171'} label={`${attPct ?? 0}%`} sub="Rate"/>
          <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', width: 54 }}>{k}</span>
                <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(v / att.length) * 100}%`, background: COLS[k], borderRadius: 3 }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 900, color: COLS[k], width: 24, textAlign: 'right' }}>{v}</span>
              </div>
            ))}
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{att.length} sessions recorded</p>
          </div>
        </Card>
        <Card>
          <SecHead label="Session history"/>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 420, overflowY: 'auto' }}>
            {att.map((a: Row) => {
              const s = (a.status || '').charAt(0).toUpperCase() + (a.status || '').slice(1).toLowerCase();
              return <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 13px', borderRadius: 10, background: 'rgba(255,255,255,0.025)', border: `1px solid rgba(255,255,255,0.05)` }}>
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

// ─── PROGRAMS ────────────────────────────────────────────────────────────────
function Programs({ D, C }: any) {
  const progs: Row[] = D.programs || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Training Programs</h2>
    {progs.length === 0 ? (
      <Card><Empty icon="M18 20V10M12 20V4M6 20v-6" title="No programs published" body="Gym, mobility and recovery programs shared by your coaches will be available to download here."/></Card>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {progs.map((p: Row) => (
          <Card key={p.id} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
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

// ─── COACH FEEDBACK ──────────────────────────────────────────────────────────
function Feedback({ D, C }: any) {
  const fb: Row[] = D.feedback || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Coach Feedback</h2>
    {D.coachName && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: -6 }}>Team coach: <span style={{ color: 'white', fontWeight: 700 }}>{D.coachName}</span></p>}
    {fb.length === 0 ? (
      <Card><Empty icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" title="No feedback shared yet" body="When your coach publishes feedback — strengths, focus areas and comments — it will appear here."/></Card>
    ) : fb.map((f: Row, i: number) => (
      <Card key={i}>
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

// ─── NOTICES ─────────────────────────────────────────────────────────────────
function Notices({ D, C }: any) {
  const rem: Row[] = D.reminders || [];
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Notices</h2>
    {rem.length === 0 ? (
      <Card><Empty icon="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" title="No notices" body="Department notices from your coaching staff will appear here."/></Card>
    ) : rem.map((r: Row) => (
      <Card key={r.id} style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, lineHeight: 1.45 }}>{r.title || r.message}</p>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{r.created_at ? ago(r.created_at) : ''}</span>
        </div>
        {r.details && <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, marginTop: 7 }}>{r.details}</p>}
      </Card>
    ))}
  </div>;
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({ D, C, out }: any) {
  const P = D.profile;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade">
    <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.01em' }}>Settings</h2>
    <Card>
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
    <Link href="/player/setup" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: `1px solid ${B}`, background: CARD, textDecoration: 'none', color: 'white' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${C}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" sz={15} col={C}/></div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Edit Profile & Athlete Link</p><p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Update your details or re-link your athlete record</p></div>
      <Ic d="M9 18l6-6-6-6" sz={14} col="rgba(255,255,255,0.3)"/>
    </Link>
    <button onClick={out} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 14, border: '1px solid rgba(248,113,113,0.22)', background: 'rgba(248,113,113,0.06)', cursor: 'pointer', color: '#f87171', width: '100%', textAlign: 'left' }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(248,113,113,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" sz={15} col="#f87171"/></div>
      <div style={{ flex: 1 }}><p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>Sign Out</p></div>
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

  if (loading) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div style={{ width: 26, height: 26, borderRadius: '50%', border: '3px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;

  if (errMsg || !D) return <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter,sans-serif', fontSize: 14, padding: 24, textAlign: 'center' }}>{errMsg || 'Something went wrong.'}</div>;

  const P = D.profile;
  const ath = D.athlete;
  const sports: string[] = (P.sports || []).map((s: string) => s.toLowerCase());
  const prim = sports[0] || 'hockey';
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
    att:      <Attendance D={D} C={C} attPct={attPct}/>,
    programs: <Programs D={D} C={C}/>,
    feedback: <Feedback D={D} C={C}/>,
    notices:  <Notices D={D} C={C}/>,
    settings: <Settings D={D} C={C} out={signOut}/>,
  };

  return <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,sans-serif;background:${BG};color:white;overflow-x:hidden;max-width:100vw;}
      ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      .fade{animation:fade 0.3s ease both}
      .navbtn:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
      .sidebar{width:230px;position:fixed;inset:0 auto 0 0;background:${SIDE};border-right:1px solid ${B};display:flex;flex-direction:column;z-index:40;overflow-y:auto;}
      .body{margin-left:230px;min-height:100vh;}
      .mob-bar{display:none!important;}
      .bot-nav{display:none!important;}
      .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
      .hero-grid{display:flex;gap:18px;align-items:center;flex-wrap:wrap;}
      @media(max-width:900px){
        .sidebar{display:none!important;}
        .body{margin-left:0!important;}
        .mob-bar{display:flex!important;}
        .bot-nav{display:flex!important;}
        .page-wrap{padding:14px 14px 92px!important;}
        .stat-grid{grid-template-columns:repeat(3,1fr);gap:8px;}
      }
      @media(max-width:520px){
        .stat-grid{gap:7px;}
      }
    `}</style>

    <div style={{ display: 'flex', minHeight: '100vh', background: BG }}>
      {/* ── SIDEBAR (desktop) ── */}
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
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,#1e3a8a,${C})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{ini}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{P.full_name}</p>
              <p style={{ fontSize: 9.5, color: 'rgba(255,255,255,0.35)' }}>{getSportLabel(prim)}{ath?.team ? ` · ${ath.team}` : ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── BODY ── */}
      <div className="body" style={{ flex: 1, minWidth: 0 }}>
        {/* Mobile top bar */}
        <div className="mob-bar" style={{ position: 'sticky', top: 0, zIndex: 30, alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(6,9,22,0.94)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${B}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/st-benedicts-logo.png" alt="SBC" style={{ width: 26, height: 26, objectFit: 'contain' }}/>
            <p style={{ fontSize: 13, fontWeight: 800 }}>{curLabel}</p>
          </div>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg,#1e3a8a,${C})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900 }} onClick={() => setNav('settings')}>{ini}</div>
        </div>

        <div className="page-wrap" style={{ padding: '26px 28px 40px', maxWidth: 860, margin: '0 auto' }}>
          {/* ── HERO (all sections) ── */}
          {nav === 'overview' && (
            <div className="hero-grid fade" style={{ marginBottom: 18, padding: '22px 22px', borderRadius: 20, border: `1px solid ${B}`, background: `linear-gradient(140deg, ${C}14, rgba(255,255,255,0.015) 60%)` }}>
              {ath?.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={ath.photo_url} alt={P.full_name} style={{ width: 74, height: 74, borderRadius: 22, objectFit: 'cover', border: `2px solid ${C}50`, flexShrink: 0 }}/>
              ) : (
                <div style={{ width: 74, height: 74, borderRadius: 22, background: `linear-gradient(135deg,#1e3a8a,${C})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 900, flexShrink: 0, border: `2px solid ${C}40` }}>{ini}</div>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ fontSize: 23, fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{P.full_name}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 9 }}>
                  {[getSportLabel(prim), ath?.team, ath?.position, P.grade].filter(Boolean).map((v: string) => (
                    <span key={v} style={{ fontSize: 10, fontWeight: 800, padding: '4px 11px', borderRadius: 20, background: `${C}16`, color: C, border: `1px solid ${C}30`, letterSpacing: '0.03em' }}>{v}</span>
                  ))}
                </div>
                {!ath && (
                  <Link href="/player/setup" style={{ display: 'inline-block', marginTop: 11, fontSize: 11.5, fontWeight: 800, color: '#fbbf24', textDecoration: 'none' }}>
                    ⚠ Link your athlete record to unlock your stats →
                  </Link>
                )}
              </div>
            </div>
          )}

          {SECTIONS[nav]}
        </div>
      </div>
    </div>

    {/* ── BOTTOM NAV (mobile) ── */}
    <div className="bot-nav" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40, background: 'rgba(4,6,15,0.96)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderTop: `1px solid ${B}`, padding: '8px 6px calc(8px + env(safe-area-inset-bottom))', justifyContent: 'space-around' }}>
      {botTabs.map(n => { const a = nav === n.id; return <button key={n.id} onClick={() => setNav(n.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', color: a ? C : 'rgba(255,255,255,0.35)' }}>
        <Ic d={n.i} sz={17} col={a ? C : 'rgba(255,255,255,0.35)'}/>
        <span style={{ fontSize: 8.5, fontWeight: a ? 800 : 600 }}>{n.l.split(' ')[0]}</span>
      </button>; })}
    </div>
  </>;
}
