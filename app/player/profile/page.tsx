'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const ACCENT  = '#3b82f6';
const BG      = '#0a0e1a';
const SIDEBAR = '#080c17';
const CARD    = 'rgba(255,255,255,0.03)';
const BORDER  = 'rgba(255,255,255,0.07)';

const SPORT_COLORS: Record<string, string> = {
  hockey:'#38bdf8', rugby:'#f87171', cricket:'#fbbf24',
  swimming:'#818cf8', rowing:'#34d399', athletics:'#fb923c',
};

const NAV_ITEMS = [
  { id:'overview',    label:'Overview',    d:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id:'schedule',    label:'Schedule',    d:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id:'mysports',    label:'My Sports',   d:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id:'teams',       label:'Teams',       d:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id:'performance', label:'Performance', d:'M18 20V10M12 20V4M6 20v-6' },
  { id:'results',     label:'Results',     d:'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { id:'documents',   label:'Documents',   d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
  { id:'medical',     label:'Medical',     d:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id:'payments',    label:'Payments',    d:'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M1 10h22' },
  { id:'settings',    label:'Settings',    d:'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
];

function SvgIcon({ d, size=16, color='currentColor', sw=1.8 }: {d:string;size?:number;color?:string;sw?:number}) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{width:size,height:size,flexShrink:0}}>
      {d.split(' M').map((seg,i)=><path key={i} d={i===0?seg:'M'+seg}/>)}
    </svg>
  );
}

function timeAgo(str: string) {
  if (!str) return '';
  const d = Math.floor((Date.now()-new Date(str).getTime())/86400000);
  if (d===0) return 'Today'; if (d===1) return '1 day ago';
  if (d<7)   return `${d} days ago`; if (d<30) return `${Math.floor(d/7)}w ago`;
  return `${Math.floor(d/30)}mo ago`;
}

// Outside page component to prevent re-mount issues
function OpponentBadge({name}:{name:string}) {
  const ini=(name||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  return (
    <div style={{width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.07)',border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.65)',flexShrink:0}}>{ini}</div>
  );
}

