'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string,any>;

const SPORT_CONFIG: Record<string,{color:string;bg:string;photo:string}> = {
  hockey:   { color:'#38bdf8', bg:'rgba(56,189,248,0.08)',   photo:'/sbc-hockey-1.jpg' },
  rugby:    { color:'#f87171', bg:'rgba(248,113,113,0.08)',  photo:'/sbc-rugby-1.jpg'  },
  cricket:  { color:'#fbbf24', bg:'rgba(251,191,36,0.08)',   photo:'/sbc-rugby-2.jpg'  },
  swimming: { color:'#818cf8', bg:'rgba(129,140,248,0.08)',  photo:'/sbc-photo-1.jpg'  },
  rowing:   { color:'#34d399', bg:'rgba(52,211,153,0.08)',   photo:'/sbc-photo-1.jpg'  },
  athletics:{ color:'#fb923c', bg:'rgba(251,146,60,0.08)',   photo:'/sbc-photo-1.jpg'  },
};

const BG='#040810', BORDER='rgba(255,255,255,0.07)';

function GlassCard({children,style}:{children:React.ReactNode;style?:React.CSSProperties}) {
  return (
    <div style={{position:'relative',borderRadius:18,overflow:'hidden',
      background:'rgba(255,255,255,0.035)',
      backdropFilter:'blur(20px) saturate(180%)',
      WebkitBackdropFilter:'blur(20px) saturate(180%)',
      border:'1px solid rgba(255,255,255,0.09)',
      boxShadow:'0 4px 24px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.08)',
      ...style}}>
      <div style={{position:'absolute',top:0,left:'10%',right:'10%',height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.3) 40%,rgba(255,255,255,0.5) 50%,rgba(255,255,255,0.3) 60%,transparent)',pointerEvents:'none'}}/>
      <div style={{position:'relative'}}>{children}</div>
    </div>
  );
}

