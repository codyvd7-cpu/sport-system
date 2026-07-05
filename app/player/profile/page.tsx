'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { GRADE8_TESTS, GRADE9_TESTS, BENCHMARKS as BENCH, TIERS, getTier, fmtValue } from '@/lib/hpTests';
const TR = TIERS;

type Row = Record<string,any>;

// ─── tokens ───────────────────────────────────────────────────────────────────
const BG='#07091a', SIDE='#04060f', CARD='rgba(255,255,255,0.04)', B='rgba(255,255,255,0.09)';
const SC:Record<string,string>={hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',swimming:'#818cf8',rowing:'#34d399',athletics:'#fb923c',waterpolo:'#60a5fa',soccer:'#22c55e',golf:'#a3e635'};

// ─── nav ──────────────────────────────────────────────────────────────────────
const NAV=[
  {id:'overview',   l:'Overview',         i:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10'},
  {id:'schedule',   l:'Schedule',         i:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'},
  {id:'perf',       l:'Performance',      i:'M22 12h-4l-3 9L9 3l-3 9H2'},
  {id:'tests',      l:'Test Results',     i:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'},
  {id:'att',        l:'Attendance',       i:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8'},
  {id:'prog',       l:'Training Programs',i:'M18 20V10M12 20V4M6 20v-6'},
  {id:'feedback',   l:'Coach Feedback',   i:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z'},
  {id:'msgs',       l:'Messages',         i:'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6'},
  {id:'docs',       l:'Documents',        i:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6'},
  {id:'injuries',   l:'Injuries & Medical',i:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'},
  {id:'goals',      l:'Goals',            i:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'},
  {id:'settings',   l:'Settings',         i:'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z'},
];

// ─── hp tests ────────────────────────────────────────────────────────────────
const TESTS=[
  {k:'chin_up_hang',     l:'Chin Up Hang',      u:'s',  lo:false,cat:'Strength'},
  {k:'broad_jump',       l:'Broad Jump',         u:'cm', lo:false,cat:'Power'},
  {k:'sprint_10m',       l:'10m Sprint',         u:'s',  lo:true, cat:'Speed'},
  {k:'sprint_30m',       l:'30m Sprint',         u:'s',  lo:true, cat:'Speed'},
  {k:'run_500m',         l:'500m Run',           u:'',   lo:true, cat:'Fitness'},
  {k:'pushup_2min',      l:'Push Up (2 min)',       u:'',   lo:false,cat:'Strength'},
  {k:'triple_broad_jump',l:'Triple Broad Jump',  u:'cm', lo:false,cat:'Power'},
];
const BNC:Record<string,[number,number,number,number]>={
  chin_up_hang:[45,25,12,5],broad_jump:[185,165,148,130],
  sprint_10m:[1.85,1.97,2.10,2.25],sprint_30m:[4.25,4.52,4.80,5.10],
  run_500m:[100,115,130,150],pushup_2min:[22,18,14,10],
  triple_broad_jump:[680,600,530,460],
};
function tier(k:string,v:number,lo:boolean){
  const b=BNC[k];if(!b)return TIERS[2];const[e,g,a,d]=b;
  if(lo){if(v<=e)return TIERS[0];if(v<=g)return TIERS[1];if(v<=a)return TIERS[2];if(v<=d)return TIERS[3];return TIERS[4];}
  else{if(v>=e)return TIERS[0];if(v>=g)return TIERS[1];if(v>=a)return TIERS[2];if(v>=d)return TIERS[3];return TIERS[4];}
}
function fv(k:string,v:number):string{
  if(k==='run_500m'){const m=Math.floor(v/60),s=Math.round(v%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(k==='chin_up_hang'&&v>=60){const m=Math.floor(v/60),s=v%60;return s?`${m}m${s}s`:`${m}min`;}
  return v%1===0?`${v}`:v.toFixed(2);
}
const TO=['Term 1','Term 2','Term 3','Term 4'];

// ─── helpers ─────────────────────────────────────────────────────────────────
const fd=(s:string,o:Intl.DateTimeFormatOptions)=>new Date(s).toLocaleDateString('en-ZA',o);
function ago(s:string){const d=Math.floor((Date.now()-new Date(s).getTime())/86400000);if(d===0)return'Today';if(d===1)return'Yesterday';if(d<7)return`${d}d ago`;if(d<30)return`${Math.floor(d/7)}w ago`;return`${Math.floor(d/30)}mo ago`;}

// ─── micro-components ────────────────────────────────────────────────────────
function Ic({d,sz=16,col='currentColor',sw=1.8}:{d:string;sz?:number;col?:string;sw?:number}){
  return<svg viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{width:sz,height:sz,flexShrink:0}}>{d.split(' M').map((s,i)=><path key={i} d={i===0?s:'M'+s}/>)}</svg>;
}
function Bdg({t}:{t:typeof TIERS[0]}){
  return<span style={{display:'inline-block',fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:t.bg,color:t.color,border:`1px solid ${t.border}40`,letterSpacing:'0.04em'}}>{t.bg}</span>;
}
function Donut({pct,col,sz=100}:{pct:number;col:string;sz?:number}){
  const r=32,c=2*Math.PI*r,dash=(pct/100)*c;
  return<svg width={sz} height={sz} viewBox="0 0 80 80" style={{transform:'rotate(-90deg)',flexShrink:0}}>
    <circle cx={40} cy={40} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={9}/>
    <circle cx={40} cy={40} r={r} fill="none" stroke={col} strokeWidth={9} strokeDasharray={`${dash} ${c}`} strokeLinecap="round"/>
  </svg>;
}
function Bar({pct,col}:{pct:number;col:string}){
  return<div style={{height:6,borderRadius:3,background:'rgba(255,255,255,0.08)',overflow:'hidden'}}>
    <div style={{height:'100%',width:`${Math.min(100,pct)}%`,background:col,borderRadius:3,transition:'width 0.6s ease'}}/>
  </div>;
}
function Spark({vals,col,lo=false}:{vals:number[];col:string;lo?:boolean}){
  if(vals.length<2)return<span style={{color:'rgba(255,255,255,0.2)',fontSize:11}}>—</span>;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*44},${18-((v-mn)/rng)*14}`).join(' ');
  const trend=lo?(vals[0]-vals[vals.length-1]):(vals[vals.length-1]-vals[0]);
  return<svg width={44} height={18}><polyline points={pts} fill="none" stroke={trend>0?col:'#f87171'} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Card({children,style}:{children:React.ReactNode;style?:React.CSSProperties}){
  return<div style={{borderRadius:16,background:CARD,border:`1px solid ${B}`,padding:'20px',...style}}>{children}</div>;
}
function SecHead({label}:{label:string}){
  return<p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:16}}>{label}</p>;
}
function Empty({icon,title,body}:{icon:string;title:string;body:string}){
  return<div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12,padding:'48px 24px',textAlign:'center'}}>
    <Ic d={icon} sz={36} col="rgba(255,255,255,0.1)"/>
    <div><p style={{fontSize:15,fontWeight:700,color:'rgba(255,255,255,0.3)',marginBottom:6}}>{title}</p>
    <p style={{fontSize:12,color:'rgba(255,255,255,0.2)',lineHeight:1.6,maxWidth:280}}>{body}</p></div>
  </div>;
}

// ─── OVERVIEW ────────────────────────────────────────────────────────────────
function Overview({P,ath,fx,res,rem,wi,attPct,C,sports,setNav}:any){
  const ini=(P.full_name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
  const prim=sports[0]||'hockey';
  const wins=res.filter((r:Row)=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])>parseInt(p[1]);}).length;
  const draws=res.filter((r:Row)=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])===parseInt(p[1]);}).length;
  const losses=res.length-wins-draws;
  const nxt=fx[0]||null;
  const last=res[0]||null;
  const lp=last?.final_score?.split(/[-–]/);
  const lo=lp?.length===2?(parseInt(lp[0])>parseInt(lp[1])?'WIN':parseInt(lp[0])<parseInt(lp[1])?'LOSS':'DRAW'):null;
  const lc=lo==='WIN'?'#22c55e':lo==='LOSS'?'#f87171':'#fbbf24';

  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    {/* Profile + sports row */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 240px',gap:14}}>
      <Card style={{display:'flex',gap:20,alignItems:'flex-start'}}>
        <div style={{width:80,height:80,borderRadius:16,background:`linear-gradient(145deg,#1e3a8a,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:900,flexShrink:0,boxShadow:`0 8px 32px ${C}40`}}>{ini}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
            <h1 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.02em',lineHeight:1}}>{P.full_name}</h1>
            <svg viewBox="0 0 24 24" fill={C} style={{width:18,height:18,flexShrink:0}}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div style={{display:'flex',gap:0,flexWrap:'wrap',marginBottom:14}}>
            {[P.grade,ath?.team,ath?.position].filter(Boolean).map((v:string,i:number,arr:string[])=>(
              <span key={i} style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{v}{i<arr.length-1&&<span style={{margin:'0 8px',color:'rgba(255,255,255,0.2)'}}>·</span>}</span>
            ))}
          </div>
          <div style={{display:'flex',gap:16,flexWrap:'wrap',paddingTop:12,borderTop:`1px solid ${B}`}}>
            {P.email&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'rgba(255,255,255,0.4)'}}><Ic d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" sz={12} col="rgba(255,255,255,0.3)"/>{P.email}</div>}
            <Link href="/player/setup" style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:C,textDecoration:'none',marginLeft:'auto',fontWeight:700}}>
              <Ic d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" sz={12} col={C}/>
              Edit Profile
            </Link>
          </div>
        </div>
      </Card>

      <Card style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <SecHead label="My Sports"/><Link href="/player/setup" style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none',marginTop:-12}}>Manage</Link>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {(sports as string[]).slice(0,3).map((s:string,i:number)=>{
            const sc=SC[s]||C;
            return<div key={s} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:10,background:i===0?`${sc}12`:`${CARD}`,border:`1px solid ${i===0?sc+'28':B}`}}>
              <div style={{width:30,height:30,borderRadius:8,background:`${sc}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" sz={13} col={sc}/></div>
              <div style={{flex:1}}><p style={{fontSize:12,fontWeight:700,textTransform:'capitalize',color:'white',lineHeight:1.2}}>{s}</p>{i===0&&ath?.position&&<p style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:2}}>{ath.position}</p>}</div>
              <span style={{fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:20,background:i===0?`${sc}22`:'rgba(255,255,255,0.06)',color:i===0?sc:'rgba(255,255,255,0.3)'}}>{i===0?'PRIMARY':'2ND'}</span>
            </div>;
          })}
        </div>
      </Card>
    </div>

    {/* KPI row */}
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
      {[
        {l:'Season Record',v:res.length?`${wins}W ${draws}D ${losses}L`:'No results',sub:res.length?`${res.length} games played`:'—',c:wins>losses?'#22c55e':'rgba(255,255,255,0.7)',i:'M18 20V10M12 20V4M6 20v-6'},
        {l:'Attendance',v:attPct!==null?`${attPct}%`:'Not tracked',sub:attPct!==null?(attPct>=90?'Excellent attendance':attPct>=80?'Good attendance':'Needs improvement'):'Link account to track',c:attPct!==null&&attPct>=80?'#22c55e':attPct!==null?'#f97316':'rgba(255,255,255,0.4)',i:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'},
        {l:'Upcoming Fixtures',v:`${fx.length}`,sub:nxt?`Next: ${fd(nxt.fixture_date,{day:'numeric',month:'short'})} vs ${nxt.opponent}`:'None scheduled',c:fx.length>0?C:'rgba(255,255,255,0.4)',i:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'},
        {l:'Announcements',v:`${rem.length}`,sub:rem.length?rem[0].title.slice(0,28)+'…':'No new updates',c:rem.length?'#fbbf24':'rgba(255,255,255,0.4)',i:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0'},
      ].map(s=><Card key={s.l} style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',fontWeight:600,lineHeight:1.3,maxWidth:80}}>{s.l}</p>
          <Ic d={s.i} sz={14} col={s.c}/>
        </div>
        <p style={{fontSize:22,fontWeight:900,color:s.c,lineHeight:1,marginBottom:4}}>{s.v}</p>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',lineHeight:1.4}}>{s.sub}</p>
      </Card>)}
    </div>

    {/* Mid: Next match + Updates */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      {nxt?(
        <Link href={`/portal/fixtures?date=${nxt.fixture_date}&sport=${prim}`} style={{textDecoration:'none',display:'block'}}>
          <div style={{borderRadius:16,background:`linear-gradient(135deg,${C}1a,${C}08)`,border:`1px solid ${C}40`,padding:'20px',height:'100%',cursor:'pointer'}}>
            <p style={{fontSize:10,fontWeight:800,color:C,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12}}>Next Match</p>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.45)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:4}}>{nxt.team}</p>
            <p style={{fontSize:26,fontWeight:900,lineHeight:1.1,marginBottom:16}}>vs {nxt.opponent}</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {[
                {i:'M8 6h13M8 12h13M3 6h.01M3 12h.01',v:fd(nxt.fixture_date,{weekday:'short',day:'numeric',month:'short',year:'numeric'})},
                {i:'M12 8v4l3 3',v:nxt.fixture_time||'TBC'},
                {i:'M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',v:nxt.venue||nxt.home_away||'—'},
                {i:'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',v:ath?.position||'—'},
              ].map((x,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:11,color:'rgba(255,255,255,0.55)'}}><Ic d={x.i} sz={12} col={C}/>{x.v}</div>)}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,color:C,fontSize:12,fontWeight:700}}>View fixture details <Ic d="M5 12h14M12 5l7 7-7 7" sz={12} col={C}/></div>
          </div>
        </Link>
      ):<Card><Empty icon="M8 6h13M8 12h13M3 6h.01M3 12h.01" title="No upcoming fixtures" body="Fixtures will appear here once your coach publishes them in the portal."/></Card>}

      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <SecHead label="Latest Updates"/>
          <button onClick={()=>setNav('msgs')} style={{fontSize:11,fontWeight:700,color:C,background:'none',border:'none',cursor:'pointer',marginTop:-12}}>All</button>
        </div>
        {rem.length===0?<Empty icon="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" title="No updates" body="Coach announcements and reminders will appear here."/>:
        rem.slice(0,4).map((r:Row,i:number)=><div key={r.id} style={{padding:'12px 18px',borderBottom:i<Math.min(3,rem.length-1)?`1px solid ${B}`:'none',display:'flex',gap:10}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:C,flexShrink:0,marginTop:5}}/>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:2}}>
              <p style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</p>
              <span style={{fontSize:10,color:'rgba(255,255,255,0.28)',flexShrink:0}}>{ago(r.created_at||'')}</span>
            </div>
            {(r.details||r.body)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.details||r.body}</p>}
          </div>
        </div>)}
      </Card>
    </div>

    {/* Bottom: Results + This week */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <SecHead label="Recent Results"/>
          <Link href={`/portal/fixtures/season?sport=${prim}&tab=results`} style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none',marginTop:-12}}>All →</Link>
        </div>
        {res.length===0?<Empty icon="M18 20V10M12 20V4M6 20v-6" title="No results yet" body="Match results will appear here once your coaches publish them."/>:
        res.slice(0,5).map((r:Row,i:number)=>{
          const p=r.final_score?.split(/[-–]/);const o=p?.length===2?(parseInt(p[0])>parseInt(p[1])?'WIN':parseInt(p[0])<parseInt(p[1])?'LOSS':'DRAW'):null;
          const oc=o==='WIN'?'#22c55e':o==='LOSS'?'#f87171':'#fbbf24';
          return<div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 18px',borderBottom:i<4?`1px solid ${B}`:'none'}}>
            <div style={{minWidth:36,textAlign:'center',flexShrink:0}}>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{fd(r.result_date,{month:'short'})}</p>
              <p style={{fontSize:18,fontWeight:900,lineHeight:1}}>{new Date(r.result_date).getDate()}</p>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>vs {r.opponent}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>{r.team}</p>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{fontSize:20,fontWeight:900,color:oc,lineHeight:1,marginBottom:2}}>{r.final_score||'—'}</p>
              {o&&<span style={{fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:20,background:`${oc}18`,color:oc,border:`1px solid ${oc}25`}}>{o}</span>}
            </div>
          </div>;
        })}
      </Card>

      <Card style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`}}>
          <SecHead label="This Week"/>
        </div>
        {wi.length===0&&fx.length===0?<Empty icon="M8 6h13M8 12h13M3 6h.01M3 12h.01" title="No schedule yet" body="Your training week and fixtures will appear here."/>:
        [...wi.slice(0,3).map((w:Row)=>({...w,_t:'T'})),...fx.slice(0,3).map((f:Row)=>({...f,_t:'F'}))].slice(0,5).map((item:any,i:number,arr:any[])=>{
          const isF=item._t==='F';
          return<div key={item.id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 18px',borderBottom:i<arr.length-1?`1px solid ${B}`:'none'}}>
            <div style={{minWidth:44,textAlign:'center',flexShrink:0}}>
              {isF?<><p style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{fd(item.fixture_date,{weekday:'short'})}</p><p style={{fontSize:18,fontWeight:900,lineHeight:1}}>{new Date(item.fixture_date).getDate()}</p></>
              :<p style={{fontSize:11,fontWeight:800,color:C,textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p>}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{isF?`vs ${item.opponent}`:item.title}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.38)'}}>{isF?(item.fixture_time||'TBC'):item.subtitle||''}</p>
            </div>
            <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:isF?`${C}18`:'rgba(255,255,255,0.07)',color:isF?C:'rgba(255,255,255,0.4)',flexShrink:0}}>{isF?'MATCH':'TRAINING'}</span>
          </div>;
        })}
      </Card>
    </div>
  </div>;
}

// ─── SCHEDULE ────────────────────────────────────────────────────────────────
function Schedule({fx,wi,C,prim}:any){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Schedule</h2>
    {wi.length>0&&<Card style={{padding:0,overflow:'hidden'}}>
      <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`}}><SecHead label="Training This Week"/></div>
      {wi.map((item:Row,i:number)=><div key={item.id} style={{display:'flex',alignItems:'center',gap:16,padding:'14px 18px',borderBottom:i<wi.length-1?`1px solid ${B}`:'none'}}>
        <div style={{minWidth:50,textAlign:'center'}}><p style={{fontSize:12,fontWeight:800,color:C,textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p></div>
        <div style={{width:2,height:40,background:`${C}30`,borderRadius:1,flexShrink:0}}/>
        <div style={{flex:1}}><p style={{fontSize:14,fontWeight:700,marginBottom:3}}>{item.title}</p><p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{item.subtitle||''}</p></div>
        <span style={{fontSize:9,fontWeight:800,padding:'3px 10px',borderRadius:20,background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.45)',border:`1px solid ${B}`}}>TRAINING</span>
      </div>)}
    </Card>}
    <Card style={{padding:0,overflow:'hidden'}}>
      <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <SecHead label="Upcoming Fixtures"/>
        <Link href={`/portal/fixtures/season?sport=${prim}`} style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none',marginTop:-12}}>Full season →</Link>
      </div>
      {fx.length===0?<Empty icon="M8 6h13M8 12h13M3 6h.01M3 12h.01" title="No fixtures scheduled" body="Check back soon — your coach will publish the fixture list here."/>:
      fx.map((f:Row,i:number)=><Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${prim}`} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderBottom:i<fx.length-1?`1px solid ${B}`:'none',textDecoration:'none',color:'inherit'}}>
        <div style={{minWidth:48,textAlign:'center',flexShrink:0}}>
          <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fd(f.fixture_date,{month:'short'})}</p>
          <p style={{fontSize:24,fontWeight:900,lineHeight:1}}>{new Date(f.fixture_date).getDate()}</p>
          <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fd(f.fixture_date,{weekday:'short'})}</p>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontSize:15,fontWeight:800,marginBottom:4}}>vs {f.opponent}</p>
          <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>{f.team}</span>
            {f.venue&&<span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>· {f.venue}</span>}
          </div>
        </div>
        <div style={{textAlign:'right',flexShrink:0}}>
          <p style={{fontSize:14,fontWeight:700,marginBottom:4}}>{f.fixture_time||'TBC'}</p>
          <span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:f.home_away==='home'?`${C}18`:'rgba(255,255,255,0.07)',color:f.home_away==='home'?C:'rgba(255,255,255,0.4)'}}>{(f.home_away||'').toUpperCase()||'—'}</span>
        </div>
        <Ic d="M9 18l6-6-6-6" sz={14} col="rgba(255,255,255,0.3)"/>
      </Link>)}
    </Card>
  </div>;
}

