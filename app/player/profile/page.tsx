'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const BG     = '#060c1a';
const BORDER = 'rgba(255,255,255,0.08)';
const CARD   = 'rgba(255,255,255,0.03)';

const SPORT_COLORS: Record<string,string> = {
  hockey:'#38bdf8', rugby:'#f87171', cricket:'#fbbf24',
  swimming:'#818cf8', rowing:'#34d399', athletics:'#fb923c',
  waterpolo:'#60a5fa', soccer:'#22c55e', golf:'#fbbf24',
};

const TABS = [
  { id:'home',     label:'Home',     icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id:'schedule', label:'Schedule', icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id:'results',  label:'Results',  icon:'M18 20V10M12 20V4M6 20v-6' },
  { id:'profile',  label:'Profile',  icon:'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8' },
];

function Icon({ d, size=16, color='currentColor', sw=1.8 }:{d:string;size?:number;color?:string;sw?:number}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{width:size,height:size,flexShrink:0}}>
      {d.split(' M').map((seg,i)=><path key={i} d={i===0?seg:'M'+seg}/>)}
    </svg>
  );
}

function timeAgo(str:string) {
  if(!str) return '';
  const d=Math.floor((Date.now()-new Date(str).getTime())/86400000);
  if(d===0) return 'Today'; if(d===1) return 'Yesterday';
  if(d<7) return `${d}d ago`; if(d<30) return `${Math.floor(d/7)}w ago`;
  return `${Math.floor(d/30)}mo ago`;
}

function fmtDate(s:string, opts:Intl.DateTimeFormatOptions) {
  return new Date(s).toLocaleDateString('en-ZA', opts);
}

