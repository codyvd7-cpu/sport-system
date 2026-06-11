'use client';

import * as React from 'react';
import Link from 'next/link';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ code: string }> };

const LOWER_IS_BETTER = ['Bronco','10m Sprint','30m Sprint','505','RSA'];
const BENCHMARKS: Record<string,{u1415:number[];u1618:number[]}> = {
  'SBJ':        {u1415:[195,175,155,135],u1618:[215,195,175,155]},
  '10m Sprint': {u1415:[1.72,1.82,1.92,2.02],u1618:[1.65,1.75,1.85,1.95]},
  '30m Sprint': {u1415:[4.25,4.45,4.65,4.85],u1618:[4.05,4.25,4.45,4.65]},
  '505 Left':   {u1415:[2.35,2.50,2.65,2.80],u1618:[2.25,2.40,2.55,2.70]},
  '505 Right':  {u1415:[2.35,2.50,2.65,2.80],u1618:[2.25,2.40,2.55,2.70]},
  'Push-Ups':   {u1415:[40,30,20,10],u1618:[50,38,26,14]},
  'Pull-Ups':   {u1415:[10,7,4,1],u1618:[10,7,4,1]},
  'Yo-Yo IR1':  {u1415:[1200,900,700,500],u1618:[1600,1200,900,600]},
};
const TIERS=[
  {label:'Outstanding',hex:'#10b981',bg:'rgba(16,185,129,0.08)',border:'rgba(16,185,129,0.2)'},
  {label:'Strong',     hex:'#38bdf8',bg:'rgba(56,189,248,0.08)',border:'rgba(56,189,248,0.2)'},
  {label:'On Track',   hex:'#a78bfa',bg:'rgba(167,139,250,0.08)',border:'rgba(167,139,250,0.2)'},
  {label:'Developing', hex:'#fbbf24',bg:'rgba(251,191,36,0.08)',border:'rgba(251,191,36,0.2)'},
  {label:'Needs Work', hex:'#94a3b8',bg:'rgba(148,163,184,0.06)',border:'rgba(148,163,184,0.15)'},
];
function getTier(test:string,val:number,ag:string){
  const b=BENCHMARKS[test];if(!b)return null;
  const lower=LOWER_IS_BETTER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
  const t=ag.includes('14')||ag.includes('15')?b.u1415:b.u1618;
  if(lower){if(val<t[0])return TIERS[0];if(val<t[1])return TIERS[1];if(val<t[2])return TIERS[2];if(val<t[3])return TIERS[3];return TIERS[4];}
  else{if(val>t[0])return TIERS[0];if(val>t[1])return TIERS[1];if(val>t[2])return TIERS[2];if(val>t[3])return TIERS[3];return TIERS[4];}
}
function initials(n:string){return(n||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();}
function fDate(d?:string|null){if(!d)return'—';const dt=new Date(d);return Number.isNaN(dt.getTime())?'—':dt.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});}

function Ring({rate,size=88}:{rate:number|null;size?:number}){
  const r=36,circ=2*Math.PI*r,dash=((rate??0)/100)*circ;
  const color=rate===null?'transparent':rate>=80?'#10b981':rate>=60?'#f59e0b':'#ef4444';
  return(
    <div style={{position:'relative',width:size,height:size,flexShrink:0}}>
      <svg viewBox="0 0 80 80" style={{position:'absolute',inset:0,width:'100%',height:'100%',transform:'rotate(-90deg)'}}>
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
        {rate!==null&&<circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>}
      </svg>
      <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        {rate!==null?(
          <>
            <span style={{fontSize:17,fontWeight:900,color:'white',lineHeight:1}}>{rate}%</span>
            <span style={{fontSize:8,color:'#475569',letterSpacing:'0.15em',textTransform:'uppercase',marginTop:2}}>Att.</span>
          </>
        ):(
          <span style={{fontSize:16,fontWeight:900,color:'#1e293b'}}>—</span>
        )}
      </div>
    </div>
  );
}