// ─── PERFORMANCE ─────────────────────────────────────────────────────────────
function Performance({tr}:any){
  if(!tr.length)return<Card><Empty icon="M22 12h-4l-3 9L9 3l-3 9H2" title="No test data yet" body="Your performance data will appear here once your HP coach enters your test results into the system."/></Card>;
  const lat=tr[0];const prev=tr[1]||null;
  const done=TESTS.filter(t=>{const v=parseFloat(lat[t.k]);return!isNaN(v);});
  const tiers=done.map(t=>tier(t.k,parseFloat(lat[t.k]),t.lo));
  const best=tiers.reduce((b,t)=>TR.indexOf(t)<TR.indexOf(b)?t:b,tiers[0]||TIERS[2]);
  const pbs=done.filter(t=>{const v=parseFloat(lat[t.k]);const allV=tr.map((r:Row)=>parseFloat(r[t.k])).filter((x:number)=>!isNaN(x));const pb=t.lo?Math.min(...allV):Math.max(...allV);return Math.abs(v-pb)<0.001;}).length;
  const cats=['Speed','Power','Strength','Fitness'];
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Performance</h2>
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
      {[
        {l:'Tests Done',v:`${done.length}/${TESTS.length}`,c:'#22c55e',i:'M9 11l3 3L22 4'},
        {l:'Best Tier',v:best?.abbr||'—',c:best?.border||'#94a3b8',i:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'},
        {l:'Personal Bests',v:`${pbs}`,c:'#818cf8',i:'M18 20V10M12 20V4M6 20v-6'},
        {l:'Term',v:lat.term?.replace('Term ','T')||'—',c:'#fbbf24',i:'M8 6h13M8 12h13M3 6h.01M3 12h.01'},
      ].map(s=><Card key={s.l} style={{padding:'16px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
          <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',fontWeight:600}}>{s.l}</p><Ic d={s.i} sz={13} col={s.c}/>
        </div>
        <p style={{fontSize:26,fontWeight:900,color:s.c,lineHeight:1,marginBottom:3}}>{s.v}</p>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.28)'}}>{lat.year||''}</p>
      </Card>)}
    </div>
    {cats.map(cat=>{
      const ct=TESTS.filter(t=>t.cat===cat);const cv=ct.filter(t=>{const v=parseFloat(lat[t.k]);return!isNaN(v);});
      if(!cv.length)return null;
      return<Card key={cat} style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`}}>
          <SecHead label={cat}/>
        </div>
        <div style={{padding:'0 18px'}}>
          {cv.map((t,i)=>{
            const v=parseFloat(lat[t.k]);const ti=getTier(t.k as any,v,t.lo);
            const pv=prev?parseFloat(prev[t.k]):null;const improved=pv&&!isNaN(pv)&&(t.lo?v<pv:v>pv);
            const allV=tr.map((r:Row)=>parseFloat(r[t.k])).filter((x:number)=>!isNaN(x));
            const pb=t.lo?Math.min(...allV):Math.max(...allV);
            const isPB=Math.abs(v-pb)<0.001&&tr.length>1;
            const pct=((TR.length-1-TR.indexOf(ti))/(TR.length-1))*100;
            return<div key={t.k} style={{padding:'16px 0',borderBottom:i<cv.length-1?`1px solid ${B}`:'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                    <p style={{fontSize:13,fontWeight:700}}>{t.l}</p>
                    {isPB&&<span style={{fontSize:8,fontWeight:800,padding:'1px 6px',borderRadius:20,background:'#7c3aed18',color:'#a78bfa',border:'1px solid #7c3aed30'}}>PB</span>}
                  </div>
                  {pv&&!isNaN(pv)&&<p style={{fontSize:11,color:improved?'#22c55e':'#f87171'}}>{improved?'↑ Improved':'↓ Declined'} vs prev {fv(t.k,pv)}{t.u}</p>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Spark vals={allV.slice(-6)} col={ti.border} lo={t.lo}/>
                  <p style={{fontSize:22,fontWeight:900,color:ti.border,lineHeight:1}}>{fv(t.k,v)}{t.u}</p>
                  <Bdg t={ti}/>
                </div>
              </div>
              <Bar pct={pct} col={ti.border}/>
            </div>;
          })}
        </div>
      </Card>;
    })}
  </div>;
}

// ─── TEST RESULTS ────────────────────────────────────────────────────────────
function TestResults({tr}:any){
  if(!tr.length)return<Card><Empty icon="M9 11l3 3L22 4" title="No test results" body="Your full testing history will appear here once your HP coach records your fitness tests."/></Card>;
  const lat=tr[0];
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Test Results</h2>
      <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',background:CARD,border:`1px solid ${B}`,borderRadius:8,padding:'5px 12px'}}>{tr.length} sessions</span>
    </div>
    <Card style={{padding:0,overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',minWidth:580}}>
          <thead>
            <tr style={{background:'rgba(255,255,255,0.04)'}}>
              {['Test','Latest','PB','Benchmark','Trend','Category'].map(h=><th key={h} style={{padding:'12px 18px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.1em',borderBottom:`1px solid ${B}`,whiteSpace:'nowrap'}}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {TESTS.map(t=>{
              const v=parseFloat(lat[t.k]); if(isNaN(v)) return null;
              const ti=getTier(t.k as any,v,t.lo);
              const allV=tr.map((r:Row)=>parseFloat(r[t.k])).filter((x:number)=>!isNaN(x));
              const pb=t.lo?Math.min(...allV):Math.max(...allV);
              return<tr key={t.k} style={{borderBottom:`1px solid ${B}`}}>
                <td style={{padding:'14px 18px',fontSize:13,fontWeight:700}}>{t.l}</td>
                <td style={{padding:'14px 18px',fontSize:16,fontWeight:900,color:ti.border}}>{fv(t.k,v)}{t.u}</td>
                <td style={{padding:'14px 18px',fontSize:13,fontWeight:700,color:'#818cf8'}}>{fv(t.k,pb)}{t.u}</td>
                <td style={{padding:'14px 18px'}}><Bdg t={ti}/></td>
                <td style={{padding:'14px 18px'}}><Spark vals={allV.slice(-6)} col={ti.border} lo={t.lo}/></td>
                <td style={{padding:'14px 18px',fontSize:11,color:'rgba(255,255,255,0.4)'}}>{t.cat}</td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </Card>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
      {tr.slice(0,4).map((r:Row,i:number)=><Card key={i} style={{padding:'14px'}}>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.38)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{r.term} {r.year}</p>
        <p style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>{TESTS.filter(t=>!isNaN(parseFloat(r[t.k]))).length}/{TESTS.length} tests completed</p>
      </Card>)}
    </div>
  </div>;
}

// ─── ATTENDANCE ───────────────────────────────────────────────────────────────
function Attendance({rows,C}:any){
  if(!rows.length)return<Card><Empty icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8" title="Attendance not tracked" body="Your attendance records will appear here once your coach links your player account to your athlete profile."/></Card>;
  const tot=rows.length,pres=rows.filter((a:Row)=>['present','late'].includes((a.status||'').toLowerCase())).length;
  const abs=rows.filter((a:Row)=>(a.status||'').toLowerCase()==='absent').length;
  const exc=rows.filter((a:Row)=>(a.status||'').toLowerCase()==='excused').length;
  const pct=Math.round((pres/tot)*100);
  const risk=pct>=90?{l:'Low',c:'#22c55e'}:pct>=75?{l:'Medium',c:'#fbbf24'}:{l:'High',c:'#f87171'};
  const recent=[...rows].sort((a:Row,b:Row)=>new Date(b.session_date||0).getTime()-new Date(a.session_date||0).getTime()).slice(0,15);
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Attendance</h2>
    <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:14}}>
      <Card style={{display:'flex',flexDirection:'column',alignItems:'center',gap:0,minWidth:180,padding:'24px 20px'}}>
        <div style={{position:'relative',marginBottom:12}}>
          <Donut pct={pct} col={C} sz={120}/>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <p style={{fontSize:28,fontWeight:900,color:C,lineHeight:1}}>{pct}%</p>
            <p style={{fontSize:9,color:'rgba(255,255,255,0.38)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Present</p>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:7,width:'100%'}}>
          {[{l:'Present',v:pres,c:'#22c55e'},{l:'Absent',v:abs,c:'#f87171'},{l:'Excused',v:exc,c:'rgba(255,255,255,0.4)'}].map(s=><div key={s.l} style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:s.c,flexShrink:0}}/>
            <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',flex:1}}>{s.l}</span>
            <span style={{fontSize:12,fontWeight:800,color:s.c}}>{s.v}</span>
          </div>)}
        </div>
      </Card>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,alignContent:'start'}}>
        {[
          {l:'Total Sessions',v:`${tot}`,c:'rgba(255,255,255,0.9)'},
          {l:'Attendance Rate',v:`${pct}%`,c:C},
          {l:'Risk Level',v:risk.l,c:risk.c},
          {l:'Present',v:`${pres}`,c:'#22c55e'},
          {l:'Absent',v:`${abs}`,c:'#f87171'},
          {l:'Excused',v:`${exc}`,c:'rgba(255,255,255,0.5)'},
        ].map(s=><Card key={s.l} style={{padding:'14px 16px'}}>
          <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>{s.l}</p>
          <p style={{fontSize:24,fontWeight:900,color:s.c,lineHeight:1}}>{s.v}</p>
        </Card>)}
      </div>
    </div>
    <Card style={{padding:0,overflow:'hidden'}}>
      <div style={{padding:'14px 18px 10px',borderBottom:`1px solid ${B}`}}><SecHead label="Session History"/></div>
      {recent.map((a:Row,i:number)=>{
        const st=(a.status||'').toLowerCase();const sc=st==='present'||st==='late'?'#22c55e':st==='absent'?'#f87171':'rgba(255,255,255,0.4)';
        const date=a.session_date||a.date||'';
        return<div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'11px 18px',borderBottom:i<recent.length-1?`1px solid ${B}`:'none'}}>
          {date&&<div style={{minWidth:40,textAlign:'center',flexShrink:0}}>
            <p style={{fontSize:9,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{fd(date,{month:'short'})}</p>
            <p style={{fontSize:18,fontWeight:900,lineHeight:1}}>{new Date(date).getDate()}</p>
          </div>}
          <div style={{flex:1}}><p style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.55)'}}>{a.session_type||'Training Session'}</p></div>
          <span style={{fontSize:10,fontWeight:700,padding:'3px 12px',borderRadius:20,background:`${sc}14`,color:sc,border:`1px solid ${sc}25`,textTransform:'capitalize'}}>{a.status||'Unknown'}</span>
        </div>;
      })}
    </Card>
  </div>;
}

// ─── TRAINING PROGRAMS ───────────────────────────────────────────────────────
function Programs({wi}:any){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Training Programs</h2>
    {wi.length>0?<>
      <Card>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.38)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:4}}>Active Program</p>
            <h3 style={{fontSize:18,fontWeight:900}}>Weekly Training Plan</h3>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:4}}>{wi.length} sessions per week</p>
          </div>
          <span style={{fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,background:'#22c55e18',color:'#22c55e',border:'1px solid #22c55e30'}}>ACTIVE</span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:0}}>
          {wi.map((item:Row,i:number)=><div key={item.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 0',borderBottom:i<wi.length-1?`1px solid ${B}`:'none'}}>
            <div style={{width:50,textAlign:'center',flexShrink:0}}>
              <p style={{fontSize:12,fontWeight:800,color:'rgba(255,255,255,0.6)',textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p>
            </div>
            <div style={{width:2,height:36,background:'rgba(255,255,255,0.1)',borderRadius:1,flexShrink:0}}/>
            <div style={{flex:1}}>
              <p style={{fontSize:13,fontWeight:700,marginBottom:2}}>{item.title}</p>
              <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{item.subtitle||''}</p>
            </div>
          </div>)}
        </div>
      </Card>
    </>:
    <Card><Empty icon="M18 20V10M12 20V4M6 20v-6" title="No programs yet" body="Your coach will publish training programmes here. These will include your weekly sessions, targets and progress tracking."/></Card>}
    <Card style={{background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.2)'}}>
      <div style={{display:'flex',gap:14,alignItems:'flex-start'}}>
        <Ic d="M13 10V3L4 14h7v7l9-11h-7z" sz={20} col="#818cf8"/>
        <div>
          <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:4}}>More programs coming soon</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>Strength & Conditioning, Speed & Agility, and sport-specific training programmes will be added here. Speak to your HP coach for your personalised plan.</p>
        </div>
      </div>
    </Card>
  </div>;
}

// ─── COACH FEEDBACK ───────────────────────────────────────────────────────────
function Feedback({rem,C}:any){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Coach Feedback</h2>
    {rem.length===0?<Card><Empty icon="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z" title="No feedback yet" body="Your coaching staff's feedback, strengths analysis and development areas will appear here once they publish notes for your profile."/></Card>:
    rem.map((r:Row)=><Card key={r.id}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
        <h3 style={{fontSize:16,fontWeight:800,lineHeight:1.3,maxWidth:300}}>{r.title}</h3>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.3)',flexShrink:0,marginLeft:12}}>{ago(r.created_at||'')}</span>
      </div>
      {(r.details||r.body)&&<p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.75,paddingLeft:14,borderLeft:`2px solid ${C}`}}>{r.details||r.body}</p>}
      <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${B}`,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:32,height:32,borderRadius:'50%',background:`${C}18`,display:'flex',alignItems:'center',justifyContent:'center'}}><Ic d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8" sz={13} col={C}/></div>
        <div><p style={{fontSize:12,fontWeight:700}}>Coaching Staff</p><p style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>St Benedict's College</p></div>
      </div>
    </Card>)}
    <Card style={{background:'rgba(56,189,248,0.05)',border:`1px solid ${C}25`}}>
      <p style={{fontSize:12,fontWeight:700,color:C,marginBottom:6}}>Dedicated feedback page</p>
      <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>Full coach feedback with strengths, development areas and action points per sport is being built. Ask your coach to add personalised notes to your profile.</p>
    </Card>
  </div>;
}

// ─── MESSAGES ────────────────────────────────────────────────────────────────
function Messages({rem,C}:any){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Messages</h2>
    {rem.length===0?<Card><Empty icon="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" title="No messages" body="Team announcements, coach messages and notices will appear here."/></Card>:
    rem.map((r:Row,i:number)=>{
      const tags=['GENERAL','TRAINING','FIXTURE','SELECTION','MEDICAL','ADMIN'];
      const tag=tags[i%tags.length];
      return<Card key={r.id} style={{padding:0,overflow:'hidden'}}>
        <div style={{padding:'14px 18px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,borderRadius:'50%',background:`${C}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8" sz={14} col={C}/></div>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:700}}>Coaching Staff</p>
            <p style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>{ago(r.created_at||'')}</p>
          </div>
          <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:`${C}18`,color:C,border:`1px solid ${C}30`}}>{tag}</span>
        </div>
        <div style={{padding:'14px 18px'}}>
          <p style={{fontSize:14,fontWeight:700,marginBottom:8}}>{r.title}</p>
          {(r.details||r.body)&&<p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>{r.details||r.body}</p>}
        </div>
      </Card>;
    })}
  </div>;
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────
function Documents(){
  const cats=['Training Programs','Season Information','Team Documents','Medical Forms','Reports'];
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Documents</h2>
    <Card><Empty icon="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" title="No documents yet" body="Your training programmes, season guides and team documents will be shared here by your coaching staff."/></Card>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10}}>
      {cats.map(cat=><Card key={cat} style={{padding:'16px',display:'flex',flexDirection:'column',gap:10}}>
        <div style={{width:36,height:36,borderRadius:10,background:'rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6" sz={16} col="rgba(255,255,255,0.4)"/>
        </div>
        <p style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.6)',lineHeight:1.3}}>{cat}</p>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.25)'}}>0 files</p>
      </Card>)}
    </div>
  </div>;
}