export default function PlayerProfilePage() {
  const router = useRouter();
  const [profile,    setProfile]    = React.useState<Row|null>(null);
  const [athlete,    setAthlete]    = React.useState<Row|null>(null);
  const [loading,    setLoading]    = React.useState(true);
  const [activeNav,  setActiveNav]  = React.useState('overview');
  const [fixtures,   setFixtures]   = React.useState<Row[]>([]);
  const [results,    setResults]    = React.useState<Row[]>([]);
  const [reminders,  setReminders]  = React.useState<Row[]>([]);
  const [weekItems,  setWeekItems]  = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<number|null>(null);
  const [dataReady,  setDataReady]  = React.useState(false);

  React.useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/player/auth');return;}
      const {data:prof}=await supabase.from('player_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
      if(!prof){router.replace('/player/setup');return;}
      setProfile(prof);
      setLoading(false);

      const sports=(prof.sports||[]).map((s:string)=>s.toLowerCase());
      const primary=sports[0]||'hockey';
      const today=new Date().toISOString().split('T')[0];

      const [fxR,resR,remR,planR]=await Promise.all([
        supabase.from('portal_fixtures').select('*').eq('sport',primary).eq('is_published',true).gte('fixture_date',today).order('fixture_date').limit(5),
        supabase.from('portal_results').select('*').eq('sport',primary).eq('is_published',true).order('result_date',{ascending:false}).limit(5),
        supabase.from('portal_reminders').select('*').eq('sport',primary).eq('is_published',true).order('created_at',{ascending:false}).limit(4),
        supabase.from('portal_week_plans').select('id').eq('sport',primary).eq('published',true).order('created_at',{ascending:false}).limit(1),
      ]);
      setFixtures(fxR.data||[]);
      setResults(resR.data||[]);
      setReminders(remR.data||[]);

      if(planR.data?.length){
        const {data:items}=await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id',planR.data[0].id).order('sort_order');
        setWeekItems(items||[]);
      }
      if(prof.athlete_id){
        const {data:ath}=await supabase.from('athletes').select('*').eq('id',prof.athlete_id).maybeSingle();
        setAthlete(ath);
        const {data:att}=await supabase.from('attendance').select('status').eq('athlete_id',prof.athlete_id);
        if(att?.length){
          const pres=att.filter((a:Row)=>['present','late'].includes((a.status||'').toLowerCase())).length;
          setAttendance(Math.round((pres/att.length)*100));
        }
      }
      setDataReady(true);
    });
  },[router]);

  if(loading) return (
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:`3px solid ${ACCENT}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(!profile) return null;

  const firstName=(profile.full_name||'').split(' ')[0];
  const initials=(profile.full_name||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
  const sports=(profile.sports||[]).map((s:string)=>s.toLowerCase());
  const primary=sports[0]||'hockey';
  const C=SPORT_COLORS[primary]||ACCENT;

  const wins=results.filter(r=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])>parseInt(p[1]);}).length;
  const draws=results.filter(r=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])===parseInt(p[1]);}).length;
  const losses=results.length-wins-draws;

  const DOT_COLORS=[C,'#fbbf24','#22c55e','#818cf8'];

  const schedule: Row[] = [
    ...weekItems.slice(0,3).map(w=>({...w,_type:'session'})),
    ...fixtures.slice(0,2).map(f=>({...f,_type:'fixture'})),
  ].slice(0,5);

  return (<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
      *{font-family:'Inter',system-ui,sans-serif;box-sizing:border-box;margin:0;padding:0;}
      ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      @keyframes spin{to{transform:rotate(360deg)}}
      .nbtn:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
      .rhov:hover{background:rgba(255,255,255,0.04)!important;}
      .qbtn:hover{background:rgba(255,255,255,0.07)!important;color:white!important;}
      @media(max-width:1024px){
        .sb{display:none!important;}
        .body{margin-left:0!important;}
        .mid{grid-template-columns:1fr!important;}
        .bot{grid-template-columns:1fr!important;}
        .hero{flex-direction:column!important;}
        .spc{width:100%!important;}
      }
    `}</style>

    <div style={{display:'flex',minHeight:'100vh',background:BG,color:'white'}}>

      {/* ── SIDEBAR ── */}
      <aside className="sb" style={{width:228,flexShrink:0,position:'fixed',inset:'0 auto 0 0',background:SIDEBAR,borderRight:`1px solid ${BORDER}`,display:'flex',flexDirection:'column',zIndex:40,overflowY:'auto'}}>
        {/* Brand */}
        <div style={{padding:'20px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:12}}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={38} height={38} style={{objectFit:'contain',flexShrink:0}}/>
          <div>
            <p style={{fontSize:11,fontWeight:800,color:'white',lineHeight:1.25}}>ST BENEDICT&apos;S COLLEGE</p>
            <p style={{fontSize:9,fontWeight:600,color:C,letterSpacing:'0.07em',textTransform:'uppercase',marginTop:3}}>{primary} department</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{padding:'10px 10px',flex:1}}>
          {NAV_ITEMS.map(n=>{
            const active=activeNav===n.id;
            return (
              <button key={n.id} className="nbtn" onClick={()=>setActiveNav(n.id)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,border:'none',cursor:'pointer',marginBottom:2,transition:'all 0.15s',textAlign:'left',background:active?C:'transparent',color:active?'white':'rgba(255,255,255,0.42)',fontWeight:active?700:500,fontSize:13}}>
                <SvgIcon d={n.d} size={15} color={active?'white':undefined}/>
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* Help */}
        <div style={{margin:'0 12px 20px',borderRadius:12,background:'rgba(255,255,255,0.04)',border:`1px solid ${BORDER}`,padding:'14px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
            <div style={{width:30,height:30,borderRadius:8,background:`${C}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <SvgIcon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" size={14} color={C}/>
            </div>
            <div>
              <p style={{fontSize:12,fontWeight:700,color:'white'}}>Need Help?</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:1}}>Contact the {primary.charAt(0).toUpperCase()+primary.slice(1)} Department</p>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <SvgIcon d="M5 12h14M12 5l7 7-7 7" size={13} color={C}/>
          </div>
        </div>
      </aside>

      {/* ── BODY ── */}
      <div className="body" style={{flex:1,marginLeft:228,display:'flex',flexDirection:'column'}}>

        {/* Top bar */}
        <header style={{height:58,borderBottom:`1px solid ${BORDER}`,background:'rgba(8,12,23,0.96)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'flex-end',padding:'0 28px',gap:12}}>
          <button style={{position:'relative',width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <SvgIcon d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0" size={15} color="rgba(255,255,255,0.6)"/>
            {reminders.length>0&&<div style={{position:'absolute',top:-4,right:-4,width:18,height:18,borderRadius:'50%',background:C,fontSize:9,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',color:'white',border:'2px solid #080c17'}}>{Math.min(reminders.length,9)}</div>}
          </button>
          <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BORDER}`,borderRadius:24,padding:'5px 16px 5px 5px',cursor:'pointer'}}>
            <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'white',flexShrink:0}}>{initials}</div>
            <span style={{fontSize:13,fontWeight:600,color:'white'}}>{profile.full_name}</span>
            <SvgIcon d="M6 9l6 6 6-6" size={13} color="rgba(255,255,255,0.4)"/>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{padding:'24px 28px',flex:1}}>

          {/* HERO */}
          <div className="hero" style={{display:'flex',gap:16,marginBottom:20}}>

            {/* Profile card */}
            <div style={{flex:1,borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'26px'}}>
              <div style={{display:'flex',gap:24,alignItems:'flex-start',flexWrap:'wrap'}}>
                {/* Avatar */}
                <div style={{position:'relative',flexShrink:0}}>
                  <div style={{width:90,height:90,borderRadius:'50%',background:`linear-gradient(145deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:30,fontWeight:900,color:'white',boxShadow:`0 8px 28px ${C}30`}}>{initials}</div>
                  <div style={{position:'absolute',bottom:2,right:2,width:24,height:24,borderRadius:'50%',background:'rgba(20,25,46,0.9)',border:`1.5px solid rgba(255,255,255,0.2)`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
                    <SvgIcon d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z M12 13m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0" size={11} color="white"/>
                  </div>
                </div>

                {/* Info */}
                <div style={{flex:1,minWidth:220}}>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',marginBottom:3}}>
                    Welcome back, <span style={{color:C,fontWeight:700}}>{firstName}</span>
                  </p>
                  <h1 style={{fontSize:26,fontWeight:900,color:'white',letterSpacing:'-0.02em',lineHeight:1,marginBottom:5}}>{profile.full_name}</h1>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.38)',marginBottom:20}}>Here&apos;s what&apos;s happening with your sports.</p>

                  {/* Info chips */}
                  <div style={{display:'flex',gap:20,flexWrap:'wrap',marginBottom:18}}>
                    {[
                      {icon:'M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z M16 3H8L6 7h12z', label:'Year', val:profile.grade||'—'},
                      {icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', label:'Primary Sport', val:primary.charAt(0).toUpperCase()+primary.slice(1)},
                      {icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8', label:'Team', val:athlete?.team||'—'},
                    ].map(item=>(
                      <div key={item.label} style={{display:'flex',alignItems:'center',gap:10}}>
                        <div style={{width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.05)',border:`1px solid ${BORDER}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <SvgIcon d={item.icon} size={14} color="rgba(255,255,255,0.4)"/>
                        </div>
                        <div>
                          <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',letterSpacing:'0.04em',marginBottom:2}}>{item.label}</p>
                          <p style={{fontSize:13,fontWeight:700,color:'white'}}>{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bottom row */}
                  <div style={{display:'flex',alignItems:'center',gap:16,paddingTop:16,borderTop:`1px solid ${BORDER}`,flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <SvgIcon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" size={14} color="rgba(255,255,255,0.3)"/>
                      <span style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{profile.email||'Not set'}</span>
                    </div>
                    <div style={{marginLeft:'auto'}}>
                      <Link href="/player/setup" style={{display:'inline-flex',alignItems:'center',gap:7,fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)',textDecoration:'none',padding:'8px 16px',borderRadius:9,border:`1px solid ${BORDER}`,background:'rgba(255,255,255,0.05)'}}>
                        <SvgIcon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" size={13}/>
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* My Sports */}
            <div className="spc" style={{width:280,flexShrink:0,borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:'rgba(255,255,255,0.5)',textTransform:'uppercase'}}>My Sports</p>
                <Link href="/player/setup" style={{fontSize:11,fontWeight:600,color:C,textDecoration:'none'}}>View all</Link>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sports.slice(0,4).map((sport,i)=>{
                  const sc=SPORT_COLORS[sport]||C;
                  return (
                    <div key={sport} style={{display:'flex',alignItems:'center',gap:12,padding:'12px',borderRadius:12,background:i===0?`${sc}10`:'rgba(255,255,255,0.025)',border:`1px solid ${i===0?sc+'30':BORDER}`}}>
                      <div style={{width:38,height:38,borderRadius:10,background:`${sc}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <SvgIcon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" size={16} color={sc}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:700,color:'white',textTransform:'capitalize',marginBottom:2}}>{sport}</p>
                        {i===0&&athlete?.team&&<p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{athlete.team}{athlete.position?` · ${athlete.position}`:''}</p>}
                      </div>
                      <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.07em',padding:'3px 9px',borderRadius:20,background:i===0?`${sc}22`:'rgba(255,255,255,0.06)',color:i===0?sc:'rgba(255,255,255,0.4)',border:`1px solid ${i===0?sc+'35':'transparent'}`}}>
                        {i===0?'PRIMARY':'SECONDARY'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* MID 3-COL */}
          <div className="mid" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>

            {/* Upcoming Schedule */}
            <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
              <div style={{padding:'16px 18px 12px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:C,textTransform:'uppercase'}}>Upcoming Schedule</p>
                <button style={{fontSize:11,fontWeight:600,color:C,background:'none',border:'none',cursor:'pointer'}} onClick={()=>setActiveNav('schedule')}>View full schedule</button>
              </div>
              <div>
                {!dataReady?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)'}}>Loading...</p>
                ):schedule.length===0?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>No schedule published yet.</p>
                ):schedule.map((item,i)=>{
                  const isF=item._type==='fixture';
                  const isMDay=isF||(item.title||'').toLowerCase().includes('vs ')||(item.title||'').toLowerCase().includes('match');
                  const badge=isF?'MATCH':athlete?.team?.toUpperCase().slice(0,10)||'';
                  const badgeC=isMDay?'#a78bfa':C;
                  return (
                    <div key={item.id||i} className="rhov" style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',borderBottom:i<schedule.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s',cursor:'default'}}>
                      {/* Date col */}
                      <div style={{minWidth:40,textAlign:'center',flexShrink:0}}>
                        {isF?(
                          <>
                            <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{new Date(item.fixture_date).toLocaleDateString('en-ZA',{weekday:'short'}).toUpperCase()}</p>
                            <p style={{fontSize:19,fontWeight:900,color:'white',lineHeight:1.1}}>{new Date(item.fixture_date).getDate()}</p>
                            <p style={{fontSize:9,color:'rgba(255,255,255,0.32)',textTransform:'uppercase'}}>{new Date(item.fixture_date).toLocaleDateString('en-ZA',{month:'short'}).toUpperCase()}</p>
                          </>
                        ):(
                          <>
                            <p style={{fontSize:9,fontWeight:700,color:C,textTransform:'uppercase',letterSpacing:'0.05em'}}>{(item.day_label||'').substring(0,3).toUpperCase()}</p>
                            <div style={{width:6,height:6,borderRadius:'50%',background:C,opacity:0.5,margin:'5px auto 0'}}/>
                          </>
                        )}
                      </div>
                      {/* Icon */}
                      <div style={{width:34,height:34,borderRadius:'50%',background:isMDay?'rgba(167,139,250,0.12)':`${C}12`,border:`1px solid ${isMDay?'rgba(167,139,250,0.3)':C+'25'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <SvgIcon d={isMDay?'M18 8h1.5a2.5 2.5 0 0 0 0-5H18 M4 22h16 M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22 M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22 M18 2H6v7a6 6 0 0 0 12 0V2z':'M18 20V10M12 20V4M6 20v-6'} size={14} color={isMDay?'#a78bfa':C}/>
                      </div>
                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{isF?`vs ${item.opponent}`:item.title}</p>
                        <p style={{fontSize:10,color:'rgba(255,255,255,0.37)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{isF?`${item.fixture_time||'TBC'} · ${item.venue||item.home_away||''}`:item.subtitle||''}</p>
                      </div>
                      {/* Badge */}
                      {badge&&<span style={{fontSize:9,fontWeight:800,letterSpacing:'0.07em',padding:'3px 8px',borderRadius:20,background:`${badgeC}20`,color:badgeC,border:`1px solid ${badgeC}35`,whiteSpace:'nowrap',flexShrink:0}}>{badge}</span>}
                    </div>
                  );
                })}
                <div style={{padding:'12px 18px',borderTop:`1px solid ${BORDER}`}}>
                  <button onClick={()=>setActiveNav('schedule')} style={{background:'none',border:'none',fontSize:12,fontWeight:700,color:C,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                    View full schedule <SvgIcon d="M5 12h14M12 5l7 7-7 7" size={12} color={C}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Latest Updates */}
            <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
              <div style={{padding:'16px 18px 12px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:C,textTransform:'uppercase'}}>Latest Updates</p>
                <button style={{fontSize:11,fontWeight:600,color:C,background:'none',border:'none',cursor:'pointer'}}>View all</button>
              </div>
              <div>
                {!dataReady?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)'}}>Loading...</p>
                ):reminders.length===0?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>No updates yet.</p>
                ):reminders.map((r,i)=>(
                  <div key={r.id} className="rhov" style={{padding:'12px 18px',borderBottom:i<reminders.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s',cursor:'pointer'}}>
                    <div style={{display:'flex',gap:12}}>
                      <div style={{width:32,height:32,borderRadius:'50%',background:`${DOT_COLORS[i%4]}14`,border:`1.5px solid ${DOT_COLORS[i%4]}35`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:DOT_COLORS[i%4]}}/>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4,gap:8}}>
                          <p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</p>
                          <p style={{fontSize:10,color:'rgba(255,255,255,0.28)',whiteSpace:'nowrap',flexShrink:0}}>{timeAgo(r.created_at||r.date||'')}</p>
                        </div>
                        {(r.details||r.body)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.55,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'} as React.CSSProperties}>{r.details||r.body}</p>}
                      </div>
                      <SvgIcon d="M9 18l6-6-6-6" size={13} color="rgba(255,255,255,0.2)"/>
                    </div>
                  </div>
                ))}
                <div style={{padding:'12px 18px',borderTop:`1px solid ${BORDER}`}}>
                  <button style={{background:'none',border:'none',fontSize:12,fontWeight:700,color:C,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                    View all announcements <SvgIcon d="M5 12h14M12 5l7 7-7 7" size={12} color={C}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Upcoming Games */}
            <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
              <div style={{padding:'16px 18px 12px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:C,textTransform:'uppercase'}}>Upcoming Games</p>
                <Link href={`/portal/fixtures/season?sport=${primary}`} style={{fontSize:11,fontWeight:600,color:C,textDecoration:'none'}}>View all</Link>
              </div>
              <div>
                {!dataReady?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)'}}>Loading...</p>
                ):fixtures.length===0?(
                  <p style={{padding:'20px 18px',fontSize:12,color:'rgba(255,255,255,0.2)',fontStyle:'italic'}}>No upcoming games.</p>
                ):fixtures.slice(0,4).map((f,i)=>(
                  <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${primary}`} className="rhov"
                    style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<fixtures.length-1?`1px solid ${BORDER}`:'none',textDecoration:'none',color:'inherit',transition:'background 0.15s'}}>
                    <div style={{minWidth:36,textAlign:'center',flexShrink:0}}>
                      <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{new Date(f.fixture_date).toLocaleDateString('en-ZA',{month:'short'}).toUpperCase()}</p>
                      <p style={{fontSize:20,fontWeight:900,color:'white',lineHeight:1.1}}>{new Date(f.fixture_date).getDate()}</p>
                    </div>
                    <OpponentBadge name={f.opponent||'?'}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.opponent}</p>
                      <p style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>{f.team}</p>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:2}}>{f.fixture_time||'TBC'}</p>
                      <p style={{fontSize:10,fontWeight:600,color:f.home_away==='home'?C:'rgba(255,255,255,0.38)'}}>{(f.home_away||'—').toUpperCase()}</p>
                    </div>
                  </Link>
                ))}
                <div style={{padding:'12px 18px',borderTop:`1px solid ${BORDER}`}}>
                  <Link href={`/portal/fixtures/season?sport=${primary}`} style={{fontSize:12,fontWeight:700,color:C,textDecoration:'none',display:'flex',alignItems:'center',gap:6}}>
                    View all games <SvgIcon d="M5 12h14M12 5l7 7-7 7" size={12} color={C}/>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW */}
          <div className="bot" style={{display:'grid',gridTemplateColumns:'1fr 320px',gap:16}}>

            {/* Performance Overview */}
            <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'22px 24px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
                <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:C,textTransform:'uppercase'}}>Performance Overview</p>
                <Link href={`/portal/fixtures/season?sport=${primary}&tab=results`} style={{fontSize:11,fontWeight:600,color:C,textDecoration:'none'}}>View full stats</Link>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                {[
                  { label:'Training Attendance', val:attendance!==null?`${attendance}%`:'—', trend:attendance!==null?'from recorded sessions':'Link athlete to unlock', up:attendance!==null&&attendance>=80 },
                  { label:'Season Record', val:results.length>0?`${wins}W`:'—', trend:results.length>0?`${draws}D · ${losses}L · ${results.length} games`:'No results yet', up:wins>losses },
                  { label:'Upcoming Fixtures', val:String(fixtures.length), trend:fixtures.length>0?`Next: ${new Date(fixtures[0]?.fixture_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}`:'None scheduled', up:fixtures.length>0 },
                ].map(stat=>{
                  const trendC = stat.val==='—'?'rgba(255,255,255,0.25)':stat.up?'#22c55e':'rgba(255,255,255,0.4)';
                  return (
                    <div key={stat.label} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`,borderRadius:14,padding:'18px 20px'}}>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:12,lineHeight:1.4}}>{stat.label}</p>
                      <p style={{fontSize:38,fontWeight:900,color:'white',lineHeight:1,marginBottom:10,letterSpacing:'-0.02em'}}>{stat.val}</p>
                      <div style={{display:'flex',alignItems:'center',gap:5}}>
                        {stat.val!=='—'&&<SvgIcon d={stat.up?'M18 15l-6-6-6 6':'M6 9l6 6 6-6'} size={12} color={trendC}/>}
                        <p style={{fontSize:11,color:trendC,lineHeight:1.4}}>{stat.trend}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Access */}
            <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'22px 20px'}}>
              <p style={{fontSize:10,fontWeight:800,letterSpacing:'0.15em',color:C,textTransform:'uppercase',marginBottom:16}}>Quick Access</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
                {[
                  {label:'Documents', href:`/portal?sport=${primary}`, d:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6'},
                  {label:'Medical Info', href:`/portal?sport=${primary}`, d:'M22 12h-4l-3 9L9 3l-3 9H2'},
                  {label:'Payments', href:`/portal?sport=${primary}`, d:'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z M1 10h22'},
                  {label:'Settings', href:'/player/setup', d:'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'},
                ].map(item=>(
                  <Link key={item.label} href={item.href} className="qbtn"
                    style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'13px 14px',borderRadius:11,background:'rgba(255,255,255,0.04)',border:`1px solid ${BORDER}`,textDecoration:'none',color:'rgba(255,255,255,0.65)',transition:'all 0.15s'}}>
                    <div style={{display:'flex',alignItems:'center',gap:9}}>
                      <SvgIcon d={item.d} size={16} color={C}/>
                      <span style={{fontSize:12,fontWeight:600}}>{item.label}</span>
                    </div>
                    <SvgIcon d="M9 18l6-6-6-6" size={12} color="rgba(255,255,255,0.3)"/>
                  </Link>
                ))}
              </div>
              <button onClick={async()=>{await supabase.auth.signOut();router.push('/portal?sport=hockey');}}
                style={{width:'100%',padding:'11px',borderRadius:10,border:`1px solid ${BORDER}`,background:'transparent',color:'rgba(255,255,255,0.35)',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                <SvgIcon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={14} color="rgba(255,255,255,0.35)"/>
                Sign Out
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  </>);
}
