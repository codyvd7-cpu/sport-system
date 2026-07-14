'use client';
import Link from 'next/link';
import { type SportKey, getSportTerm } from '@/lib/sports';

type Row = Record<string, any>;

function fDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':'); const hr = parseInt(h);
  return ` · ${hr>12?hr-12:hr}:${m}${hr>=12?'pm':'am'}`;
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5" style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 56px' }}>
      {[0,1].map(i => <div key={i} style={{ height: 320, borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}/>)}
    </div>
  );

  const CARD = {
    borderRadius: 22, border: '1px solid rgba(255,255,255,0.1)',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))',
    overflow: 'hidden' as const, boxShadow: '0 12px 40px rgba(0,0,0,0.28)',
  };
  const HDR = { padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

  return (
    <section id="fixtures" style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Upcoming fixtures */}
        <div style={CARD}>
          <div style={HDR}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:3, height:18, borderRadius:2, background:color }}/>
              <p style={{ fontSize:13, fontWeight:900, color:'white' }}>Upcoming {fx}s</p>
            </div>
            <Link href={`/portal/fixtures?sport=${sport}`} style={{ fontSize:11.5, fontWeight:800, color, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              View All <span style={{fontSize:14}}>→</span>
            </Link>
          </div>
          {fixtures.length === 0 ? (
            <div style={{ padding:'48px 20px', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.22)' }}>No upcoming {fx.toLowerCase()}s</p>
            </div>
          ) : (
            <div>
              {fixtures.map((f, i) => (
                <Link key={f.id || i} href={`/portal/fixtures?sport=${sport}&date=${f.fixture_date}`} style={{
                  padding:'16px 24px', borderBottom: i < fixtures.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  display:'flex', alignItems:'center', gap:14, textDecoration:'none', transition:'background .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.035)')}
                  onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                  {/* Date block */}
                  <div style={{ width:48, textAlign:'center', flexShrink:0 }}>
                    <p style={{ fontSize:20, fontWeight:900, color:'white', lineHeight:1 }}>{new Date(f.fixture_date).getDate()}</p>
                    <p style={{ fontSize:9, fontWeight:700, color:'rgba(255,255,255,0.35)', textTransform:'uppercase', marginTop:2 }}>{new Date(f.fixture_date).toLocaleDateString('en-ZA',{month:'short'})}</p>
                  </div>
                  <div style={{ width:1, height:36, background:'rgba(255,255,255,0.08)', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    {f.team && <span style={{ fontSize:10, fontWeight:800, color, background:`${color}18`, border:`1px solid ${color}30`, borderRadius:6, padding:'2px 8px', marginBottom:4, display:'inline-block' }}>{f.team}</span>}
                    <p style={{ fontSize:14.5, fontWeight:800, color:'white', marginBottom:2 }}>vs {f.opponent}</p>
                    <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)', fontWeight:500 }}>
                      {f.fixture_time ? fTime(f.fixture_time).replace(' · ','') : ''}{f.venue ? ` · ${f.venue}` : ''}
                    </p>
                  </div>
                  {f.home_away && (
                    <span style={{ fontSize:9, fontWeight:800, padding:'4px 9px', borderRadius:7, color:'rgba(255,255,255,0.4)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', flexShrink:0 }}>
                      {f.home_away.toUpperCase()}
                    </span>
                  )}
                  <span style={{ color:'rgba(255,255,255,0.18)', fontSize:15, flexShrink:0 }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Latest results */}
        <div style={CARD} id="results">
          <div style={HDR}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:3, height:18, borderRadius:2, background:color }}/>
              <p style={{ fontSize:13, fontWeight:900, color:'white' }}>Latest {rs}s</p>
            </div>
            <Link href={`/portal/fixtures/season?sport=${sport}`} style={{ fontSize:11.5, fontWeight:800, color, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
              View All <span style={{fontSize:14}}>→</span>
            </Link>
          </div>
          {results.length === 0 ? (
            <div style={{ padding:'48px 20px', textAlign:'center' }}>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.22)' }}>No results yet</p>
            </div>
          ) : (
            <div>
              {results.map((r, i) => {
                const o = outcome(r.final_score || '');
                return (
                  <Link key={r.id || i} href={`/portal/fixtures/season?sport=${sport}`} style={{
                    padding:'16px 24px', borderBottom: i < results.length-1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    display:'flex', alignItems:'center', gap:14, textDecoration:'none', transition:'background .15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,0.035)')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    {/* Outcome bar */}
                    <div style={{ width:4, height:40, borderRadius:2, background: o ? OC[o] : 'rgba(255,255,255,0.15)', flexShrink:0 }}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      {r.team && <span style={{ fontSize:10, fontWeight:800, color, background:`${color}18`, border:`1px solid ${color}30`, borderRadius:6, padding:'2px 8px', marginBottom:4, display:'inline-block' }}>{r.team}</span>}
                      <p style={{ fontSize:14.5, fontWeight:800, color:'white', marginBottom:2 }}>vs {r.opponent}</p>
                      <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)' }}>{r.result_date ? fDate(r.result_date) : ''}</p>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      {r.final_score && <p style={{ fontSize:20, fontWeight:900, color: o ? OC[o] : 'white', lineHeight:1 }}>{r.final_score}</p>}
                      {o && <p style={{ fontSize:9, fontWeight:800, color:OC[o], letterSpacing:'0.1em', marginTop:3 }}>{o}</p>}
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
