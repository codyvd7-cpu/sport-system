'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { getSportLabel, getSportColor, getSportTerm } from '@/lib/sports';
import WeatherChip from '@/components/WeatherChip';

type Row = Record<string, any>;

const BORDER = 'rgba(255,255,255,0.07)';
const BG = '#0a0f1e';

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    full:  d.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
    day:   d.toLocaleDateString('en-ZA', { weekday:'long' }),
    chip:  d.toLocaleDateString('en-ZA', { weekday:'short', day:'numeric', month:'short' }),
  };
}
function fTime(t?: string) {
  if (!t) return 'TBC';
  const [h, m] = t.split(':'); const hr = parseInt(h);
  if (isNaN(hr)) return t;
  return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`;
}

function FixturesInner() {
  const searchParams = useSearchParams();
  const sport = searchParams.get('sport') || 'hockey';
  const dateParam = searchParams.get('date') || '';
  const C = getSportColor(sport);
  const label = getSportLabel(sport);
  const fxTerm = getSportTerm(sport, 'fixture');

  const [upcoming, setUpcoming] = React.useState<Row[]>([]);
  const [extra, setExtra]       = React.useState<Row[]>([]); // deep-linked date outside the upcoming window
  const [selected, setSelected] = React.useState<string>(dateParam);
  const [loading, setLoading]   = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const { data: up } = await supabase
        .from('portal_fixtures').select('*')
        .eq('is_published', true).eq('sport', sport)
        .gte('fixture_date', today)
        .order('fixture_date').order('fixture_time', { ascending: true });
      if (cancelled) return;
      const rows = up || [];
      setUpcoming(rows);

      // If a specific date was requested but isn't in the upcoming window
      // (e.g. a link to a past fixture day), fetch that date directly.
      if (dateParam && !rows.some(f => f.fixture_date === dateParam)) {
        const { data: ex } = await supabase
          .from('portal_fixtures').select('*')
          .eq('is_published', true).eq('sport', sport)
          .eq('fixture_date', dateParam)
          .order('fixture_time', { ascending: true });
        if (cancelled) return;
        setExtra(ex || []);
      } else {
        setExtra([]);
      }

      // Default to the requested date, otherwise the next fixture day
      setSelected(dateParam || rows[0]?.fixture_date || '');
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sport, dateParam]);

  const allRows = React.useMemo(() => [...upcoming, ...extra], [upcoming, extra]);
  const fixtures = React.useMemo(
    () => allRows.filter(f => f.fixture_date === selected),
    [allRows, selected]
  );
  const upcomingDates = React.useMemo(
    () => Array.from(new Set(upcoming.map(f => f.fixture_date))).slice(0, 8),
    [upcoming]
  );

  const fmt = selected ? formatDate(selected) : null;

  const homeCount = fixtures.filter(f => f.home_away?.toLowerCase() === 'home').length;
  const awayCount = fixtures.filter(f => f.home_away?.toLowerCase() === 'away').length;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .fx-row:hover td { background: rgba(255,255,255,0.03) !important; }
        .back-link:hover { color: rgba(255,255,255,0.8) !important; }
        .day-chip { transition: all .18s cubic-bezier(0.16,1,0.3,1); }
        .day-chip:hover { transform: translateY(-1px); }
        .fx-table-wrap { display: block; }
        .fx-cards { display: none; }
        @media (max-width: 760px) {
          .fx-table-wrap { display: none; }
          .fx-cards { display: flex; flex-direction: column; gap: 12px; }
          .fx-header-h1 { font-size: 30px !important; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <main style={{ minHeight:'100vh', background:BG, color:'white' }}>

        {/* ── NAV ── */}
        <nav style={{ borderBottom:`1px solid ${BORDER}`, background:'rgba(10,15,30,0.95)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:50 }}>
          <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/st-benedicts-logo.png" alt="SBC" style={{ width:34, height:34, objectFit:'contain' }}/>
              <div>
                <p style={{ fontSize:14, fontWeight:700, color:'white', lineHeight:1 }}>ST BENEDICT&apos;S COLLEGE</p>
                <p style={{ fontSize:10, fontWeight:500, color:C, letterSpacing:'0.05em', marginTop:2, textTransform:'uppercase' }}>{label} Department</p>
              </div>
            </div>
            <Link href={`/portal?sport=${sport}`} className="back-link"
              style={{ fontSize:13, color:'rgba(255,255,255,0.45)', textDecoration:'none', display:'flex', alignItems:'center', gap:6, transition:'color 0.2s' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width:14, height:14 }}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to Portal
            </Link>
          </div>
        </nav>

        <div style={{ maxWidth:1100, margin:'0 auto', padding:'40px 24px 80px' }}>

          {/* ── HEADER ── */}
          <div style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:C, display:'inline-block', boxShadow:`0 0 8px ${C}` }}/>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:C, textTransform:'uppercase' }}>{fxTerm}s</span>
            </div>
            <h1 className="fx-header-h1" style={{ fontSize:38, fontWeight:800, color:'white', lineHeight:1.1, marginBottom:6, letterSpacing:'-0.02em' }}>
              {fmt?.day || `${label} ${fxTerm}s`}
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.45)' }}>{fmt?.full || 'Upcoming schedule'}</p>
            {/* Day weather — once for the whole day, not per fixture */}
            {selected && <div style={{ marginTop: 10 }}><WeatherChip date={selected}/></div>}
          </div>

          {/* ── DAY SWITCHER ── */}
          {!loading && upcomingDates.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:28 }}>
              {upcomingDates.map(d => {
                const active = d === selected;
                return (
                  <button key={d} className="day-chip" onClick={() => setSelected(d)}
                    style={{
                      border: `1px solid ${active ? C : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 12, padding: '9px 16px', cursor: 'pointer',
                      background: active ? `${C}1c` : 'rgba(255,255,255,0.03)',
                      color: active ? C : 'rgba(255,255,255,0.55)',
                      fontSize: 12.5, fontWeight: 700,
                      boxShadow: active ? `0 4px 16px ${C}25` : 'none',
                    }}>
                    {formatDate(d).chip}
                  </button>
                );
              })}
              <Link href={`/portal/fixtures/season?sport=${sport}`} style={{
                border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'9px 16px',
                background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:12.5, fontWeight:700,
                textDecoration:'none', display:'inline-flex', alignItems:'center', gap:6,
              }}>
                Full Season →
              </Link>
            </div>
          )}

          {/* ── CONTENT ── */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', border:`2px solid ${C}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Loading {fxTerm.toLowerCase()}s...</p>
            </div>
          ) : fixtures.length === 0 ? (
            <div style={{ textAlign:'center', padding:'64px 24px', borderRadius:16, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.35)', marginBottom:8 }}>
                {selected ? `No ${fxTerm.toLowerCase()}s published for this date.` : `No upcoming ${fxTerm.toLowerCase()}s published yet.`}
              </p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.22)' }}>
                Check back soon, or view the <Link href={`/portal/fixtures/season?sport=${sport}`} style={{ color:C, textDecoration:'none', fontWeight:700 }}>full season schedule</Link>.
              </p>
            </div>
          ) : (
            <>
              {/* ── DESKTOP TABLE ── */}
              <div className="fx-table-wrap" style={{ borderRadius:16, overflow:'hidden', border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.025)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
                <div style={{ height:1, background:`linear-gradient(90deg,transparent,rgba(255,255,255,0.2) 30%,rgba(255,255,255,0.35) 50%,rgba(255,255,255,0.2) 70%,transparent)` }}/>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
                        {['Time','Team','Opponent','Venue','Weather','H/A','Coach','Umpire','Notes'].map(h => (
                          <th key={h} style={{ padding:'14px 18px', textAlign:'left', fontSize:10, fontWeight:700, letterSpacing:'0.15em', color:C, textTransform:'uppercase', whiteSpace:'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fixtures.map((f, i) => (
                        <tr key={f.id} className="fx-row" style={{ borderBottom: i < fixtures.length-1 ? `1px solid ${BORDER}` : 'none' }}>
                          <td style={{ padding:'16px 18px', whiteSpace:'nowrap' }}>
                            <span style={{ fontSize:15, fontWeight:800, color:C }}>{fTime(f.fixture_time)}</span>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src="/st-benedicts-logo.png" alt="SBC" style={{ width:22, height:22, objectFit:'contain' }}/>
                              <span style={{ fontSize:13, fontWeight:700, color:'white' }}>{f.team || 'SBC'}</span>
                            </div>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'rgba(255,255,255,0.6)', flexShrink:0 }}>
                                {(f.opponent||'?').split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                              </div>
                              <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.85)' }}>{f.opponent || '—'}</span>
                            </div>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <span style={{ fontSize:13, color:'rgba(255,255,255,0.55)' }}>{f.venue || '—'}</span>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            {f.home_away ? (
                              <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', padding:'3px 9px', borderRadius:20, background: f.home_away.toLowerCase()==='home' ? `${C}20` : 'rgba(255,255,255,0.07)', color: f.home_away.toLowerCase()==='home' ? C : 'rgba(255,255,255,0.45)' }}>
                                {f.home_away.toUpperCase()}
                              </span>
                            ) : <span style={{ color:'rgba(255,255,255,0.25)' }}>—</span>}
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <span style={{ fontSize:13, color: f.coach ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}>{f.coach || 'TBC'}</span>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <span style={{ fontSize:13, color: f.umpire ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.2)' }}>{f.umpire || 'TBC'}</span>
                          </td>
                          <td style={{ padding:'16px 18px' }}>
                            <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)', maxWidth:180, display:'block' }}>{f.notes || '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── MOBILE CARDS ── */}
              <div className="fx-cards">
                {fixtures.map(f => (
                  <div key={f.id} style={{ borderRadius:16, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.03)', overflow:'hidden', boxShadow:'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                    {/* Top: time + H/A */}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:`1px solid ${BORDER}`, background:`${C}0c` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <span style={{ fontSize:16, fontWeight:900, color:C }}>{fTime(f.fixture_time)}</span>
                      </div>
                      {f.home_away && (
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'0.1em', padding:'3px 10px', borderRadius:20, background: f.home_away.toLowerCase()==='home' ? `${C}22` : 'rgba(255,255,255,0.08)', color: f.home_away.toLowerCase()==='home' ? C : 'rgba(255,255,255,0.5)' }}>
                          {f.home_away.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Teams */}
                    <div style={{ padding:'14px 16px 4px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/st-benedicts-logo.png" alt="SBC" style={{ width:20, height:20, objectFit:'contain' }}/>
                        <span style={{ fontSize:14, fontWeight:800, color:'white' }}>{f.team || 'SBC'}</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', fontWeight:700 }}>vs</span>
                        <span style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.85)' }}>{f.opponent || '—'}</span>
                      </div>
                    </div>
                    {/* Details */}
                    <div style={{ padding:'8px 16px 14px', display:'flex', flexDirection:'column', gap:6 }}>
                      {[
                        f.venue  && { l:'Venue',  v:f.venue },
                        f.coach  && { l:'Coach',  v:f.coach },
                        f.umpire && { l:'Umpire', v:f.umpire },
                        f.notes  && { l:'Notes',  v:f.notes },
                      ].filter(Boolean).map((row: any) => (
                        <div key={row.l} style={{ display:'flex', gap:10, fontSize:12 }}>
                          <span style={{ color:'rgba(255,255,255,0.3)', fontWeight:700, minWidth:52, textTransform:'uppercase', fontSize:9.5, letterSpacing:'0.1em', paddingTop:2 }}>{row.l}</span>
                          <span style={{ color:'rgba(255,255,255,0.7)', lineHeight:1.5 }}>{row.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── SUMMARY CHIPS ── */}
              <div style={{ marginTop:20, display:'flex', flexWrap:'wrap', gap:10 }}>
                <div style={{ padding:'8px 14px', borderRadius:10, background:`${C}12`, border:`1px solid ${C}25`, fontSize:12, color:C, fontWeight:600 }}>
                  {fixtures.length} {fixtures.length === 1 ? fxTerm : `${fxTerm}s`}
                </div>
                {homeCount > 0 && (
                  <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>
                    {homeCount} Home
                  </div>
                )}
                {awayCount > 0 && (
                  <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>
                    {awayCount} Away
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </main>
    </>
  );
}

export default function FixturesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight:'100vh', background:'#0a0f1e' }}/>}>
      <FixturesInner />
    </Suspense>
  );
}
