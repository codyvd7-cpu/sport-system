'use client';

import Link from 'next/link';
import * as React from 'react';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ code: string }> };

const LOWER_IS_BETTER = ['Bronco', '10m Sprint', '30m Sprint', '505', 'RSA'];
const BENCHMARKS: Record<string, { u1415: number[]; u1618: number[] }> = {
  'SBJ':        { u1415:[195,175,155,135], u1618:[215,195,175,155] },
  '10m Sprint': { u1415:[1.72,1.82,1.92,2.02], u1618:[1.65,1.75,1.85,1.95] },
  '30m Sprint': { u1415:[4.25,4.45,4.65,4.85], u1618:[4.05,4.25,4.45,4.65] },
  '505 Left':   { u1415:[2.35,2.50,2.65,2.80], u1618:[2.25,2.40,2.55,2.70] },
  '505 Right':  { u1415:[2.35,2.50,2.65,2.80], u1618:[2.25,2.40,2.55,2.70] },
  'Push-Ups':   { u1415:[40,30,20,10], u1618:[50,38,26,14] },
  'Pull-Ups':   { u1415:[10,7,4,1], u1618:[10,7,4,1] },
  'Yo-Yo IR1':  { u1415:[1200,900,700,500], u1618:[1600,1200,900,600] },
};
const TIERS = [
  { label:'Outstanding', hex:'#10b981', bg:'rgba(16,185,129,0.10)',  border:'rgba(16,185,129,0.25)'  },
  { label:'Strong',      hex:'#38bdf8', bg:'rgba(56,189,248,0.10)',  border:'rgba(56,189,248,0.25)'  },
  { label:'On Track',    hex:'#a78bfa', bg:'rgba(167,139,250,0.10)', border:'rgba(167,139,250,0.25)' },
  { label:'Developing',  hex:'#fbbf24', bg:'rgba(251,191,36,0.10)',  border:'rgba(251,191,36,0.25)'  },
  { label:'Needs Work',  hex:'#94a3b8', bg:'rgba(148,163,184,0.08)', border:'rgba(148,163,184,0.2)'  },
];

function getTier(test:string, val:number, ag:string) {
  const b=BENCHMARKS[test]; if(!b) return null;
  const lower=LOWER_IS_BETTER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
  const t=ag.includes('14')||ag.includes('15')?b.u1415:b.u1618;
  if(lower){if(val<t[0])return TIERS[0];if(val<t[1])return TIERS[1];if(val<t[2])return TIERS[2];if(val<t[3])return TIERS[3];return TIERS[4];}
  else{if(val>t[0])return TIERS[0];if(val>t[1])return TIERS[1];if(val>t[2])return TIERS[2];if(val>t[3])return TIERS[3];return TIERS[4];}
}

