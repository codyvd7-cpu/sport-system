'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const SPORT_CONFIG: Record<string, { label: string; color: string; colorDim: string }> = {
  hockey:   { label:'Hockey',    color:'#38bdf8', colorDim:'rgba(56,189,248,0.08)'  },
  rugby:    { label:'Rugby',     color:'#f87171', colorDim:'rgba(248,113,113,0.08)' },
  cricket:  { label:'Cricket',   color:'#fbbf24', colorDim:'rgba(251,191,36,0.08)'  },
  swimming: { label:'Swimming',  color:'#818cf8', colorDim:'rgba(129,140,248,0.08)' },
  rowing:   { label:'Rowing',    color:'#34d399', colorDim:'rgba(52,211,153,0.08)'  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return {
    full: d.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
    short: d.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' }),
    day: d.toLocaleDateString('en-ZA', { weekday:'long' }),
  };
}

function FixturesInner() {
  const searchParams = useSearchParams();
  const sport = searchParams.get('sport') || 'hockey';
  const date  = searchParams.get('date') || '';
  const cfg   = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;

  const [fixtures, setFixtures] = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);

  React.useEffect(() => {
    if (!date) { setLoading(false); return; }
    supabase
      .from('portal_fixtures')
      .select('*')
      .eq('is_published', true)
      .eq('sport', sport)
      .eq('fixture_date', date)
      .order('fixture_time', { ascending: true })
      .then(({ data }) => {
        setFixtures(data || []);
        setLoading(false);
      });
  }, [date, sport]);

  const fmt = date ? formatDate(date) : null;
  const C   = cfg.color;
  const BG  = '#0a0f1e';
  const BORDER = 'rgba(255,255,255,0.07)';

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        .fx-row:hover td { background: rgba(255,255,255,0.03) !important; }
        .back-link:hover { color: rgba(255,255,255,0.8) !important; }
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
                <p style={{ fontSize:10, fontWeight:500, color:C, letterSpacing:'0.05em', marginTop:2, textTransform:'uppercase' }}>{cfg.label} Department</p>
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
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ width:7, height:7, borderRadius:'50%', background:C, display:'inline-block', boxShadow:`0 0 8px ${C}` }}/>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:C, textTransform:'uppercase' }}>Fixtures</span>
            </div>
            <h1 style={{ fontSize:38, fontWeight:800, color:'white', lineHeight:1.1, marginBottom:6, letterSpacing:'-0.02em' }}>
              {fmt?.day || 'Fixture Day'}
            </h1>
            <p style={{ fontSize:15, color:'rgba(255,255,255,0.45)' }}>{fmt?.full}</p>
          </div>

          {/* ── TABLE ── */}
          {loading ? (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <div style={{ width:24, height:24, borderRadius:'50%', border:`2px solid ${C}`, borderTopColor:'transparent', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }}/>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.3)' }}>Loading fixtures...</p>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : fixtures.length === 0 ? (
            <div style={{ textAlign:'center', padding:'60px 0', borderRadius:16, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.02)' }}>
              <p style={{ fontSize:15, color:'rgba(255,255,255,0.25)' }}>No fixtures published for this date.</p>
            </div>
          ) : (
            <div style={{ borderRadius:16, overflow:'hidden', border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.025)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', boxShadow:'0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.07)' }}>
              {/* Specular */}
              <div style={{ height:1, background:`linear-gradient(90deg,transparent,rgba(255,255,255,0.2) 30%,rgba(255,255,255,0.35) 50%,rgba(255,255,255,0.2) 70%,transparent)` }}/>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:`1px solid ${BORDER}` }}>
                      {['Time','Team','Opponent','Venue','H/A','Coach','Umpire','Notes'].map(h => (
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
                          <span style={{ fontSize:15, fontWeight:800, color:C }}>{f.fixture_time || '—'}</span>
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
          )}

          {/* ── SUMMARY CHIPS ── */}
          {!loading && fixtures.length > 0 && (
            <div style={{ marginTop:20, display:'flex', flexWrap:'wrap', gap:10 }}>
              <div style={{ padding:'8px 14px', borderRadius:10, background:`${C}12`, border:`1px solid ${C}25`, fontSize:12, color:C, fontWeight:600 }}>
                {fixtures.length} {fixtures.length === 1 ? 'Fixture' : 'Fixtures'}
              </div>
              {fixtures.filter(f=>f.home_away?.toLowerCase()==='home').length > 0 && (
                <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>
                  {fixtures.filter(f=>f.home_away?.toLowerCase()==='home').length} Home
                </div>
              )}
              {fixtures.filter(f=>f.home_away?.toLowerCase()==='away').length > 0 && (
                <div style={{ padding:'8px 14px', borderRadius:10, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', fontSize:12, color:'rgba(255,255,255,0.55)', fontWeight:600 }}>
                  {fixtures.filter(f=>f.home_away?.toLowerCase()==='away').length} Away
                </div>
              )}
            </div>
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