// ─── INJURIES ────────────────────────────────────────────────────────────────
function Injuries(){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Injuries & Medical</h2>
    <Card>
      <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:20,paddingBottom:20,borderBottom:`1px solid ${B}`}}>
        <div style={{width:56,height:56,borderRadius:16,background:'#22c55e18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Ic d="M9 11l3 3L22 4" sz={24} col="#22c55e"/>
        </div>
        <div>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',fontWeight:600,marginBottom:4}}>AVAILABILITY STATUS</p>
          <p style={{fontSize:22,fontWeight:900,color:'#22c55e',lineHeight:1}}>Available</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:3}}>No current injuries or restrictions</p>
        </div>
      </div>
      <p style={{fontSize:13,color:'rgba(255,255,255,0.55)',lineHeight:1.7}}>This section is private and secure. Your injury history, return-to-play stages, modified training notes and medical documents will be managed here by your coaching and medical staff.</p>
    </Card>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
      {['Return to Play','Modified Training','Medical Documents'].map(item=><Card key={item} style={{padding:'16px',textAlign:'center'}}>
        <Ic d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" sz={24} col="rgba(255,255,255,0.1)"/>
        <p style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.3)',marginTop:10}}>{item}</p>
        <p style={{fontSize:10,color:'rgba(255,255,255,0.2)',marginTop:4}}>No records</p>
      </Card>)}
    </div>
    <Card style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)'}}>
      <p style={{fontSize:12,fontWeight:700,color:'#fbbf24',marginBottom:6}}>If you are injured</p>
      <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.65}}>Report any injuries or medical concerns to your coach immediately. Do not train through pain. This section will be updated by your coaching and medical team to track your recovery progress.</p>
    </Card>
  </div>;
}