function Spark({vals,lower}:{vals:number[];lower:boolean}){
  if(vals.length<2)return null;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=56,H=20;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*H}`).join(' ');
  const up=lower?vals[vals.length-1]<vals[0]:vals[vals.length-1]>vals[0];
  return<svg viewBox={`0 0 ${W} ${H}`} style={{width:56,height:20}}><polyline points={pts} fill="none" stroke={up?'#10b981':'#f87171'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function PlayerProfilePage({params}:PageProps){
  const {code}=React.use(params);
  const [athlete,setAthlete]=React.useState<Row|null>(null);
  const [attendance,setAttendance]=React.useState<Row[]>([]);
  const [performance,setPerformance]=React.useState<Row[]>([]);
  const [feedback,setFeedback]=React.useState<Row|null>(null);
  const [coachName,setCoachName]=React.useState('');
  const [nextFixture,setNextFixture]=React.useState<Row|null>(null);
  const [recentResults,setRecentResults]=React.useState<Row[]>([]);
  const [photo,setPhoto]=React.useState<string|null>(null);
  const [uploading,setUploading]=React.useState(false);
  const [loading,setLoading]=React.useState(true);
  const [notFound,setNotFound]=React.useState(false);
  const [visible,setVisible]=React.useState(false);
  const fileRef=React.useRef<HTMLInputElement>(null);

  React.useEffect(()=>{setTimeout(()=>setVisible(true),50);},[]);

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
        if(data.athlete?.photo_url) setPhoto(data.athlete.photo_url);
      }catch{setNotFound(true);}
      setLoading(false);
    }
    load();
  },[code]);

  async function handlePhoto(e:React.ChangeEvent<HTMLInputElement>){
    const file=e.target.files?.[0];
    if(!file||!athlete)return;
    setUploading(true);
    // Show preview immediately
    const reader=new FileReader();
    reader.onload=ev=>{if(ev.target?.result)setPhoto(ev.target.result as string);};
    reader.readAsDataURL(file);
    // Upload to server
    try{
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('athleteId', athlete.id);
      fd.append('playerCode', code.toUpperCase());
      const res=await fetch('/api/player/upload-photo',{method:'POST',body:fd});
      const data=await res.json();
      if(data.url)setPhoto(data.url);
    }catch{}
    setUploading(false);
  }

  const name=athlete?.full_name||athlete?.name||'Athlete';
  const team=athlete?.team||'';
  const ag=athlete?.age_group||'';
  const pos=athlete?.position||'';
  const avail=athlete?.availability||'Available';
  const availHex=avail==='Available'?'#10b981':avail==='Injured'?'#f87171':avail==='Modified'?'#fbbf24':'#38bdf8';
  const present=attendance.filter(a=>['present','late'].includes(a.status?.toLowerCase()||'')).length;
  const absent=attendance.filter(a=>a.status?.toLowerCase()==='absent').length;
  const attRate=attendance.length>0?Math.round((present/attendance.length)*100):null;
  const nowTs=React.useMemo(()=>Date.now(),[]);
  const days=nextFixture?Math.max(0,Math.ceil((new Date(nextFixture.fixture_date).getTime()-nowTs)/86400000)):null;

  const pbs=React.useMemo(()=>{
    const map=new Map<string,{vals:number[];unit:string}>();
    [...performance].reverse().forEach(p=>{
      if(p.value==null)return;
      if(!map.has(p.test_type))map.set(p.test_type,{vals:[],unit:p.unit||''});
      map.get(p.test_type)!.vals.push(p.value);
    });
    const result:any[]=[];
    map.forEach(({vals,unit},test)=>{
      const lower=LOWER_IS_BETTER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
      const pb=lower?Math.min(...vals):Math.max(...vals);
      const tier=getTier(test,pb,ag);
      result.push({test,pb,unit,vals,lower,tier});
    });
    return result;
  },[performance,ag]);

  const fade=(delay:number)=>({
    opacity:visible?1:0,
    transform:visible?'translateY(0)':'translateY(16px)',
    transition:`opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
  });

  const css=`@keyframes spin{to{transform:rotate(360deg)}}`;

  if(loading)return(
    <main style={{minHeight:'100vh',background:'#05070f',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <style>{css}</style>
      <div style={{textAlign:'center'}}>
        <div style={{width:36,height:36,borderRadius:'50%',border:'2px solid rgba(56,189,248,0.15)',borderTop:'2px solid #38bdf8',animation:'spin 0.9s linear infinite',margin:'0 auto 12px'}}/>
        <p style={{color:'#334155',fontSize:13,margin:0}}>Loading profile…</p>
      </div>
    </main>
  );

  if(notFound)return(
    <main style={{minHeight:'100vh',background:'#05070f',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,color:'white'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:18,background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.75} style={{width:28,height:28}}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        </div>
        <p style={{fontSize:20,fontWeight:900,marginBottom:8}}>Code not found</p>
        <p style={{color:'#475569',fontSize:14,marginBottom:24}}>Double-check your code and try again.</p>
        <Link href="/player" style={{background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.25)',color:'#38bdf8',padding:'12px 28px',borderRadius:14,fontWeight:900,fontSize:14,textDecoration:'none'}}>← Try Again</Link>
      </div>
    </main>
  );

  return(
    <main style={{minHeight:'100vh',background:'#05070f',color:'white',fontFamily:"'DM Sans','Inter',sans-serif",paddingBottom:48}}>
      <style>{css}</style>

      {/* Ambient */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-120,left:'50%',transform:'translateX(-50%)',width:700,height:500,background:'radial-gradient(ellipse,rgba(56,189,248,0.05) 0%,transparent 65%)'}}/>
      </div>

      <div style={{maxWidth:560,margin:'0 auto',padding:'0 20px',position:'relative'}}>

        {/* School header */}
        <div style={{...fade(0),display:'flex',alignItems:'center',justifyContent:'space-between',padding:'24px 0 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
          <div>
            <p style={{margin:0,fontSize:10,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'#38bdf8'}}>St Benedict&apos;s College</p>
            <p style={{margin:'2px 0 0',fontSize:9,letterSpacing:'0.2em',textTransform:'uppercase',color:'#1e293b'}}>Hockey · Player Portal</p>
          </div>
          <Link href="/portal" style={{fontSize:11,color:'#334155',textDecoration:'none',padding:'6px 14px',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,background:'rgba(255,255,255,0.02)',fontWeight:600}}>
            Portal →
          </Link>
        </div>

        {/* ── HERO ── */}
        <div style={{...fade(80),marginTop:24,borderRadius:28,overflow:'hidden',border:'1px solid rgba(255,255,255,0.07)',background:'linear-gradient(160deg,rgba(56,189,248,0.07) 0%,rgba(255,255,255,0.02) 60%)',position:'relative'}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#38bdf8 40%,#a78bfa 70%,transparent)',opacity:0.5}}/>
          <div style={{padding:24}}>
            <div style={{display:'flex',gap:20,alignItems:'flex-start'}}>

              {/* Photo / avatar */}
              <div style={{position:'relative',flexShrink:0}}>
                <div onClick={()=>fileRef.current?.click()} style={{
                  width:80,height:80,borderRadius:20,overflow:'hidden',cursor:'pointer',
                  background:photo?'#000':'linear-gradient(135deg,rgba(56,189,248,0.2),rgba(167,139,250,0.15))',
                  border:'1px solid rgba(56,189,248,0.25)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  position:'relative',
                }}>
                  {photo?(
                    <img src={photo} alt={name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                  ):(
                    <span style={{fontSize:24,fontWeight:900,color:'#38bdf8',letterSpacing:'-0.02em'}}>{initials(name)}</span>
                  )}
                  {uploading&&(
                    <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.2)',borderTop:'2px solid white',animation:'spin 0.8s linear infinite'}}/>
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{display:'none'}}/>
                {/* Availability dot */}
                <div style={{position:'absolute',bottom:-3,right:-3,width:16,height:16,borderRadius:'50%',background:availHex,border:'2px solid #05070f'}}/>
              </div>

              {/* Info */}
              <div style={{flex:1,minWidth:0}}>
                <p style={{margin:'0 0 5px',fontSize:10,fontWeight:600,letterSpacing:'0.15em',textTransform:'uppercase',color:'#64748b'}}>Player Profile</p>
                <h1 style={{margin:'0 0 10px',fontSize:24,fontWeight:900,letterSpacing:'-0.03em',color:'white',lineHeight:1.1}}>{name}</h1>
                <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                  {team&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(56,189,248,0.1)',color:'#38bdf8',border:'1px solid rgba(56,189,248,0.2)'}}>{team}</span>}
                  {ag&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(255,255,255,0.05)',color:'#94a3b8',border:'1px solid rgba(255,255,255,0.08)'}}>{ag}</span>}
                  {pos&&<span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:700,background:'rgba(167,139,250,0.1)',color:'#a78bfa',border:'1px solid rgba(167,139,250,0.2)'}}>{pos}</span>}
                  <span style={{padding:'3px 10px',borderRadius:20,fontSize:10,fontWeight:900,background:`${availHex}15`,color:availHex,border:`1px solid ${availHex}30`}}>{avail}</span>
                </div>
                {coachName&&<p style={{margin:'8px 0 0',fontSize:11,color:'#334155'}}>Coach · <span style={{color:'#475569',fontWeight:600}}>{coachName}</span></p>}
              </div>

              <Ring rate={attRate}/>
            </div>

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginTop:20}}>
              {[
                {label:'Sessions',val:attendance.length,          color:attendance.length>0?'#fff':'#1e293b'},
                {label:'Present', val:present,                    color:present>0?'#10b981':'#1e293b'},
                {label:'Absent',  val:absent,                     color:absent>3?'#f87171':absent>0?'#fbbf24':'#1e293b'},
                {label:'Goals',   val:recentResults.filter(r=>{
                  const scorers=(r.goal_scorers||'').toLowerCase();
                  const first=name.split(' ')[0].toLowerCase();
                  const last=name.split(' ').pop()?.toLowerCase()||'';
                  return scorers.includes(first)||scorers.includes(last);
                }).length, color:'#fbbf24'},
              ].map(s=>(
                <div key={s.label} style={{background:'rgba(0,0,0,0.3)',borderRadius:14,padding:'12px 8px',textAlign:'center',border:'1px solid rgba(255,255,255,0.04)'}}>
                  <p style={{margin:0,fontSize:22,fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</p>
                  <p style={{margin:'4px 0 0',fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.15em',color:'#334155'}}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Upload CTA — only shows when no photo */}
            {!photo&&(
              <button onClick={()=>fileRef.current?.click()} style={{
                marginTop:16,width:'100%',padding:'10px',borderRadius:12,
                border:'1px dashed rgba(255,255,255,0.08)',background:'transparent',
                color:'#334155',fontSize:11,cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                fontWeight:600,fontFamily:'inherit',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} style={{width:13,height:13}}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload your photo
              </button>
            )}
          </div>
        </div>

        {/* ── SEASON STATS ── */}
        {attendance.length>0&&(
          <div style={{...fade(140),marginTop:12,borderRadius:20,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(16,185,129,0.03)'}}>
              <p style={{margin:0,fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'#10b981'}}>Your Season</p>
              <p style={{margin:'3px 0 0',fontSize:16,fontWeight:900,color:'white'}}>{new Date().getFullYear()} Stats</p>
            </div>

            {/* Attendance rate bar */}
            {attRate!==null&&(
              <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)'}}>Attendance Rate</p>
                  <p style={{margin:0,fontSize:15,fontWeight:900,color:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171'}}>{attRate}%</p>
                </div>
                <div style={{height:6,background:'rgba(255,255,255,0.06)',borderRadius:99,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:99,width:`${attRate}%`,background:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171',transition:'width 1s ease'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8}}>
                  <p style={{margin:0,fontSize:10,color:'#334155'}}>{present} present · {absent} absent</p>
                  <p style={{margin:0,fontSize:10,color:'#334155'}}>{attendance.length} sessions</p>
                </div>
              </div>
            )}

            {/* Monthly heatmap */}
            {(()=>{
              const months:{[k:string]:{p:number;t:number}}={};
              attendance.filter(a=>a.session_date?.startsWith(String(new Date().getFullYear()))).forEach(a=>{
                const m=a.session_date?.slice(0,7);
                if(!m)return;
                if(!months[m])months[m]={p:0,t:0};
                months[m].t++;
                if(['present','late'].includes(a.status?.toLowerCase()||''))months[m].p++;
              });
              const entries=Object.entries(months).sort();
              if(!entries.length)return null;
              return(
                <div style={{padding:'14px 20px',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <p style={{margin:'0 0 10px',fontSize:9,fontWeight:900,letterSpacing:'0.15em',textTransform:'uppercase',color:'#334155'}}>Monthly</p>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {entries.map(([m,v])=>{
                      const pct=Math.round((v.p/v.t)*100);
                      const col=pct>=80?'#10b981':pct>=60?'#fbbf24':'#f87171';
                      const mn=new Date(m+'-01').toLocaleDateString('en-ZA',{month:'short'});
                      return(
                        <div key={m} style={{background:`${col}14`,border:`1px solid ${col}30`,borderRadius:12,padding:'10px 10px',textAlign:'center',minWidth:50}}>
                          <p style={{margin:0,fontSize:15,fontWeight:900,color:col,lineHeight:1}}>{pct}%</p>
                          <p style={{margin:'3px 0 0',fontSize:9,color:'rgba(255,255,255,0.3)'}}>{mn}</p>
                          <p style={{margin:'1px 0 0',fontSize:8,color:'#334155'}}>{v.p}/{v.t}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Team W/D/L */}
            {(()=>{
              const wins=recentResults.filter(r=>{const p=r.final_score?.split(/[-–]/);return p&&parseInt(p[0])>parseInt(p[1]);}).length;
              const draws=recentResults.filter(r=>{const p=r.final_score?.split(/[-–]/);return p&&parseInt(p[0])===parseInt(p[1]);}).length;
              const losses=recentResults.filter(r=>{const p=r.final_score?.split(/[-–]/);return p&&parseInt(p[0])<parseInt(p[1]);}).length;
              const played=wins+draws+losses;
              if(!played)return null;
              const wr=Math.round((wins/played)*100);
              return(
                <div style={{padding:'14px 20px'}}>
                  <p style={{margin:'0 0 10px',fontSize:9,fontWeight:900,letterSpacing:'0.15em',textTransform:'uppercase',color:'#334155'}}>Team Record</p>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:8,marginBottom:10}}>
                    {[{l:'Played',v:played,c:'white'},{l:'Won',v:wins,c:wins>0?'#10b981':'#334155'},{l:'Drew',v:draws,c:draws>0?'#fbbf24':'#334155'},{l:'Lost',v:losses,c:losses>0?'#f87171':'#334155'}].map(s=>(
                      <div key={s.l} style={{background:'rgba(0,0,0,0.2)',borderRadius:12,padding:'10px 6px',textAlign:'center'}}>
                        <p style={{margin:0,fontSize:18,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</p>
                        <p style={{margin:'3px 0 0',fontSize:8,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#334155'}}>{s.l}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{height:5,background:'rgba(255,255,255,0.05)',borderRadius:99,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${wr}%`,background:wr>=60?'#10b981':wr>=40?'#fbbf24':'#f87171',borderRadius:99}}/>
                  </div>
                  <p style={{margin:'5px 0 0',fontSize:10,color:'#334155',textAlign:'right'}}>{wr}% win rate</p>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── NEXT MATCH ── */}
        {nextFixture&&(
          <div style={{...fade(160),marginTop:12,borderRadius:20,border:'1px solid rgba(167,139,250,0.2)',background:'rgba(167,139,250,0.04)',padding:'18px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <p style={{margin:'0 0 5px',fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'#a78bfa'}}>Next Match</p>
              <p style={{margin:'0 0 3px',fontSize:17,fontWeight:900,color:'white'}}>vs {nextFixture.opponent}</p>
              <p style={{margin:0,fontSize:11,color:'#64748b'}}>
                {new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}
                {nextFixture.fixture_time&&` · ${nextFixture.fixture_time}`}
                {nextFixture.venue&&` · ${nextFixture.venue}`}
              </p>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{margin:0,fontSize:40,fontWeight:900,color:'#a78bfa',lineHeight:1}}>{days}</p>
              <p style={{margin:'3px 0 0',fontSize:9,color:'#64748b',letterSpacing:'0.1em'}}>DAYS</p>
            </div>
          </div>
        )}

        {/* ── COACH FEEDBACK ── */}
        {feedback&&(feedback.strengths||feedback.current_focus||feedback.coach_comment)&&(
          <div style={{...fade(200),marginTop:12,borderRadius:20,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(56,189,248,0.03)'}}>
              <p style={{margin:0,fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'#38bdf8'}}>From Your Coach</p>
              <p style={{margin:'3px 0 0',fontSize:16,fontWeight:900,color:'white'}}>Feedback</p>
            </div>
            <div style={{padding:16,display:'flex',flexDirection:'column',gap:10}}>
              {feedback.strengths&&<div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:14,padding:16}}><p style={{margin:'0 0 8px',fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#10b981'}}>Strengths</p><p style={{margin:0,fontSize:13,color:'#cbd5e1',lineHeight:1.65}}>{feedback.strengths}</p></div>}
              {feedback.current_focus&&<div style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:14,padding:16}}><p style={{margin:'0 0 8px',fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#fbbf24'}}>Focus Area</p><p style={{margin:0,fontSize:13,color:'#cbd5e1',lineHeight:1.65}}>{feedback.current_focus}</p></div>}
              {feedback.coach_comment&&<div style={{background:'rgba(167,139,250,0.05)',border:'1px solid rgba(167,139,250,0.12)',borderRadius:14,padding:16}}><p style={{margin:'0 0 8px',fontSize:9,fontWeight:900,letterSpacing:'0.2em',textTransform:'uppercase',color:'#a78bfa'}}>Comment</p><p style={{margin:0,fontSize:13,color:'#cbd5e1',lineHeight:1.65,fontStyle:'italic'}}>&ldquo;{feedback.coach_comment}&rdquo;</p></div>}
            </div>
          </div>
        )}

        {/* ── PERSONAL BESTS ── */}
        {pbs.length>0&&(
          <div style={{...fade(240),marginTop:12,borderRadius:20,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <p style={{margin:0,fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'#fbbf24'}}>Records</p>
              <p style={{margin:'3px 0 0',fontSize:16,fontWeight:900,color:'white'}}>Personal Bests</p>
            </div>
            <div style={{padding:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {pbs.map(pb=>(
                <div key={pb.test} style={{background:pb.tier?pb.tier.bg:'rgba(255,255,255,0.02)',border:`1px solid ${pb.tier?pb.tier.border:'rgba(255,255,255,0.06)'}`,borderRadius:16,padding:16}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12}}>
                    <p style={{margin:0,fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#64748b',flex:1}}>{pb.test}</p>
                    {pb.tier&&<span style={{background:pb.tier.bg,border:`1px solid ${pb.tier.border}`,color:pb.tier.hex,padding:'2px 7px',borderRadius:20,fontSize:8,fontWeight:900,flexShrink:0,marginLeft:4}}>{pb.tier.label}</span>}
                  </div>
                  <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
                    <div>
                      <p style={{margin:0,fontSize:26,fontWeight:900,color:'white',lineHeight:1}}>{pb.pb}</p>
                      {pb.unit&&<p style={{margin:'2px 0 0',fontSize:10,color:'#475569'}}>{pb.unit}</p>}
                    </div>
                    <Spark vals={pb.vals} lower={pb.lower}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECENT RESULTS ── */}
        {recentResults.length>0&&(
          <div style={{...fade(280),marginTop:12,borderRadius:20,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
              <p style={{margin:0,fontSize:9,fontWeight:900,letterSpacing:'0.25em',textTransform:'uppercase',color:'#38bdf8'}}>On the Pitch</p>
              <p style={{margin:'3px 0 0',fontSize:16,fontWeight:900,color:'white'}}>Recent Matches</p>
            </div>
            {recentResults.map((r,i)=>{
              const scorers=(r.goal_scorers||'').toLowerCase();
              const scored=name&&scorers.includes(name.split(' ')[0].toLowerCase());
              return(
                <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 20px',borderBottom:i<recentResults.length-1?'1px solid rgba(255,255,255,0.03)':'none'}}>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                      <p style={{margin:0,fontSize:14,fontWeight:700,color:'white'}}>vs {r.opponent}</p>
                      {scored&&<span style={{background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.2)',color:'#fbbf24',padding:'2px 8px',borderRadius:20,fontSize:9,fontWeight:900}}>⚽ Scored</span>}
                    </div>
                    <p style={{margin:0,fontSize:11,color:'#334155'}}>{fDate(r.result_date)}</p>
                  </div>
                  <p style={{margin:0,fontSize:20,fontWeight:900,color:'#38bdf8',flexShrink:0}}>{r.final_score}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── EMPTY STATE ── */}
        {!feedback&&performance.length===0&&attendance.length===0&&!nextFixture&&recentResults.length===0&&(
          <div style={{...fade(160),marginTop:12,borderRadius:20,border:'1px solid rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.01)',padding:'40px 24px',textAlign:'center'}}>
            <div style={{width:56,height:56,borderRadius:16,background:'rgba(56,189,248,0.06)',border:'1px solid rgba(56,189,248,0.12)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.5} style={{width:26,height:26}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <p style={{fontSize:17,fontWeight:900,color:'white',marginBottom:8}}>Season Profile Building</p>
            <p style={{fontSize:13,color:'#64748b',lineHeight:1.6,maxWidth:280,margin:'0 auto 24px'}}>Your performance data will appear here as your coach logs attendance and testing results throughout the season.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
              {[{icon:'📋',label:'Attendance',sub:'Every session'},{icon:'⚡',label:'Testing',sub:'Benchmarks'},{icon:'📈',label:'Trends',sub:'Your progress'}].map(c=>(
                <div key={c.label} style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:14,padding:'14px 10px'}}>
                  <p style={{fontSize:22,marginBottom:6}}>{c.icon}</p>
                  <p style={{fontSize:11,fontWeight:900,color:'white',marginBottom:3}}>{c.label}</p>
                  <p style={{fontSize:10,color:'#475569'}}>{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{...fade(320),textAlign:'center',paddingTop:24}}>
          <p style={{margin:'0 0 6px',fontSize:9,fontWeight:700,letterSpacing:'0.3em',textTransform:'uppercase',color:'#1e293b'}}>St Benedict&apos;s College Hockey</p>
          <Link href="/player" style={{fontSize:11,color:'#1e293b',textDecoration:'none'}}>← Back to code entry</Link>
        </div>

      </div>
    </main>
  );
}