export default function PlayerProfilePage() {
  const router = useRouter();
  const [profile, setProfile]         = React.useState<Row|null>(null);
  const [user, setUser]               = React.useState<any>(null);
  const [loading, setLoading]         = React.useState(true);
  const [sportData, setSportData]     = React.useState<Record<string,{fixtures:Row[];results:Row[];weekItems:Row[];athlete:Row|null;attendance:number|null}>>({});
  const [loadingSports, setLoadingSports] = React.useState(false);

  // Auth check + load profile
  React.useEffect(()=>{
    supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user){router.replace('/player/auth');return;}
      setUser(user);
      const {data:prof}=await supabase.from('player_profiles').select('*').eq('user_id',user.id).single();
      if(!prof){router.replace('/player/setup');return;}
      setProfile(prof);
      setLoading(false);
    });
  },[router]);

  // Load sport data once profile is ready
  React.useEffect(()=>{
    if(!profile) return;
    const sports: string[] = profile.sports || [];
    if(sports.length===0) return;
    setLoadingSports(true);

    const today = new Date().toISOString().split('T')[0];

    Promise.all(sports.map(async(sport)=>{
      const sportLower = sport.toLowerCase();

      // Fixtures
      const {data:fixtures}=await supabase.from('portal_fixtures')
        .select('*').eq('sport',sportLower).eq('is_published',true)
        .gte('fixture_date',today).order('fixture_date').limit(3);

      // Results
      const {data:results}=await supabase.from('portal_results')
        .select('*').eq('sport',sportLower).eq('is_published',true)
        .order('result_date',{ascending:false}).limit(3);

      // Week plan
      const {data:plans}=await supabase.from('portal_week_plans')
        .select('id').eq('sport',sportLower).eq('published',true)
        .order('created_at',{ascending:false}).limit(1);
      let weekItems:Row[]=[];
      if(plans&&plans.length>0){
        const {data:items}=await supabase.from('portal_week_plan_items')
          .select('*').eq('week_plan_id',plans[0].id).order('sort_order');
        weekItems=items||[];
      }

      // Athlete record (for stats)
      let athlete:Row|null=null;
      let attendance:number|null=null;
      if(profile.athlete_id){
        const {data:ath}=await supabase.from('athletes').select('*').eq('id',profile.athlete_id).single();
        athlete=ath;
        // Attendance rate
        const {data:att}=await supabase.from('attendance').select('status').eq('athlete_id',profile.athlete_id);
        if(att&&att.length>0){
          const present=att.filter((a:Row)=>['present','late'].includes(a.status?.toLowerCase())).length;
          attendance=Math.round((present/att.length)*100);
        }
      }

      return {sport:sportLower,fixtures:fixtures||[],results:results||[],weekItems,athlete,attendance};
    })).then(results=>{
      const map:Record<string,any>={};
      results.forEach(r=>{ map[r.sport]=r; });
      setSportData(map);
      setLoadingSports(false);
    });
  },[profile]);

  async function handleSignOut(){
    await supabase.auth.signOut();
    router.push('/portal?sport=hockey');
  }

  function outcomeOf(score:string){
    const p=score?.split(/[-–]/);
    if(!p||p.length!==2)return null;
    const a=parseInt(p[0]),b=parseInt(p[1]);
    return a>b?'WIN':a<b?'LOSS':'DRAW';
  }
  function outcomeColor(o:string|null){
    if(o==='WIN')return '#22c55e';
    if(o==='LOSS')return '#f87171';
    if(o==='DRAW')return '#fbbf24';
    return 'rgba(255,255,255,0.4)';
  }

  if(loading) return (
    <main style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'3px solid #38bdf8',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  if(!profile) return null;

  const initials=(profile.full_name||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
  const sports:string[]=(profile.sports||[]).map((s:string)=>s.toLowerCase());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family:'Inter',system-ui,sans-serif; box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); border-radius:2px; }
        .nav-link:hover { color:rgba(255,255,255,0.8) !important; }
        .fx-row:hover { background:rgba(255,255,255,0.04) !important; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      <main style={{minHeight:'100vh',background:BG,color:'white'}}>

        {/* ── NAV ── */}
        <nav style={{borderBottom:`1px solid ${BORDER}`,background:'rgba(4,8,16,0.95)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50}}>
          <div style={{maxWidth:1100,margin:'0 auto',padding:'0 20px',display:'flex',alignItems:'center',justifyContent:'space-between',height:58}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={32} height={32} style={{objectFit:'contain'}}/>
              <div>
                <p style={{fontSize:13,fontWeight:700,color:'white',lineHeight:1}}>ST BENEDICT&apos;S COLLEGE</p>
                <p style={{fontSize:9,fontWeight:600,color:'#38bdf8',letterSpacing:'0.06em',marginTop:1,textTransform:'uppercase'}}>Player Profile</p>
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <Link href="/portal?sport=hockey" className="nav-link" style={{fontSize:12,color:'rgba(255,255,255,0.45)',textDecoration:'none',transition:'color 0.2s'}}>Portal</Link>
              <button onClick={handleSignOut}
                style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.5)',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px 14px',cursor:'pointer'}}>
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        <div style={{maxWidth:1100,margin:'0 auto',padding:'32px 20px 80px'}}>

          {/* ── PROFILE HERO ── */}
          <GlassCard style={{marginBottom:24}}>
            <div style={{padding:'28px 28px 24px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
              {/* Avatar */}
              <div style={{width:72,height:72,borderRadius:'50%',background:`linear-gradient(135deg,#38bdf8,#38bdf860)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,color:'white',flexShrink:0,boxShadow:'0 8px 24px rgba(56,189,248,0.3)'}}>
                {initials}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <h1 style={{fontSize:26,fontWeight:900,color:'white',lineHeight:1,marginBottom:4,letterSpacing:'-0.02em'}}>{profile.full_name}</h1>
                <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',marginBottom:10}}>{profile.grade}</p>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {sports.map(s=>{
                    const cfg=SPORT_CONFIG[s]||{color:'#38bdf8',bg:'rgba(56,189,248,0.08)'};
                    return (
                      <span key={s} style={{fontSize:10,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',padding:'3px 10px',borderRadius:20,background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.color}30`}}>
                        {s}
                      </span>
                    );
                  })}
                </div>
              </div>
              {!profile.athlete_id&&(
                <div style={{background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:10,padding:'10px 14px',maxWidth:260}}>
                  <p style={{fontSize:11,fontWeight:700,color:'#fbbf24',marginBottom:2}}>Profile pending match</p>
                  <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5}}>Your stats will appear once your coach adds you to the system.</p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* ── SPORT CARDS ── */}
          {sports.length===0 ? (
            <div style={{textAlign:'center',padding:'48px 0'}}>
              <p style={{fontSize:15,color:'rgba(255,255,255,0.3)'}}>No sports selected. <Link href="/player/setup" style={{color:'#38bdf8'}}>Update your profile</Link></p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:20}}>
              {sports.map(sport=>{
                const cfg=SPORT_CONFIG[sport]||{color:'#38bdf8',bg:'rgba(56,189,248,0.08)',photo:'/sbc-photo-1.jpg'};
                const C=cfg.color;
                const data=sportData[sport];
                const isLoading=loadingSports||!data;

                return (
                  <GlassCard key={sport}>
                    {/* Sport header with photo */}
                    <div style={{position:'relative',height:100,overflow:'hidden',borderRadius:'18px 18px 0 0'}}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cfg.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center 30%',filter:'brightness(0.25) saturate(0.5)'}}/>
                      <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${C}30,rgba(4,8,16,0.8))`}}/>
                      <div style={{position:'absolute',bottom:0,left:0,right:0,padding:'16px 22px',display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
                        <div>
                          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',color:`${C}cc`,textTransform:'uppercase',marginBottom:2}}>{sport} department</p>
                          <p style={{fontSize:20,fontWeight:900,color:'white',letterSpacing:'-0.01em',textTransform:'capitalize'}}>{sport}</p>
                        </div>
                        {data?.athlete&&(
                          <div style={{textAlign:'right'}}>
                            <p style={{fontSize:10,color:'rgba(255,255,255,0.5)',marginBottom:1}}>{data.athlete.team}</p>
                            {data.athlete.position&&<p style={{fontSize:11,fontWeight:600,color:C}}>{data.athlete.position}</p>}
                          </div>
                        )}
                      </div>
                      {/* Top rim */}
                      <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C},transparent)`}}/>
                    </div>

                    {isLoading ? (
                      <div style={{padding:'32px',textAlign:'center'}}>
                        <div style={{width:20,height:20,borderRadius:'50%',border:`2px solid ${C}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite',margin:'0 auto'}}/>
                      </div>
                    ) : (
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:0}}>

                        {/* Upcoming Fixtures */}
                        <div style={{padding:'18px 22px',borderRight:`1px solid ${BORDER}`}}>
                          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:C,textTransform:'uppercase',marginBottom:12}}>Upcoming Fixtures</p>
                          {data.fixtures.length===0 ? (
                            <p style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No upcoming fixtures</p>
                          ) : data.fixtures.map((f,i)=>(
                            <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${sport}`} className="fx-row"
                              style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<data.fixtures.length-1?`1px solid ${BORDER}`:'none',textDecoration:'none',color:'inherit',transition:'background 0.15s'}}>
                              <div style={{minWidth:36,textAlign:'center'}}>
                                <p style={{fontSize:16,fontWeight:800,color:'white',lineHeight:1}}>{new Date(f.fixture_date).getDate()}</p>
                                <p style={{fontSize:8,color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>{new Date(f.fixture_date).toLocaleDateString('en-ZA',{month:'short'})}</p>
                              </div>
                              <div style={{flex:1}}>
                                <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:1}}>vs {f.opponent}</p>
                                <p style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{f.fixture_time||'TBC'} · {f.home_away||'—'}</p>
                              </div>
                              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{width:13,height:13,flexShrink:0,marginTop:3}}><path d="M9 18l6-6-6-6"/></svg>
                            </Link>
                          ))}
                        </div>

                        {/* Latest Results */}
                        <div style={{padding:'18px 22px',borderRight:`1px solid ${BORDER}`}}>
                          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:C,textTransform:'uppercase',marginBottom:12}}>Latest Results</p>
                          {data.results.length===0 ? (
                            <p style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No results yet</p>
                          ) : data.results.map((r,i)=>{
                            const outcome=outcomeOf(r.final_score||'');
                            const oc=outcomeColor(outcome);
                            return (
                              <div key={r.id} style={{display:'flex',gap:10,padding:'8px 0',borderBottom:i<data.results.length-1?`1px solid ${BORDER}`:'none',alignItems:'center'}}>
                                <div style={{minWidth:36,textAlign:'center'}}>
                                  <p style={{fontSize:16,fontWeight:800,color:'white',lineHeight:1}}>{new Date(r.result_date).getDate()}</p>
                                  <p style={{fontSize:8,color:'rgba(255,255,255,0.4)',textTransform:'uppercase'}}>{new Date(r.result_date).toLocaleDateString('en-ZA',{month:'short'})}</p>
                                </div>
                                <div style={{flex:1}}>
                                  <p style={{fontSize:12,fontWeight:700,color:'white',marginBottom:1}}>vs {r.opponent}</p>
                                  <p style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{r.team}</p>
                                </div>
                                <div style={{textAlign:'right'}}>
                                  <p style={{fontSize:18,fontWeight:900,color:oc,lineHeight:1,marginBottom:2}}>{r.final_score||'—'}</p>
                                  {outcome&&<span style={{fontSize:8,fontWeight:700,padding:'2px 6px',borderRadius:20,background:`${oc}18`,color:oc}}>{outcome}</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Stats + This Week */}
                        <div style={{padding:'18px 22px'}}>
                          {/* Attendance stat if available */}
                          {data.attendance!==null&&(
                            <div style={{marginBottom:16}}>
                              <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:C,textTransform:'uppercase',marginBottom:10}}>My Stats</p>
                              <div style={{background:cfg.bg,border:`1px solid ${C}20`,borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:14}}>
                                <div style={{textAlign:'center'}}>
                                  <p style={{fontSize:28,fontWeight:900,color:C,lineHeight:1}}>{data.attendance}%</p>
                                  <p style={{fontSize:9,color:'rgba(255,255,255,0.4)',letterSpacing:'0.08em',textTransform:'uppercase',marginTop:2}}>Attendance</p>
                                </div>
                                <div style={{flex:1,height:6,borderRadius:3,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                                  <div style={{height:'100%',width:`${data.attendance}%`,background:`linear-gradient(90deg,${C}88,${C})`,borderRadius:3,transition:'width 1s ease'}}/>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* This week */}
                          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:C,textTransform:'uppercase',marginBottom:10}}>This Week</p>
                          {data.weekItems.length===0 ? (
                            <p style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No week plan published</p>
                          ) : (
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              {data.weekItems.slice(0,4).map(item=>(
                                <div key={item.id} style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                                  <div style={{width:2,height:'100%',minHeight:14,borderRadius:1,background:C,opacity:0.4,flexShrink:0,marginTop:4}}/>
                                  <div>
                                    <p style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.8)'}}>{item.day_label}: {item.title}</p>
                                  </div>
                                </div>
                              ))}
                              {data.weekItems.length>4&&<p style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>+{data.weekItems.length-4} more sessions</p>}
                            </div>
                          )}
                        </div>

                      </div>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
