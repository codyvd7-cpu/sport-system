'use client';
import Link from 'next/link';
import { type SportKey, getSportTerm } from '@/lib/sports';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return ` · ${hr > 12 ? hr-12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function outcome(score: string): 'WIN'|'DRAW'|'LOSS'|null {
  if (!score) return null;
  const [a, b] = score.split(/[-–]/).map(Number);
  if (isNaN(a) || isNaN(b)) return null;
  return a > b ? 'WIN' : a < b ? 'LOSS' : 'DRAW';
}
const OC: Record<string,string> = { WIN:'#22c55e', DRAW:'#fbbf24', LOSS:'#f87171' };

interface Props { sport: SportKey; color: string; fixtures: Row[]; results: Row[]; loading: boolean; }

export default function FixtureList({ sport, color, fixtures, results, loading }: Props) {
  const fx = getSportTerm(sport, 'fixture');
  const rs = getSportTerm(sport, 'result');

  if (loading) return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      {[0,1].map(i => <div key={i} style={{ height: 240, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}/>)}
    </div>
  );

  const CARD = { borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', overflow: 'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.25)' };
  const HDR  = { padding: '18px 22px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background:'rgba(255,255,255,0.02)' };

  return (
    <section id="fixtures" style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="md:grid-cols-2">

        {/* Upcoming fixtures */}
        <div style={CARD}>
          <div style={HDR}>
            <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Upcoming {fx}s</p>
            <Link href={`/portal/fixtures?sport=${sport}`} style={{ fontSize: 11, fontWeight: 800, color, textDecoration: 'none', display:'flex', alignItems:'center', gap:4 }}>
              View All <span style={{fontSize:13}}>→</span>
            </Link>
          </div>
          {fixtures.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No upcoming {fx.toLowerCase()}s</p>
            </div>
          ) : (
            <div>
              {fixtures.map((f, i) => (
                <Link key={f.id || i} href={`/portal/fixtures?sport=${sport}`} style={{ padding: '14px 20px', borderBottom: i < fixtures.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 12, textDecoration:'none', transition:'background .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      {f.team && <span style={{ fontSize: 10, fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 6, padding: '2px 7px' }}>{f.team}</span>}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>vs {f.opponent}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                      {fDate(f.fixture_date)}{fTime(f.fixture_time)}
                      {f.venue ? ` · ${f.venue}` : ''}
                    </p>
                  </div>
                  {f.home_away && (
                    <span style={{ fontSize: 9, fontWeight: 800, padding: '3px 8px', borderRadius: 6, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
                      {f.home_away.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color:'rgba(255,255,255,0.15)', fontSize:14, flexShrink:0 }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Latest results */}
        <div style={CARD} id="results">
          <div style={HDR}>
            <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>Latest {rs}s</p>
            <Link href={`/portal/fixtures/season?sport=${sport}`} style={{ fontSize: 11, fontWeight: 800, color, textDecoration: 'none', display:'flex', alignItems:'center', gap:4 }}>
              View All <span style={{fontSize:13}}>→</span>
            </Link>
          </div>
          {results.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>No results yet</p>
            </div>
          ) : (
            <div>
              {results.map((r, i) => {
                const o = outcome(r.final_score || '');
                return (
                  <Link key={r.id || i} href={`/portal/fixtures/season?sport=${sport}`} style={{ padding: '14px 20px', borderBottom: i < results.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none', display: 'flex', alignItems: 'center', gap: 12, textDecoration:'none', transition:'background .15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {r.team && <span style={{ fontSize: 10, fontWeight: 800, color, background: `${color}15`, border: `1px solid ${color}25`, borderRadius: 6, padding: '2px 7px', marginBottom: 4, display: 'inline-block' }}>{r.team}</span>}
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>vs {r.opponent}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{r.result_date ? fDate(r.result_date) : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {r.final_score && <p style={{ fontSize: 18, fontWeight: 900, color: o ? OC[o] : 'white', lineHeight: 1 }}>{r.final_score}</p>}
                      {o && <p style={{ fontSize: 9, fontWeight: 800, color: OC[o], letterSpacing: '0.1em' }}>{o}</p>}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