export default function PlayerProfile() {
  const router = useRouter();
  const [tab,       setTab]       = React.useState('home');
  const [profile,   setProfile]   = React.useState<Row|null>(null);
  const [athlete,   setAthlete]   = React.useState<Row|null>(null);
  const [fixtures,  setFixtures]  = React.useState<Row[]>([]);
  const [results,   setResults]   = React.useState<Row[]>([]);
  const [reminders, setReminders] = React.useState<Row[]>([]);
  const [weekItems, setWeekItems] = React.useState<Row[]>([]);
  const [att,       setAtt]       = React.useState<number|null>(null);
  const [loading,   setLoading]   = React.useState(true);
  const [ready,     setReady]     = React.useState(false);

  React.useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/player/auth');return;}
      const {data:prof}=await supabase.from('player_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
      if(!prof){router.replace('/player/setup');return;}
      setProfile(prof); setLoading(false);
      const sports=(prof.sports||[]).map((s:string)=>s.toLowerCase());
      const primary=sports[0]||'hockey';
      const today=new Date().toISOString().split('T')[0];
      const[fxR,resR,remR,planR]=await Promise.all([
        supabase.from('portal_fixtures').select('*').eq('sport',primary).eq('is_published',true).gte('fixture_date',today).order('fixture_date').limit(6),
        supabase.from('portal_results').select('*').eq('sport',primary).eq('is_published',true).order('result_date',{ascending:false}).limit(10),
        supabase.from('portal_reminders').select('*').eq('sport',primary).eq('is_published',true).order('created_at',{ascending:false}).limit(5),
        supabase.from('portal_week_plans').select('id').eq('sport',primary).eq('published',true).order('created_at',{ascending:false}).limit(1),
      ]);
      setFixtures(fxR.data||[]);
      setResults(resR.data||[]);
      setReminders(remR.data||[]);
      if(planR.data?.length){
        const{data:items}=await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id',planR.data[0].id).order('sort_order');
        setWeekItems(items||[]);
      }
      if(prof.athlete_id){
        const[{data:ath},{data:attRows}]=await Promise.all([
          supabase.from('athletes').select('*').eq('id',prof.athlete_id).maybeSingle(),
          supabase.from('attendance').select('status').eq('athlete_id',prof.athlete_id),
        ]);
        setAthlete(ath);
        if(attRows?.length){
          const pres=attRows.filter((a:Row)=>['present','late'].includes((a.status||'').toLowerCase())).length;
          setAtt(Math.round((pres/attRows.length)*100));
        }
      }
      setReady(true);
    });
  },[router]);

  if(loading) return(
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{width:26,height:26,borderRadius:'50%',border:'3px solid #38bdf8',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(!profile) return null;

  const sports=(profile.sports||[]).map((s:string)=>s.toLowerCase());
  const primary=sports[0]||'hockey';
  const C=SPORT_COLORS[primary]||'#38bdf8';
  const initials=(profile.full_name||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
  const firstName=(profile.full_name||'').split(' ')[0];

  const wins=results.filter(r=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])>parseInt(p[1]);}).length;
  const draws=results.filter(r=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])===parseInt(p[1]);}).length;
  const losses=results.length-wins-draws;
  const nextFixture=fixtures[0]||null;

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,sans-serif;background:${BG};color:white;overflow-x:hidden;}
      ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
      .fade{animation:fadeUp 0.4s ease both}
      .row:hover{background:rgba(255,255,255,0.04)!important}
      .tab-btn:hover{color:white!important}
      /* Desktop sidebar */
      .sidebar{display:none}
      .main-body{margin-left:0;padding-bottom:80px}
      @media(min-width:768px){
        .sidebar{display:flex!important;flex-direction:column}
        .main-body{margin-left:220px;padding-bottom:0}
        .bot-nav{display:none!important}
      }
    `}</style>

    <div style={{display:'flex',minHeight:'100vh'}}>

      {/* ── SIDEBAR (desktop) ── */}
      <aside className="sidebar" style={{width:220,flexShrink:0,position:'fixed',inset:'0 auto 0 0',background:'#040810',borderRight:`1px solid ${BORDER}`,zIndex:40,overflowY:'auto',padding:'0 0 20px'}}>
        {/* Brand */}
        <div style={{padding:'18px 16px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:10}}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={34} height={34} style={{objectFit:'contain',flexShrink:0}}/>
          <div>
            <p style={{fontSize:10,fontWeight:800,color:'white',lineHeight:1.2}}>ST BENEDICT&apos;S</p>
            <p style={{fontSize:9,color:C,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',marginTop:2}}>{primary}</p>
          </div>
        </div>

        {/* Player pill */}
        <div style={{margin:'16px 12px',padding:'12px',borderRadius:12,background:`${C}10`,border:`1px solid ${C}25`,display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:900,flexShrink:0}}>{initials}</div>
          <div style={{minWidth:0}}>
            <p style={{fontSize:12,fontWeight:800,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.full_name}</p>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:1}}>{profile.grade||''}{athlete?.team?` · ${athlete.team}`:''}</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{padding:'4px 10px'}}>
          {TABS.map(t=>{
            const active=tab===t.id;
            return(
              <button key={t.id} onClick={()=>setTab(t.id)}
                className="tab-btn"
                style={{width:'100%',display:'flex',alignItems:'center',gap:11,padding:'10px 12px',borderRadius:10,border:'none',cursor:'pointer',marginBottom:2,textAlign:'left',background:active?C:'transparent',color:active?'white':'rgba(255,255,255,0.4)',fontWeight:active?700:500,fontSize:13,transition:'all 0.15s'}}>
                <Icon d={t.icon} size={15} color={active?'white':'rgba(255,255,255,0.4)'}/>
                {t.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div style={{marginTop:'auto',padding:'12px 10px 0',borderTop:`1px solid ${BORDER}`}}>
          <Link href="/player/setup" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,color:'rgba(255,255,255,0.4)',textDecoration:'none',fontSize:12,fontWeight:500}}>
            <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={14}/>
            Edit Profile
          </Link>
          <button onClick={async()=>{await supabase.auth.signOut();router.push('/player/auth');}}
            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:10,border:'none',cursor:'pointer',color:'rgba(248,113,113,0.7)',fontSize:12,fontWeight:500,background:'transparent',textAlign:'left'}}>
            <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={14} color="rgba(248,113,113,0.7)"/>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="main-body" style={{flex:1,minHeight:'100vh'}}>

        {/* Mobile header */}
        <header style={{position:'sticky',top:0,zIndex:30,background:'rgba(6,12,26,0.95)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${BORDER}`,height:52,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}} className="sidebar-hidden">
          <style>{`.sidebar-hidden{display:flex}@media(min-width:768px){.sidebar-hidden{display:none!important}}`}</style>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={28} height={28} style={{objectFit:'contain'}}/>
            <span style={{fontSize:13,fontWeight:800,color:'white'}}>Player</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'4px 12px 4px 4px',border:`1px solid ${BORDER}`}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900}}>{initials}</div>
            <span style={{fontSize:12,fontWeight:600}}>{firstName}</span>
          </div>
        </header>

        <main style={{padding:'16px',maxWidth:800,margin:'0 auto'}}>

          {/* ══ HOME TAB ══ */}
          {tab==='home'&&(
            <div className="fade">
              {/* Welcome */}
              <div style={{marginBottom:20}}>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:3}}>Welcome back</p>
                <h1 style={{fontSize:26,fontWeight:900,letterSpacing:'-0.02em',lineHeight:1}}>{profile.full_name}</h1>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,fontWeight:700,color:C,background:`${C}15`,border:`1px solid ${C}30`,borderRadius:20,padding:'3px 10px',textTransform:'capitalize'}}>{primary}</span>
                  {profile.grade&&<span style={{fontSize:11,color:'rgba(255,255,255,0.45)',background:'rgba(255,255,255,0.06)',border:`1px solid ${BORDER}`,borderRadius:20,padding:'3px 10px'}}>{profile.grade}</span>}
                  {athlete?.team&&<span style={{fontSize:11,color:'rgba(255,255,255,0.45)',background:'rgba(255,255,255,0.06)',border:`1px solid ${BORDER}`,borderRadius:20,padding:'3px 10px'}}>{athlete.team}</span>}
                </div>
              </div>

              {/* Next fixture - hero card */}
              {nextFixture?(
                <Link href={`/portal/fixtures?date=${nextFixture.fixture_date}&sport=${primary}`}
                  style={{display:'block',textDecoration:'none',marginBottom:14}}>
                  <div style={{borderRadius:18,background:`linear-gradient(135deg,${C}18,${C}08)`,border:`1px solid ${C}35`,padding:'18px 20px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:-20,right:-20,width:100,height:100,borderRadius:'50%',background:`${C}12`,pointerEvents:'none'}}/>
                    <p style={{fontSize:10,fontWeight:800,color:C,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:10}}>Next Match</p>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                      <div>
                        <p style={{fontSize:22,fontWeight:900,color:'white',marginBottom:4}}>vs {nextFixture.opponent}</p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{nextFixture.team}</p>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <p style={{fontSize:20,fontWeight:900,color:'white',lineHeight:1}}>{fmtDate(nextFixture.fixture_date,{day:'numeric',month:'short'})}</p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',marginTop:4}}>{nextFixture.fixture_time||'TBC'} · {nextFixture.home_away||'—'}</p>
                      </div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,marginTop:14,color:C,fontSize:12,fontWeight:700}}>
                      View fixture details
                      <Icon d="M5 12h14M12 5l7 7-7 7" size={13} color={C}/>
                    </div>
                  </div>
                </Link>
              ):(
                <div style={{borderRadius:18,background:CARD,border:`1px solid ${BORDER}`,padding:'20px',marginBottom:14,textAlign:'center'}}>
                  <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" size={28} color="rgba(255,255,255,0.1)"/>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.3)',marginTop:10}}>No upcoming fixtures</p>
                </div>
              )}

              {/* Stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                {[
                  {label:'Attendance', val:att!==null?`${att}%`:'—', color:att!==null&&att>=80?'#22c55e':att!==null?'#fbbf24':'rgba(255,255,255,0.3)', icon:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'},
                  {label:'Season W', val:results.length?String(wins):'—', color:wins>0?'#22c55e':'rgba(255,255,255,0.3)', icon:'M18 20V10M12 20V4M6 20v-6'},
                  {label:'Fixtures', val:String(fixtures.length), color:fixtures.length>0?C:'rgba(255,255,255,0.3)', icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'},
                ].map(s=>(
                  <div key={s.label} style={{borderRadius:14,background:CARD,border:`1px solid ${BORDER}`,padding:'14px 12px',textAlign:'center'}}>
                    <Icon d={s.icon} size={16} color={s.color} sw={2}/>
                    <p style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1,margin:'8px 0 4px'}}>{s.val}</p>
                    <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Updates */}
              {reminders.length>0&&(
                <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden',marginBottom:14}}>
                  <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>Latest Updates</p>
                  </div>
                  {reminders.map((r,i)=>(
                    <div key={r.id} className="row" style={{padding:'12px 16px',borderBottom:i<reminders.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s',cursor:'default'}}>
                      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:C,flexShrink:0,marginTop:4}}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:3}}>
                            <p style={{fontSize:13,fontWeight:700,color:'white'}}>{r.title}</p>
                            <p style={{fontSize:10,color:'rgba(255,255,255,0.28)',flexShrink:0}}>{timeAgo(r.created_at||'')}</p>
                          </div>
                          {(r.details||r.body)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.55}}>{r.details||r.body}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recent result */}
              {results.length>0&&(()=>{
                const r=results[0];
                const p=r.final_score?.split(/[-–]/);
                const outcome=p?.length===2?(parseInt(p[0])>parseInt(p[1])?'WIN':parseInt(p[0])<parseInt(p[1])?'LOSS':'DRAW'):null;
                const oc=outcome==='WIN'?'#22c55e':outcome==='LOSS'?'#f87171':'#fbbf24';
                return(
                  <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'14px 16px',display:'flex',alignItems:'center',gap:14}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Most Recent</p>
                      <p style={{fontSize:15,fontWeight:800,color:'white',marginBottom:2}}>vs {r.opponent}</p>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{r.team} · {fmtDate(r.result_date,{day:'numeric',month:'short'})}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:28,fontWeight:900,color:oc,lineHeight:1,marginBottom:4}}>{r.final_score||'—'}</p>
                      {outcome&&<span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:`${oc}18`,color:oc,border:`1px solid ${oc}25`}}>{outcome}</span>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ══ SCHEDULE TAB ══ */}
          {tab==='schedule'&&(
            <div className="fade">
              <h2 style={{fontSize:20,fontWeight:900,marginBottom:16}}>Schedule</h2>

              {/* Training week */}
              {weekItems.length>0&&(
                <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden',marginBottom:14}}>
                  <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`}}>
                    <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>This Week — Training</p>
                  </div>
                  {weekItems.map((item,i)=>(
                    <div key={item.id} className="row" style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderBottom:i<weekItems.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s'}}>
                      <div style={{minWidth:44,textAlign:'center'}}>
                        <p style={{fontSize:11,fontWeight:800,color:C,textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p>
                      </div>
                      <div style={{width:1,height:32,background:`${C}30`,flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>{item.title}</p>
                        <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{item.subtitle||''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Fixtures */}
              <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
                <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>Upcoming Fixtures</p>
                  <Link href={`/portal/fixtures/season?sport=${primary}`} style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none'}}>All →</Link>
                </div>
                {!ready?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading…</p>:
                fixtures.length===0?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No fixtures scheduled.</p>:
                fixtures.map((f,i)=>(
                  <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${primary}`} className="row"
                    style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:i<fixtures.length-1?`1px solid ${BORDER}`:'none',textDecoration:'none',color:'inherit',transition:'background 0.15s'}}>
                    <div style={{minWidth:44,textAlign:'center',flexShrink:0}}>
                      <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>{fmtDate(f.fixture_date,{month:'short'})}</p>
                      <p style={{fontSize:22,fontWeight:900,color:'white',lineHeight:1}}>{new Date(f.fixture_date).getDate()}</p>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:14,fontWeight:800,color:'white',marginBottom:3}}>vs {f.opponent}</p>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{f.team}</p>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:3}}>{f.fixture_time||'TBC'}</p>
                      <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:f.home_away==='home'?`${C}20`:'rgba(255,255,255,0.06)',color:f.home_away==='home'?C:'rgba(255,255,255,0.4)',border:`1px solid ${f.home_away==='home'?C+'35':'transparent'}`}}>
                        {(f.home_away||'').toUpperCase()||'—'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* ══ RESULTS TAB ══ */}
          {tab==='results'&&(
            <div className="fade">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <h2 style={{fontSize:20,fontWeight:900}}>Results</h2>
                <Link href={`/portal/fixtures/season?sport=${primary}&tab=results`} style={{fontSize:12,fontWeight:700,color:C,textDecoration:'none'}}>Full season →</Link>
              </div>

              {/* Season summary */}
              {results.length>0&&(
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                  {[
                    {label:'Wins',   val:wins,   color:'#22c55e'},
                    {label:'Draws',  val:draws,  color:'#fbbf24'},
                    {label:'Losses', val:losses, color:'#f87171'},
                  ].map(s=>(
                    <div key={s.label} style={{borderRadius:12,background:CARD,border:`1px solid ${BORDER}`,padding:'14px',textAlign:'center'}}>
                      <p style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1,marginBottom:4}}>{s.val}</p>
                      <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
                {!ready?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading…</p>:
                results.length===0?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No results published yet.</p>:
                results.map((r,i)=>{
                  const p=r.final_score?.split(/[-–]/);
                  const outcome=p?.length===2?(parseInt(p[0])>parseInt(p[1])?'WIN':parseInt(p[0])<parseInt(p[1])?'LOSS':'DRAW'):null;
                  const oc=outcome==='WIN'?'#22c55e':outcome==='LOSS'?'#f87171':'#fbbf24';
                  return(
                    <div key={r.id} className="row" style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:i<results.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s'}}>
                      <div style={{minWidth:40,textAlign:'center',flexShrink:0}}>
                        <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(r.result_date,{month:'short'})}</p>
                        <p style={{fontSize:20,fontWeight:900,color:'white',lineHeight:1}}>{new Date(r.result_date).getDate()}</p>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:14,fontWeight:800,color:'white',marginBottom:2}}>vs {r.opponent}</p>
                        <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{r.team}</p>
                      </div>
                      <div style={{textAlign:'right',flexShrink:0}}>
                        <p style={{fontSize:24,fontWeight:900,color:oc,lineHeight:1,marginBottom:4}}>{r.final_score||'—'}</p>
                        {outcome&&<span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:`${oc}18`,color:oc,border:`1px solid ${oc}25`}}>{outcome}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ PROFILE TAB ══ */}
          {tab==='profile'&&(
            <div className="fade">
              <h2 style={{fontSize:20,fontWeight:900,marginBottom:16}}>My Profile</h2>

              {/* Profile card */}
              <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px',marginBottom:14}}>
                <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20}}>
                  <div style={{width:64,height:64,borderRadius:'50%',background:`linear-gradient(145deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:900,flexShrink:0,boxShadow:`0 8px 24px ${C}30`}}>{initials}</div>
                  <div>
                    <p style={{fontSize:18,fontWeight:900,color:'white',marginBottom:3}}>{profile.full_name}</p>
                    <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{profile.email||''}</p>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[
                    {label:'Grade', val:profile.grade||'Not set'},
                    {label:'Primary Sport', val:primary.charAt(0).toUpperCase()+primary.slice(1)},
                    {label:'Team', val:athlete?.team||'Not linked'},
                    {label:'Position', val:athlete?.position||'—'},
                  ].map(item=>(
                    <div key={item.label} style={{borderRadius:10,background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,padding:'12px 14px'}}>
                      <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em',fontWeight:700,marginBottom:4}}>{item.label}</p>
                      <p style={{fontSize:13,fontWeight:700,color:'white'}}>{item.val}</p>
                    </div>
                  ))}
                </div>
                {!profile.athlete_id&&(
                  <div style={{marginTop:14,padding:'12px 14px',borderRadius:10,background:'rgba(251,191,36,0.07)',border:'1px solid rgba(251,191,36,0.2)'}}>
                    <p style={{fontSize:12,fontWeight:700,color:'#fbbf24',marginBottom:2}}>Account not linked to an athlete record</p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>Your attendance and personal stats will appear once your coach links your account.</p>
                  </div>
                )}
              </div>

              {/* Sports */}
              <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden',marginBottom:14}}>
                <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`}}>
                  <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>My Sports</p>
                </div>
                {sports.map((sport:string,i:number)=>{
                  const sc=SPORT_COLORS[sport]||C;
                  return(
                    <div key={sport} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:i<sports.length-1?`1px solid ${BORDER}`:'none'}}>
                      <div style={{width:40,height:40,borderRadius:10,background:`${sc}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:`1px solid ${sc}25`}}>
                        <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" size={18} color={sc}/>
                      </div>
                      <p style={{flex:1,fontSize:14,fontWeight:700,color:'white',textTransform:'capitalize'}}>{sport}</p>
                      <span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:i===0?`${sc}18`:'rgba(255,255,255,0.06)',color:i===0?sc:'rgba(255,255,255,0.35)',border:`1px solid ${i===0?sc+'30':'transparent'}`}}>
                        {i===0?'PRIMARY':'SECONDARY'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Link href="/player/setup" style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`1px solid ${BORDER}`,background:CARD,textDecoration:'none',color:'white'}}>
                  <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={16} color={C}/>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:700}}>Edit Profile</p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginTop:1}}>Update name, grade and sports</p>
                  </div>
                  <Icon d="M9 18l6-6-6-6" size={14} color="rgba(255,255,255,0.3)"/>
                </Link>
                <button onClick={async()=>{await supabase.auth.signOut();router.push('/player/auth');}}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:'1px solid rgba(248,113,113,0.2)',background:'rgba(248,113,113,0.06)',cursor:'pointer',color:'#f87171',textAlign:'left',width:'100%'}}>
                  <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} color="#f87171"/>
                  <div style={{flex:1}}>
                    <p style={{fontSize:13,fontWeight:700}}>Sign Out</p>
                    <p style={{fontSize:11,color:'rgba(248,113,113,0.5)',marginTop:1}}>Sign out of your account</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="bot-nav" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:50,background:'rgba(6,12,26,0.97)',backdropFilter:'blur(12px)',borderTop:`1px solid ${BORDER}`,padding:'8px 0 10px',display:'flex',justifyContent:'space-around'}}>
          {TABS.map(t=>{
            const active=tab===t.id;
            return(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:'4px 16px',border:'none',background:'none',cursor:'pointer',color:active?C:'rgba(255,255,255,0.35)',transition:'color 0.15s'}}>
                <Icon d={t.icon} size={18} color={active?C:'rgba(255,255,255,0.35)'}/>
                <span style={{fontSize:9,fontWeight:active?800:600,letterSpacing:'0.04em'}}>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  </>);
}
