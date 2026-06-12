'use client';
import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const SPORT_CONFIG: Record<string, { label: string; color: string }> = {
  hockey:   { label:'Hockey',   color:'#38bdf8' },
  rugby:    { label:'Rugby',    color:'#f87171' },
  cricket:  { label:'Cricket',  color:'#fbbf24' },
  swimming: { label:'Swimming', color:'#818cf8' },
  rowing:   { label:'Rowing',   color:'#34d399' },
};

function outcomeOf(score: string) {
  if (!score) return null;
  const p = score.split(/[-–]/);
  if (p.length !== 2) return null;
  const a = parseInt(p[0]), b = parseInt(p[1]);
  if (a > b) return 'WIN'; if (a < b) return 'LOSS'; return 'DRAW';
}
function outcomeColor(o: string | null) {
  if (o === 'WIN') return '#22c55e';
  if (o === 'DRAW') return '#fbbf24';
  if (o === 'LOSS') return '#f87171';
  return null;
}

function SeasonInner() {
  const searchParams = useSearchParams();
  const sport = searchParams.get('sport') || 'hockey';
  const cfg = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;
  const C = cfg.color;
  const BG = '#0a0f1e';
  const BORDER = 'rgba(255,255,255,0.07)';

  const [fixtures, setFixtures] = React.useState<Row[]>([]);
  const [results,  setResults]  = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [tab, setTab] = React.useState<'upcoming'|'results'>('upcoming');

  const today = new Date().toISOString().split('T')[0];

  React.useEffect(() => {
    Promise.all([
      supabase.from('portal_fixtures').select('*').eq('is_published',true).eq('sport',sport).order('fixture_date',{ascending:true}),
      supabase.from('portal_results').select('*').eq('is_published',true).eq('sport',sport).order('result_date',{ascending:false}),
    ]).then(([fx, res]) => {
      setFixtures(fx.data || []);
      setResults(res.data || []);
      setLoading(false);
    });
  }, [sport]);

  const upcoming = fixtures.filter(f => f.fixture_date >= today);
  const past     = fixtures.filter(f => f.fixture_date < today);

  // Group upcoming by date
  const groupedUpcoming = upcoming.reduce((acc: Record<string,Row[]>, f) => {
    if (!acc[f.fixture_date]) acc[f.fixture_date] = [];
    acc[f.fixture_date].push(f);
    return acc;
  }, {});

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family:'Inter',system-ui,sans-serif; box-sizing:border-box; }
        .fx-row { transition: background 0.15s; cursor: pointer; }
        .fx-row:hover { background: rgba(255,255,255,0.04) !important; }
        .back-link:hover { color: rgba(255,255,255,0.8) !important; }
      `}</style>

      <main style={{minHeight:'100vh',background:BG,color:'white'}}>

        {/* NAV */}
        <nav style={{borderBottom:`1px solid ${BORDER}`,background:'rgba(10,15,30,0.95)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50}}>
          <div style={{maxWidth:1100,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/st-benedicts-logo.png" alt="SBC" style={{width:34,height:34,objectFit:'contain'}}/>
              <div>
                <p style={{fontSize:14,fontWeight:700,color:'white',lineHeight:1}}>ST BENEDICT&apos;S COLLEGE</p>
                <p style={{fontSize:10,fontWeight:500,color:C,letterSpacing:'0.05em',marginTop:2,textTransform:'uppercase'}}>{cfg.label} Department</p>
              </div>
            </div>
            <Link href={`/portal?sport=${sport}`} className="back-link" style={{fontSize:13,color:'rgba(255,255,255,0.45)',textDecoration:'none',display:'flex',alignItems:'center',gap:6,transition:'color 0.2s'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:14,height:14}}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
              Back to Portal
            </Link>
          </div>
        </nav>

        <div style={{maxWidth:1100,margin:'0 auto',padding:'40px 24px 80px'}}>

          {/* HEADER */}
          <div style={{marginBottom:28}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:C,display:'inline-block',boxShadow:`0 0 8px ${C}`}}/>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:C,textTransform:'uppercase'}}>Season Schedule</span>
            </div>
            <h1 style={{fontSize:38,fontWeight:800,color:'white',lineHeight:1.1,marginBottom:6,letterSpacing:'-0.02em'}}>
              {cfg.label} Fixtures
            </h1>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.4)'}}>Full season schedule and results</p>
          </div>

          {/* STATS ROW */}
          {!loading && (
            <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:24}}>
              {[
                {label:'Total Fixtures', val:fixtures.length, col:C},
                {label:'Upcoming', val:upcoming.length, col:C},
                {label:'Wins', val:results.filter(r=>outcomeOf(r.final_score||'')==='WIN').length, col:'#22c55e'},
                {label:'Draws', val:results.filter(r=>outcomeOf(r.final_score||'')==='DRAW').length, col:'#fbbf24'},
                {label:'Losses', val:results.filter(r=>outcomeOf(r.final_score||'')==='LOSS').length, col:'#f87171'},
              ].map(s=>(
                <div key={s.label} style={{padding:'10px 18px',borderRadius:12,background:'rgba(255,255,255,0.035)',border:`1px solid rgba(255,255,255,0.08)`,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)'}}>
                  <p style={{fontSize:22,fontWeight:800,color:s.col,lineHeight:1}}>{s.val}</p>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:3,fontWeight:600,letterSpacing:'0.05em'}}>{s.label.toUpperCase()}</p>
                </div>
              ))}
            </div>
          )}

          {/* TABS */}
          <div style={{display:'flex',gap:8,marginBottom:20}}>
            {(['upcoming','results'] as const).map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{border:'none',borderRadius:20,padding:'8px 18px',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',background:tab===t?C:'rgba(255,255,255,0.05)',color:tab===t?'white':'rgba(255,255,255,0.5)'}}>
                {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Results (${results.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'60px 0'}}>Loading...</p>
          ) : tab === 'upcoming' ? (

            /* ── UPCOMING: grouped by date ── */
            upcoming.length === 0 ? (
              <p style={{color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'40px 0'}}>No upcoming fixtures.</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {Object.keys(groupedUpcoming).sort().map(date=>{
                  const d = new Date(date);
                  const dayFixtures = groupedUpcoming[date];
                  return (
                    <div key={date}>
                      {/* Date group header */}
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                        <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                          {d.toLocaleDateString('en-ZA',{weekday:'long', day:'numeric', month:'long'})}
                        </p>
                        <div style={{flex:1,height:1,background:BORDER}}/>
                        <Link href={`/portal/fixtures?date=${date}&sport=${sport}`} style={{fontSize:11,color:C,textDecoration:'none',fontWeight:600,whiteSpace:'nowrap'}}>
                          Full detail →
                        </Link>
                      </div>
                      {/* Fixture rows for this date */}
                      <div style={{borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`,background:'rgba(255,255,255,0.025)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.07)'}}>
                        {dayFixtures.map((f,i)=>(
                          <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${sport}`} className="fx-row"
                            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<dayFixtures.length-1?`1px solid ${BORDER}`:'none',textDecoration:'none',color:'inherit'}}>
                            {/* Time */}
                            <div style={{minWidth:52,textAlign:'center'}}>
                              <p style={{fontSize:15,fontWeight:800,color:C,lineHeight:1}}>{f.fixture_time||'TBC'}</p>
                            </div>
                            {/* Teams */}
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src="/st-benedicts-logo.png" alt="SBC" style={{width:20,height:20,objectFit:'contain'}}/>
                                <span style={{fontSize:13,fontWeight:700,color:'white'}}>{f.team||'SBC'}</span>
                                <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',fontWeight:600}}>vs</span>
                                <span style={{fontSize:13,fontWeight:600,color:'rgba(255,255,255,0.75)'}}>{f.opponent}</span>
                              </div>
                              <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{f.venue||'Venue TBC'}</p>
                            </div>
                            {/* Tags */}
                            <div style={{display:'flex',gap:6,alignItems:'center'}}>
                              {f.home_away&&<span style={{fontSize:9,fontWeight:700,padding:'3px 8px',borderRadius:20,background:f.home_away.toLowerCase()==='home'?`${C}20`:'rgba(255,255,255,0.06)',color:f.home_away.toLowerCase()==='home'?C:'rgba(255,255,255,0.4)'}}>{f.home_away.toUpperCase()}</span>}
                              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{width:13,height:13}}><path d="M9 18l6-6-6-6"/></svg>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )

          ) : (

            /* ── RESULTS ── */
            results.length === 0 ? (
              <p style={{color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'40px 0'}}>No results yet.</p>
            ) : (
              <div style={{borderRadius:14,overflow:'hidden',border:`1px solid ${BORDER}`,background:'rgba(255,255,255,0.025)',backdropFilter:'blur(16px)',WebkitBackdropFilter:'blur(16px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.07)'}}>
                {results.map((r,i)=>{
                  const outcome = outcomeOf(r.final_score||'');
                  const oc = outcomeColor(outcome) || 'rgba(255,255,255,0.3)';
                  return (
                    <div key={r.id} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 20px',borderBottom:i<results.length-1?`1px solid ${BORDER}`:'none'}}>
                      {/* Date */}
                      <div style={{minWidth:44,textAlign:'center'}}>
                        <p style={{fontSize:20,fontWeight:800,lineHeight:1,color:'white'}}>{new Date(r.result_date).getDate().toString().padStart(2,'0')}</p>
                        <p style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.4)',letterSpacing:'0.05em'}}>{new Date(r.result_date).toLocaleDateString('en-ZA',{month:'short'}).toUpperCase()}</p>
                      </div>
                      {/* Teams */}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>vs {r.opponent}</p>
                        <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{r.team}</p>
                      </div>
                      {/* Score + outcome */}
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:22,fontWeight:800,color:oc,lineHeight:1,marginBottom:4}}>{r.final_score||'—'}</p>
                        {outcome&&<span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',padding:'3px 8px',borderRadius:20,background:`${oc}18`,color:oc}}>{outcome}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      </main>
    </>
  );
}

export default function SeasonFixturesPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0a0f1e'}}/>}>
      <SeasonInner />
    </Suspense>
  );
}