function initials(n:string){return(n||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function fDate(d?:string|null){
  if(!d)return'—';
  const dt=new Date(d);
  return Number.isNaN(dt.getTime())?'—':dt.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
}

function AttRing({rate,size=96}:{rate:number|null;size?:number}) {
  const r=38,circ=2*Math.PI*r,pct=rate??0,dash=(pct/100)*circ;
  const color=pct>=80?'#10b981':pct>=60?'#f59e0b':'#ef4444';
  return (
    <div className="relative flex items-center justify-center" style={{width:size,height:size}}>
      <svg viewBox="0 0 84 84" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6"/>
        {rate!==null&&<circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>}
      </svg>
      <div className="text-center z-10">
        {rate!==null?(
          <>
            <p className="text-xl font-black text-white leading-none">{rate}%</p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">Att.</p>
          </>
        ):(
          <p className="text-lg font-black text-slate-700">—</p>
        )}
      </div>
    </div>
  );
}

function Spark({vals,lower}:{vals:number[];lower:boolean}){
  if(vals.length<2)return null;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=60,H=24;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*H}`).join(' ');
  const up=lower?vals[vals.length-1]<vals[0]:vals[vals.length-1]>vals[0];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:60,height:24}}>
      <polyline points={pts} fill="none" stroke={up?'#10b981':'#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function PlayerProfilePage({params}:PageProps) {
  const {code}=React.use(params);
  const [athlete,setAthlete]=React.useState<Row|null>(null);
  const [attendance,setAttendance]=React.useState<Row[]>([]);
  const [performance,setPerformance]=React.useState<Row[]>([]);
  const [feedback,setFeedback]=React.useState<Row|null>(null);
  const [coachName,setCoachName]=React.useState('');
  const [nextFixture,setNextFixture]=React.useState<Row|null>(null);
  const [recentResults,setRecentResults]=React.useState<Row[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [notFound,setNotFound]=React.useState(false);
  const [mounted,setMounted]=React.useState(false);

  React.useEffect(()=>{setMounted(true);},[]);

  React.useEffect(()=>{
    async function load(){
      try{
        const res=await fetch(`/api/player/profile?code=${encodeURIComponent(code)}`);
        if(!res.ok){setNotFound(true);setLoading(false);return;}
        const data=await res.json();
        setAthlete(data.athlete);
        setAttendance(data.attendance||[]);
        setPerformance(data.performance||[]);
        setFeedback(data.feedback||null);
        setCoachName(data.coachName||'');
        setNextFixture(data.nextFixture||null);
        setRecentResults(data.recentResults||[]);
      }catch{setNotFound(true);}
      setLoading(false);
    }
    load();
  },[code]);

  const name=athlete?.full_name||athlete?.name||'Athlete';
  const team=athlete?.team||'';
  const ag=athlete?.age_group||'';
  const pos=athlete?.position||'';
  const avail=athlete?.availability||'Available';
  const availHex=avail==='Available'?'#10b981':avail==='Injured'?'#f87171':avail==='Modified'?'#fbbf24':'#38bdf8';

  const present=attendance.filter(a=>['present','late'].includes(a.status?.toLowerCase()||'')).length;
  const absent=attendance.filter(a=>a.status?.toLowerCase()==='absent').length;
  const attRate=attendance.length>0?Math.round((present/attendance.length)*100):null;

  // Build PBs from performance data
  const pbs=React.useMemo(()=>{
    const map=new Map<string,{vals:number[];unit:string;dates:string[]}>();
    [...performance].reverse().forEach(p=>{
      if(p.value==null)return;
      if(!map.has(p.test_type))map.set(p.test_type,{vals:[],unit:p.unit||'',dates:[]});
      map.get(p.test_type)!.vals.push(p.value);
      map.get(p.test_type)!.dates.push(p.test_date);
    });
    const result:any[]=[];
    map.forEach(({vals,unit,dates},test)=>{
      const lower=LOWER_IS_BETTER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
      const pb=lower?Math.min(...vals):Math.max(...vals);
      result.push({test,pb,unit,vals,dates,lower,tier:getTier(test,pb,ag)});
    });
    return result;
  },[performance,ag]);

  if(loading) return(
    <main style={{minHeight:'100vh',background:'#060812',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:40,height:40,borderRadius:'50%',border:'2px solid rgba(56,189,248,0.2)',borderTop:'2px solid #38bdf8',animation:'spin 1s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'#475569',fontSize:13}}>Loading profile…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </main>
  );

  if(notFound) return(
    <main style={{minHeight:'100vh',background:'#060812',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,color:'white'}}>
      <p style={{fontSize:48,marginBottom:16}}>🔍</p>
      <p style={{fontSize:20,fontWeight:900,marginBottom:8}}>Code not found</p>
      <p style={{color:'#64748b',fontSize:14,marginBottom:24}}>Check your code and try again.</p>
      <a href="/player" style={{background:'rgba(56,189,248,0.12)',border:'1px solid rgba(56,189,248,0.3)',color:'#38bdf8',padding:'12px 24px',borderRadius:14,fontWeight:900,fontSize:14,textDecoration:'none'}}>← Try Again</a>
    </main>
  );

  return(
    <main style={{minHeight:'100vh',background:'#060812',color:'white',fontFamily:"'Inter',sans-serif"}}>

      {/* Ambient */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-100,left:'50%',transform:'translateX(-50%)',width:600,height:400,borderRadius:'50%',background:'radial-gradient(ellipse,rgba(56,189,248,0.06) 0%,transparent 70%)'}}/>
      </div>

      <div style={{maxWidth:600,margin:'0 auto',padding:'24px 20px',position:'relative'}}>

        {/* ── SCHOOL HEADER ── */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
          <div>
            <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.3em',textTransform:'uppercase',color:'#38bdf8'}}>St Benedict's College</p>
            <p style={{fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#334155',marginTop:2}}>Hockey · Player Profile</p>
          </div>
          <a href="/portal" style={{fontSize:11,fontWeight:700,color:'#475569',textDecoration:'none',padding:'6px 12px',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,background:'rgba(255,255,255,0.02)'}}>
            Portal →
          </a>
        </div>

        {/* ── HERO CARD ── */}
        <div style={{
          borderRadius:24,
          border:'1px solid rgba(255,255,255,0.07)',
          background:'linear-gradient(135deg,rgba(56,189,248,0.06) 0%,rgba(255,255,255,0.02) 100%)',
          padding:24,
          marginBottom:16,
          position:'relative',
          overflow:'hidden',
        }}>
          {/* Top accent line */}
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${availHex}60,transparent)`}}/>

          <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
            {/* Avatar */}
            <div style={{
              width:72,height:72,borderRadius:18,flexShrink:0,
              background:`linear-gradient(135deg,rgba(56,189,248,0.2),rgba(167,139,250,0.15))`,
              border:'1px solid rgba(56,189,248,0.2)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:22,fontWeight:900,color:'#38bdf8',
              letterSpacing:'-0.02em',
            }}>
              {initials(name)}
            </div>

            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'#64748b',marginBottom:4}}>Player</p>
              <h1 style={{fontSize:26,fontWeight:900,letterSpacing:'-0.02em',color:'white',margin:0,lineHeight:1.1}}>{name}</h1>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                {team&&<span style={{background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.2)',color:'#38bdf8',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900}}>{team}</span>}
                {ag&&<span style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700}}>{ag}</span>}
                {pos&&<span style={{background:'rgba(167,139,250,0.1)',border:'1px solid rgba(167,139,250,0.2)',color:'#a78bfa',padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700}}>{pos}</span>}
                <span style={{background:`${availHex}15`,border:`1px solid ${availHex}30`,color:availHex,padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900}}>{avail}</span>
              </div>
              {coachName&&<p style={{fontSize:11,color:'#475569',marginTop:8}}>Coach · <span style={{color:'#64748b',fontWeight:600}}>{coachName}</span></p>}
            </div>

            {/* Attendance ring */}
            <div style={{flexShrink:0}}>
              <AttRing rate={attRate} size={84}/>
            </div>
          </div>

          {/* Stats row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginTop:20}}>
            {[
              {label:'Sessions',value:attendance.length,color:attendance.length>0?'#fff':'#334155'},
              {label:'Present', value:present,          color:present>0?'#10b981':'#334155'},
              {label:'Absent',  value:absent,           color:absent>3?'#f87171':absent>0?'#fbbf24':'#334155'},
            ].map(s=>(
              <div key={s.label} style={{background:'rgba(0,0,0,0.2)',borderRadius:14,padding:'12px 10px',textAlign:'center',border:'1px solid rgba(255,255,255,0.04)'}}>
                <p style={{fontSize:24,fontWeight:900,color:s.color,lineHeight:1,margin:0}}>{s.value}</p>
                <p style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',color:'#475569',marginTop:4}}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── NEXT FIXTURE ── */}
        {nextFixture&&(
          <div style={{
            borderRadius:24,border:'1px solid rgba(167,139,250,0.2)',
            background:'rgba(167,139,250,0.05)',padding:20,marginBottom:16,
            display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,
          }}>
            <div>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#a78bfa',margin:'0 0 6px'}}>Next Match</p>
              <p style={{fontSize:17,fontWeight:900,color:'white',margin:'0 0 4px'}}>vs {nextFixture.opponent}</p>
              <p style={{fontSize:12,color:'#64748b',margin:0}}>
                {new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}
                {nextFixture.fixture_time&&` · ${nextFixture.fixture_time}`}
                {nextFixture.venue&&` · ${nextFixture.venue}`}
              </p>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{fontSize:36,fontWeight:900,color:'#a78bfa',lineHeight:1,margin:0}}>
                {Math.max(0,Math.ceil((new Date(nextFixture.fixture_date).getTime()-Date.now())/86400000))}
              </p>
              <p style={{fontSize:10,color:'#64748b',margin:'2px 0 0'}}>days away</p>
            </div>
          </div>
        )}

        {/* ── RECENT RESULTS ── */}
        {recentResults.length>0&&(
          <div style={{borderRadius:24,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#38bdf8',margin:0}}>Team Results</p>
              <p style={{fontSize:16,fontWeight:900,color:'white',margin:'4px 0 0'}}>Recent Matches</p>
            </div>
            <div>
              {recentResults.map((r,i)=>{
                // Check if this player scored
                const scorers=(r.goal_scorers||'').toLowerCase();
                const playerScored=name&&scorers.includes(name.split(' ')[0].toLowerCase());
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderBottom:i<recentResults.length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <p style={{fontSize:14,fontWeight:900,color:'white',margin:0}}>vs {r.opponent}</p>
                        {playerScored&&(
                          <span style={{background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:900}}>
                            ⚽ Scored
                          </span>
                        )}
                      </div>
                      <p style={{fontSize:11,color:'#475569',margin:0}}>
                        {new Date(r.result_date).toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'})}
                        {r.goal_scorers&&<span style={{color:'#334155'}}> · {r.goal_scorers}</span>}
                      </p>
                    </div>
                    <p style={{fontSize:22,fontWeight:900,color:'#38bdf8',margin:0,flexShrink:0}}>{r.final_score}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NO DATA YET — premium holding state ── */}
        {!feedback&&performance.length===0&&attendance.length===0&&(
          <div style={{
            borderRadius:24,border:'1px solid rgba(255,255,255,0.05)',
            background:'rgba(255,255,255,0.01)',padding:'40px 24px',textAlign:'center',
            marginBottom:16,
          }}>
            <div style={{
              width:56,height:56,borderRadius:16,
              background:'rgba(56,189,248,0.06)',border:'1px solid rgba(56,189,248,0.12)',
              display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.5} style={{width:26,height:26}}>
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <p style={{fontSize:17,fontWeight:900,color:'white',marginBottom:8}}>Season Profile Building</p>
            <p style={{fontSize:13,color:'#64748b',lineHeight:1.6,maxWidth:280,margin:'0 auto 24px'}}>
              Your performance data will appear here as your coach logs attendance and testing results throughout the season.
            </p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {[
                {icon:'📋',label:'Attendance',sub:'Every session'},
                {icon:'⚡',label:'Testing',   sub:'Benchmarks'},
                {icon:'📈',label:'Trends',    sub:'Your progress'},
              ].map(c=>(
                <div key={c.label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 10px'}}>
                  <p style={{fontSize:22,marginBottom:6}}>{c.icon}</p>
                  <p style={{fontSize:11,fontWeight:900,color:'white',marginBottom:3}}>{c.label}</p>
                  <p style={{fontSize:10,color:'#475569'}}>{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COACH FEEDBACK ── */}
        {feedback&&(feedback.strengths||feedback.current_focus||feedback.coach_comment)&&(
          <div style={{borderRadius:24,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(56,189,248,0.04)'}}>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#38bdf8',margin:0}}>From Your Coach</p>
              <p style={{fontSize:16,fontWeight:900,color:'white',margin:'4px 0 0'}}>Feedback</p>
            </div>
            <div style={{padding:20,display:'flex',flexDirection:'column',gap:12}}>
              {feedback.strengths&&(
                <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:14,padding:16}}>
                  <p style={{fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#10b981',marginBottom:8}}>Strengths</p>
                  <p style={{fontSize:14,color:'#cbd5e1',lineHeight:1.6,margin:0}}>{feedback.strengths}</p>
                </div>
              )}
              {feedback.current_focus&&(
                <div style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:14,padding:16}}>
                  <p style={{fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#fbbf24',marginBottom:8}}>Focus Area</p>
                  <p style={{fontSize:14,color:'#cbd5e1',lineHeight:1.6,margin:0}}>{feedback.current_focus}</p>
                </div>
              )}
              {feedback.coach_comment&&(
                <div style={{background:'rgba(56,189,248,0.04)',border:'1px solid rgba(56,189,248,0.12)',borderRadius:14,padding:16}}>
                  <p style={{fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#38bdf8',marginBottom:8}}>Comment</p>
                  <p style={{fontSize:14,color:'#cbd5e1',lineHeight:1.6,fontStyle:'italic',margin:0}}>"{feedback.coach_comment}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PERSONAL BESTS ── */}
        {pbs.length>0&&(
          <div style={{borderRadius:24,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#fbbf24',margin:0}}>My Records</p>
              <p style={{fontSize:16,fontWeight:900,color:'white',margin:'4px 0 0'}}>Personal Bests</p>
            </div>
            <div style={{padding:16,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {pbs.map(pb=>(
                <div key={pb.test} style={{
                  background: pb.tier?pb.tier.bg:'rgba(255,255,255,0.02)',
                  border:`1px solid ${pb.tier?pb.tier.border:'rgba(255,255,255,0.06)'}`,
                  borderRadius:16,padding:16,
                }}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                    <p style={{fontSize:10,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#94a3b8',margin:0,flex:1}}>{pb.test}</p>
                    {pb.tier&&<span style={{background:pb.tier.bg,border:`1px solid ${pb.tier.border}`,color:pb.tier.hex,padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:900,flexShrink:0,marginLeft:4}}>{pb.tier.label}</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:8}}>
                    <div>
                      <p style={{fontSize:28,fontWeight:900,color:'white',lineHeight:1,margin:0}}>{pb.pb}</p>
                      {pb.unit&&<p style={{fontSize:11,color:'#475569',margin:'2px 0 0'}}>{pb.unit}</p>}
                      {pb.vals.length>1&&(
                        <p style={{fontSize:10,fontWeight:700,color:pb.lower?pb.vals[pb.vals.length-1]<pb.vals[0]?'#10b981':'#f87171':pb.vals[pb.vals.length-1]>pb.vals[0]?'#10b981':'#f87171',marginTop:4}}>
                          {(pb.lower?pb.vals[pb.vals.length-1]<pb.vals[0]:pb.vals[pb.vals.length-1]>pb.vals[0])?'↑ Improving':'↓ Declining'}
                        </p>
                      )}
                    </div>
                    <Spark vals={pb.vals} lower={pb.lower}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {attendance.length>0&&(
          <div style={{borderRadius:24,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden',marginBottom:16}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:10,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#10b981',margin:0}}>Commitment</p>
                <p style={{fontSize:16,fontWeight:900,color:'white',margin:'4px 0 0'}}>Attendance Record</p>
              </div>
              {attRate!==null&&(
                <p style={{fontSize:28,fontWeight:900,color:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171',margin:0}}>{attRate}%</p>
              )}
            </div>
            {attRate!==null&&(
              <div style={{padding:'12px 20px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <div style={{height:6,borderRadius:6,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:6,background:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171',width:`${attRate}%`,transition:'width 1s ease'}}/>
                </div>
              </div>
            )}
            <div style={{maxHeight:280,overflowY:'auto'}}>
              {attendance.slice(0,20).map((r,i)=>{
                const s=r.status?.toLowerCase()||'';
                const c=s==='present'?{bg:'rgba(16,185,129,0.08)',color:'#6ee7b7',border:'rgba(16,185,129,0.2)'}
                  :s==='late'?{bg:'rgba(251,191,36,0.08)',color:'#fde68a',border:'rgba(251,191,36,0.2)'}
                  :s==='absent'?{bg:'rgba(248,113,113,0.08)',color:'#fca5a5',border:'rgba(248,113,113,0.2)'}
                  :{bg:'rgba(56,189,248,0.08)',color:'#7dd3fc',border:'rgba(56,189,248,0.2)'};
                return(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 20px',borderBottom:i<attendance.slice(0,20).length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                    <span style={{background:c.bg,border:`1px solid ${c.border}`,color:c.color,padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,flexShrink:0}}>
                      {r.status}
                    </span>
                    <p style={{flex:1,fontSize:13,color:'#94a3b8',margin:0}}>{r.session_type||'Session'}</p>
                    <p style={{fontSize:11,color:'#334155',margin:0,flexShrink:0}}>{fDate(r.session_date)}</p>
                  </div>
                );
              })}
              {attendance.length>20&&<p style={{textAlign:'center',fontSize:11,color:'#334155',padding:12}}>+{attendance.length-20} more sessions</p>}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{textAlign:'center',paddingTop:16,paddingBottom:32}}>
          <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',textTransform:'uppercase',color:'#1e293b',marginBottom:8}}>St Benedict's College Hockey</p>
          <a href="/player" style={{fontSize:11,color:'#334155',textDecoration:'none'}}>← Back to code entry</a>
        </div>

      </div>
    </main>
  );
}