// ─── GOALS ───────────────────────────────────────────────────────────────────
function Goals({C}:any){
  const eg=[
    {t:'Improve 10m sprint to under 2.10s',deadline:'30 Jul 2026',prog:45,cat:'Speed'},
    {t:'Complete 12 strength sessions this term',deadline:'End of Term 2',prog:67,cat:'Strength'},
    {t:'Maintain 90%+ attendance',deadline:'End of season',prog:92,cat:'Attendance'},
  ];
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Goals</h2>
    <Card style={{background:'rgba(56,189,248,0.05)',border:`1px solid ${C}25`,marginBottom:0}}>
      <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
        <Ic d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" sz={20} col={C}/>
        <div>
          <p style={{fontSize:13,fontWeight:700,marginBottom:4}}>Goal tracking is being activated</p>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>Your coach will set performance targets here. You'll also be able to create your own development goals and track progress toward them.</p>
        </div>
      </div>
    </Card>
    <SecHead label="Example goal cards (preview)"/>
    {eg.map((g,i)=><Card key={i}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div>
          <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:`${C}18`,color:C,border:`1px solid ${C}30`,marginBottom:8,display:'inline-block'}}>{g.cat}</span>
          <p style={{fontSize:14,fontWeight:700,lineHeight:1.4,maxWidth:340}}>{g.t}</p>
        </div>
        <span style={{fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:20,background:'rgba(99,102,241,0.12)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.25)',flexShrink:0,marginLeft:12}}>IN PROGRESS</span>
      </div>
      <div style={{marginBottom:8}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
          <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Target: {g.deadline}</p>
          <p style={{fontSize:12,fontWeight:800,color:C}}>{g.prog}%</p>
        </div>
        <Bar pct={g.prog} col={C}/>
      </div>
    </Card>)}
  </div>;
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings({P,C,out}:any){
  return<div style={{display:'flex',flexDirection:'column',gap:14}}>
    <h2 style={{fontSize:20,fontWeight:900,letterSpacing:'-0.01em'}}>Settings</h2>
    <Card>
      <SecHead label="Account Details"/>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {[{l:'Full Name',v:P.full_name||'—'},{l:'Email',v:P.email||'—'},{l:'Grade',v:P.grade||'—'}].map(item=><div key={item.l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:`1px solid ${B}`}}>
          <span style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>{item.l}</span>
          <span style={{fontSize:13,fontWeight:700}}>{item.v}</span>
        </div>)}
      </div>
    </Card>
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      <Link href="/player/setup" style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderRadius:14,border:`1px solid ${B}`,background:CARD,textDecoration:'none',color:'white'}}>
        <div style={{width:38,height:38,borderRadius:10,background:`${C}15`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" sz={16} col={C}/></div>
        <div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,marginBottom:2}}>Edit Profile</p><p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>Update your name, grade and sports</p></div>
        <Ic d="M9 18l6-6-6-6" sz={14} col="rgba(255,255,255,0.3)"/>
      </Link>
      <button onClick={out} style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',borderRadius:14,border:'1px solid rgba(248,113,113,0.22)',background:'rgba(248,113,113,0.06)',cursor:'pointer',color:'#f87171',width:'100%',textAlign:'left'}}>
        <div style={{width:38,height:38,borderRadius:10,background:'rgba(248,113,113,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Ic d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" sz={16} col="#f87171"/></div>
        <div style={{flex:1}}><p style={{fontSize:13,fontWeight:700,marginBottom:2}}>Sign Out</p><p style={{fontSize:11,color:'rgba(248,113,113,0.5)'}}>Sign out of your player account</p></div>
      </button>
    </div>
  </div>;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function PlayerProfile(){
  const router=useRouter();
  const [nav,setNav]=React.useState('overview');
  const [P,setP]=React.useState<Row|null>(null);
  const [ath,setAth]=React.useState<Row|null>(null);
  const [fx,setFx]=React.useState<Row[]>([]);
  const [res,setRes]=React.useState<Row[]>([]);
  const [rem,setRem]=React.useState<Row[]>([]);
  const [wi,setWi]=React.useState<Row[]>([]);
  const [attRows,setAttRows]=React.useState<Row[]>([]);
  const [tr,setTr]=React.useState<Row[]>([]);
  const [loading,setLoading]=React.useState(true);
  const [menuOpen,setMenuOpen]=React.useState(false);

  React.useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/player/auth');return;}
      const{data:prof}=await supabase.from('player_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
      if(!prof){router.replace('/player/setup');return;}
      setP(prof);
      const sports=(prof.sports||[]).map((s:string)=>s.toLowerCase());
      const prim=sports[0]||'hockey';
      const today=new Date().toISOString().split('T')[0];
      const[fxR,resR,remR,planR]=await Promise.all([
        supabase.from('portal_fixtures').select('*').eq('sport',prim).eq('is_published',true).gte('fixture_date',today).order('fixture_date').limit(15),
        supabase.from('portal_results').select('*').eq('sport',prim).eq('is_published',true).order('result_date',{ascending:false}).limit(20),
        supabase.from('portal_reminders').select('*').eq('sport',prim).eq('is_published',true).order('created_at',{ascending:false}).limit(15),
        supabase.from('portal_week_plans').select('id').eq('sport',prim).eq('published',true).order('created_at',{ascending:false}).limit(1),
      ]);
      setFx(fxR.data||[]);setRes(resR.data||[]);setRem(remR.data||[]);
      if(planR.data?.length){const{data:items}=await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id',planR.data[0].id).order('sort_order');setWi(items||[]);}
      if(prof.athlete_id){
        const[{data:a},{data:att}]=await Promise.all([
          supabase.from('athletes').select('*').eq('id',prof.athlete_id).maybeSingle(),
          supabase.from('attendance').select('*').eq('athlete_id',prof.athlete_id).order('session_date',{ascending:false}),
        ]);
        setAth(a);setAttRows(att||[]);
      }
      const hpId=prof.hp_student_id||prof.athlete_id;
      if(hpId){const{data:t}=await supabase.from('hp_test_results').select('*').eq('student_id',hpId).order('year',{ascending:false});setTr((t||[]).sort((a:Row,b:Row)=>TO.indexOf(b.term)-TO.indexOf(a.term)));}
      setLoading(false);
    });
  },[router]);

  if(loading)return<div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
    <div style={{width:26,height:26,borderRadius:'50%',border:'3px solid #38bdf8',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>;
  if(!P)return null;

  const sports=(P.sports||[]).map((s:string)=>s.toLowerCase());
  const prim=sports[0]||'hockey';
  const C=SC[prim]||'#38bdf8';
  const ini=(P.full_name||'?').split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase();
  const attPct=attRows.length?Math.round(attRows.filter(a=>['present','late'].includes((a.status||'').toLowerCase())).length/attRows.length*100):null;
  const curLabel=NAV.find(n=>n.id===nav)?.l||'Overview';
  const botTabs=[NAV[0],NAV[1],NAV[2],NAV[4],NAV[11]];

  async function signOut(){await supabase.auth.signOut();router.push('/player/auth');}

  return<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,sans-serif;background:${BG};color:white;overflow-x:hidden;}
      ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      .fade{animation:fade 0.3s ease both}
      .navbtn:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
      .sidebar{width:224px;position:fixed;inset:0 auto 0 0;background:${SIDE};border-right:1px solid ${B};display:flex;flex-direction:column;z-index:40;overflow-y:auto;}
      .body{margin-left:224px;min-height:100vh;}
      .mob-bar{display:none!important;}
      .top-bar-desk{display:flex;}
      @media(max-width:900px){
        .sidebar{display:none!important;}
        .body{margin-left:0!important;}
        .mob-bar{display:flex!important;}
        .top-bar-desk{display:none!important;}
        .page-wrap{padding:14px 14px 84px!important;}
      }
    `}</style>

    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div style={{padding:'16px 14px',borderBottom:`1px solid ${B}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={30} height={30} style={{objectFit:'contain',flexShrink:0}}/>
          <div><p style={{fontSize:10,fontWeight:900,color:'white',lineHeight:1.2}}>ST BENEDICT&apos;S</p><p style={{fontSize:9,fontWeight:700,color:C,textTransform:'uppercase',letterSpacing:'0.08em',marginTop:2}}>Altus Performance</p></div>
        </div>
        <nav style={{padding:'8px',flex:1,overflowY:'auto'}}>
          {NAV.map(n=>{const a=nav===n.id;return<button key={n.id} className="navbtn" onClick={()=>setNav(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 11px',borderRadius:9,border:'none',cursor:'pointer',marginBottom:1,textAlign:'left',background:a?`${C}16`:'transparent',color:a?C:'rgba(255,255,255,0.42)',fontWeight:a?700:500,fontSize:12,transition:'all 0.12s',borderLeft:a?`2px solid ${C}`:'2px solid transparent'}}>
            <Ic d={n.i} sz={14} col={a?C:'rgba(255,255,255,0.38)'}/>{n.l}
          </button>;})}
        </nav>
        <button className="navbtn" onClick={()=>setNav('settings')} style={{margin:'0 8px 12px',display:'flex',alignItems:'center',gap:10,padding:'10px 11px',borderRadius:10,border:`1px solid ${B}`,background:'rgba(255,255,255,0.03)',cursor:'pointer',color:'rgba(255,255,255,0.55)',textAlign:'left',width:'calc(100% - 16px)',transition:'all 0.12s'}}>
          <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,#1e3a8a,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'white',flexShrink:0}}>{ini}</div>
          <div style={{flex:1,minWidth:0}}><p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{P.full_name}</p><p style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:1}}>View account</p></div>
        </button>
      </aside>

      {/* BODY */}
      <div className="body" style={{flex:1}}>
        {/* Mobile header */}
        <header className="mob-bar" style={{position:'sticky',top:0,zIndex:30,background:'rgba(7,9,26,0.97)',backdropFilter:'blur(12px)',borderBottom:`1px solid ${B}`,height:52,alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={26} height={26} style={{objectFit:'contain'}}/>
            <span style={{fontSize:14,fontWeight:800}}>{curLabel}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <button onClick={()=>setMenuOpen(!menuOpen)} style={{width:34,height:34,borderRadius:9,border:`1px solid ${B}`,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white'}}>
              <Ic d="M3 6h18M3 12h18M3 18h18" sz={15}/>
            </button>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="top-bar-desk" style={{height:54,borderBottom:`1px solid ${B}`,background:'rgba(7,9,26,0.96)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30,alignItems:'center',justifyContent:'space-between',padding:'0 28px'}}>
          <p style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.9)'}}>{curLabel}</p>
          <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${B}`,borderRadius:24,padding:'5px 14px 5px 5px'}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:`linear-gradient(135deg,#1e3a8a,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,flexShrink:0}}>{ini}</div>
            <span style={{fontSize:13,fontWeight:600}}>{P.full_name}</span>
          </div>
        </header>

        {/* Content */}
        <main className="page-wrap" style={{padding:'24px 28px',maxWidth:1100,margin:'0 auto'}}>
          <div className="fade" key={nav}>
            {nav==='overview'  &&<Overview P={P} ath={ath} fx={fx} res={res} rem={rem} wi={wi} attPct={attPct} C={C} sports={sports} setNav={setNav}/>}
            {nav==='schedule'  &&<Schedule fx={fx} wi={wi} C={C} prim={prim}/>}
            {nav==='perf'      &&<Performance tr={tr}/>}
            {nav==='tests'     &&<TestResults tr={tr}/>}
            {nav==='att'       &&<Attendance rows={attRows} C={C}/>}
            {nav==='prog'      &&<Programs wi={wi}/>}
            {nav==='feedback'  &&<Feedback rem={rem} C={C}/>}
            {nav==='msgs'      &&<Messages rem={rem} C={C}/>}
            {nav==='docs'      &&<Documents/>}
            {nav==='injuries'  &&<Injuries/>}
            {nav==='goals'     &&<Goals C={C}/>}
            {nav==='settings'  &&<Settings P={P} C={C} out={signOut}/>}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="mob-bar" style={{position:'fixed',bottom:0,left:0,right:0,zIndex:50,background:'rgba(7,9,26,0.97)',backdropFilter:'blur(12px)',borderTop:`1px solid ${B}`,padding:'7px 0 11px',justifyContent:'space-around'}}>
          {botTabs.map(n=>{const a=nav===n.id;return<button key={n.id} onClick={()=>setNav(n.id)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'2px 8px',border:'none',background:'none',cursor:'pointer',color:a?C:'rgba(255,255,255,0.32)',transition:'color 0.15s'}}>
            <Ic d={n.i} sz={18} col={a?C:'rgba(255,255,255,0.32)'}/><span style={{fontSize:9,fontWeight:a?800:600}}>{n.l.split(' ')[0]}</span>
          </button>;})}
        </nav>
      </div>
    </div>

    {/* Mobile slide menu */}
    {menuOpen&&<div style={{position:'fixed',inset:0,zIndex:60}} onClick={()=>setMenuOpen(false)}>
      <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)'}}/>
      <div style={{position:'absolute',right:0,top:0,bottom:0,width:240,background:SIDE,borderLeft:`1px solid ${B}`,overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'16px',borderBottom:`1px solid ${B}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontSize:13,fontWeight:800}}>All Sections</p>
          <button onClick={()=>setMenuOpen(false)} style={{width:28,height:28,borderRadius:8,border:`1px solid ${B}`,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'white'}}>
            <Ic d="M18 6L6 18M6 6l12 12" sz={13}/>
          </button>
        </div>
        {NAV.map(n=><button key={n.id} onClick={()=>{setNav(n.id);setMenuOpen(false);}} style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 16px',border:'none',cursor:'pointer',background:nav===n.id?`${C}14`:'transparent',color:nav===n.id?C:'rgba(255,255,255,0.6)',textAlign:'left',fontSize:13,fontWeight:nav===n.id?700:500}}>
          <Ic d={n.i} sz={15} col={nav===n.id?C:'rgba(255,255,255,0.4)'}/>{n.l}
        </button>)}
      </div>
    </div>}
  </>;
}
