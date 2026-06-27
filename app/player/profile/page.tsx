'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG     = '#070c1a';
const SIDE   = '#040810';
const CARD   = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.08)';
const SPORT_COLORS: Record<string,string> = {
  hockey:'#38bdf8', rugby:'#f87171', cricket:'#fbbf24',
  swimming:'#818cf8', rowing:'#34d399', athletics:'#fb923c',
  waterpolo:'#60a5fa', soccer:'#22c55e', golf:'#a3e635',
};

// ── Nav config ────────────────────────────────────────────────────────────────
const NAV = [
  { id:'overview',    label:'Overview',          icon:'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10' },
  { id:'schedule',    label:'Schedule',           icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01' },
  { id:'performance', label:'Performance',        icon:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { id:'testresults', label:'Test Results',       icon:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { id:'attendance',  label:'Attendance',         icon:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { id:'programs',    label:'Training Programs',  icon:'M18 20V10M12 20V4M6 20v-6' },
  { id:'feedback',    label:'Coach Feedback',     icon:'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 0 2 2z' },
  { id:'messages',    label:'Messages',           icon:'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6' },
  { id:'documents',   label:'Documents',          icon:'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6' },
  { id:'injuries',    label:'Injuries & Medical', icon:'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
  { id:'goals',       label:'Goals',              icon:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id:'settings',    label:'Settings',           icon:'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
];

// ── HP test config ─────────────────────────────────────────────────────────────
const TESTS = [
  { key:'chin_up_hang',      label:'Chin Up Hang',      unit:'s',   lower:false, cat:'Strength' },
  { key:'broad_jump',        label:'Broad Jump',        unit:'cm',  lower:false, cat:'Power'    },
  { key:'sprint_10m',        label:'10m Sprint',        unit:'s',   lower:true,  cat:'Speed'    },
  { key:'sprint_30m',        label:'30m Sprint',        unit:'s',   lower:true,  cat:'Speed'    },
  { key:'run_500m',          label:'500m Run',          unit:'',    lower:true,  cat:'Fitness'  },
  { key:'pushup_reps',       label:'Push Up Reps',      unit:'',    lower:false, cat:'Strength' },
  { key:'triple_broad_jump', label:'Triple Broad Jump', unit:'cm',  lower:false, cat:'Power'    },
];
const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5], broad_jump:[185,165,148,130],
  sprint_10m:[1.85,1.97,2.10,2.25], sprint_30m:[4.25,4.52,4.80,5.10],
  run_500m:[100,115,130,150], pushup_reps:[22,18,14,10],
  triple_broad_jump:[680,600,530,460],
};
const TIERS=[
  {abbr:'OUT',label:'Outstanding',color:'#059669',bg:'#ecfdf5'},
  {abbr:'STR',label:'Strong',     color:'#0284c7',bg:'#eff6ff'},
  {abbr:'ON', label:'On Track',   color:'#7c3aed',bg:'#f5f3ff'},
  {abbr:'DEV',label:'Developing', color:'#f97316',bg:'#fff7ed'},
  {abbr:'NEE',label:'Needs Work', color:'#0f766e',bg:'#ccfbf1'},
];
function getTier(key:string,val:number,lower:boolean){
  const b=BENCH[key]; if(!b)return TIERS[2];
  const[e,g,a,d]=b;
  if(lower){if(val<=e)return TIERS[0];if(val<=g)return TIERS[1];if(val<=a)return TIERS[2];if(val<=d)return TIERS[3];return TIERS[4];}
  else{if(val>=e)return TIERS[0];if(val>=g)return TIERS[1];if(val>=a)return TIERS[2];if(val>=d)return TIERS[3];return TIERS[4];}
}
function fmtTestVal(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'&&val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}
  return val%1===0?String(val):val.toFixed(2);
}
const TERM_ORDER=['Term 1','Term 2','Term 3','Term 4'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(s:string,opts:Intl.DateTimeFormatOptions){return new Date(s).toLocaleDateString('en-ZA',opts);}
function timeAgo(s:string){
  const d=Math.floor((Date.now()-new Date(s).getTime())/86400000);
  if(d===0)return'Today';if(d===1)return'Yesterday';
  if(d<7)return`${d}d ago`;if(d<30)return`${Math.floor(d/7)}w ago`;
  return`${Math.floor(d/30)}mo ago`;
}

// ── Icon ─────────────────────────────────────────────────────────────────────
function Icon({d,size=16,color='currentColor',sw=1.8}:{d:string;size?:number;color?:string;sw?:number}){
  return(
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={{width:size,height:size,flexShrink:0}}>
      {d.split(' M').map((seg,i)=><path key={i} d={i===0?seg:'M'+seg}/>)}
    </svg>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({tier}:{tier:typeof TIERS[0]}){
  return<span style={{display:'inline-block',fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:tier.bg,color:tier.color,border:`1px solid ${tier.color}30`,letterSpacing:'0.04em'}}>{tier.abbr}</span>;
}

// ── Donut ──────────────────────────────────────────────────────────────────────
function Donut({pct,color,size=80}:{pct:number;color:string;size?:number}){
  const r=30,c=2*Math.PI*r,dash=(pct/100)*c;
  return(
    <svg width={size} height={size} viewBox="0 0 70 70" style={{transform:'rotate(-90deg)'}}>
      <circle cx={35} cy={35} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8}/>
      <circle cx={35} cy={35} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={`${dash} ${c}`} strokeLinecap="round"/>
    </svg>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Sparkline({vals,color,lower=false}:{vals:number[];color:string;lower?:boolean}){
  if(vals.length<2)return<span style={{fontSize:10,color:'rgba(255,255,255,0.2)'}}>—</span>;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*50},${20-((v-mn)/rng)*16}`).join(' ');
  const trend=lower?(vals[0]-vals[vals.length-1]):(vals[vals.length-1]-vals[0]);
  const up=trend>0;
  return(
    <svg width={50} height={20} style={{overflow:'visible'}}>
      <polyline points={pts} fill="none" stroke={up?color:'#f87171'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Coming soon stub ──────────────────────────────────────────────────────────
function ComingSoon({label,desc}:{label:string;desc:string}){
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:300,gap:12,opacity:0.5}}>
      <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" size={40} color="rgba(255,255,255,0.2)"/>
      <p style={{fontSize:16,fontWeight:700,color:'white'}}>{label}</p>
      <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',textAlign:'center',maxWidth:300}}>{desc}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function OverviewPage({profile,athlete,fixtures,results,reminders,weekItems,att,C,sports}:any){
  const initials=(profile.full_name||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
  const firstName=(profile.full_name||'').split(' ')[0];
  const next=fixtures[0]||null;
  const lastResult=results[0]||null;
  const primary=sports[0]||'hockey';
  const p=lastResult?.final_score?.split(/[-–]/);
  const outcome=p?.length===2?(parseInt(p[0])>parseInt(p[1])?'WIN':parseInt(p[0])<parseInt(p[1])?'LOSS':'DRAW'):null;
  const oc=outcome==='WIN'?'#22c55e':outcome==='LOSS'?'#f87171':'#fbbf24';
  const wins=results.filter((r:Row)=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])>parseInt(p[1]);}).length;

  return(
    <div style={{display:'grid',gap:14}}>
      {/* Top row: Profile + Sports */}
      <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:14}}>
        {/* Profile card */}
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px 24px',display:'flex',alignItems:'flex-start',gap:20}}>
          <div style={{width:72,height:72,borderRadius:14,background:`linear-gradient(145deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,fontWeight:900,flexShrink:0,boxShadow:`0 8px 24px ${C}35`}}>{initials}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <h1 style={{fontSize:22,fontWeight:900,letterSpacing:'-0.01em'}}>{profile.full_name}</h1>
              <svg viewBox="0 0 24 24" fill={C} style={{width:18,height:18,flexShrink:0}}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
              {[profile.grade,athlete?.team,athlete?.position].filter(Boolean).map((v:string,i:number)=>(
                <span key={i} style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{v}{i<2&&<span style={{marginLeft:12,color:'rgba(255,255,255,0.2)'}}>·</span>}</span>
              ))}
            </div>
            <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
              {[
                {icon:'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6',val:profile.email},
              ].filter(x=>x.val).map((x,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,color:'rgba(255,255,255,0.45)',fontSize:12}}>
                  <Icon d={x.icon} size={13} color="rgba(255,255,255,0.3)"/>
                  {x.val}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* My sports */}
        <div style={{width:220,borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em'}}>My Sports</p>
            <Link href="/player/setup" style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none'}}>Manage</Link>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {(sports.slice(0,3) as string[]).map((sport:string,i:number)=>{
              const sc=SPORT_COLORS[sport]||C;
              return(
                <div key={sport} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 10px',borderRadius:10,background:i===0?`${sc}12`:'rgba(255,255,255,0.025)',border:`1px solid ${i===0?sc+'25':BORDER}`}}>
                  <div style={{width:32,height:32,borderRadius:8,background:`${sc}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" size={14} color={sc}/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:12,fontWeight:700,textTransform:'capitalize',color:'white'}}>{sport}</p>
                    {i===0&&athlete?.position&&<p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:1}}>{athlete.position}</p>}
                  </div>
                  <span style={{fontSize:8,fontWeight:800,padding:'2px 7px',borderRadius:20,background:i===0?`${sc}22`:'rgba(255,255,255,0.07)',color:i===0?sc:'rgba(255,255,255,0.35)',border:`1px solid ${i===0?sc+'30':'transparent'}`,whiteSpace:'nowrap'}}>
                    {i===0?'PRIMARY':'SECONDARY'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {label:'Season Record', val:results.length?`${wins}W`:'—', sub:results.length?`${results.filter((r:Row)=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])===parseInt(p[1]);}).length}D · ${results.length-wins-results.filter((r:Row)=>{const p=r.final_score?.split(/[-–]/);return p?.length===2&&parseInt(p[0])===parseInt(p[1]);}).length-wins}L`:'No results yet', icon:'M18 20V10M12 20V4M6 20v-6', color:'#22c55e'},
          {label:'Attendance',    val:att!==null?`${att}%`:'—', sub:att!==null?(att>=90?'Excellent':att>=80?'Good':'Needs improvement'):'Not tracked', icon:'M9 11l3 3L22 4', color:att!==null&&att>=80?'#22c55e':'#f97316'},
          {label:'Upcoming',      val:String(fixtures.length), sub:next?`Next: ${fmtDate(next.fixture_date,{day:'numeric',month:'short'})}`:'No fixtures', icon:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', color:C},
          {label:'Reminders',     val:String(reminders.length), sub:reminders.length?reminders[0].title.slice(0,20)+'…':'All clear', icon:'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0', color:'#fbbf24'},
        ].map(s=>(
          <div key={s.label} style={{borderRadius:14,background:CARD,border:`1px solid ${BORDER}`,padding:'16px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:600}}>{s.label}</p>
              <Icon d={s.icon} size={14} color={s.color}/>
            </div>
            <p style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1,marginBottom:4}}>{s.val}</p>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.35)',lineHeight:1.4}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Middle: Next fixture + Announcements */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {/* Next match */}
        {next?(
          <Link href={`/portal/fixtures?date=${next.fixture_date}&sport=${primary}`} style={{textDecoration:'none'}}>
            <div style={{borderRadius:16,background:`linear-gradient(135deg,${C}18 0%,rgba(255,255,255,0.02) 100%)`,border:`1px solid ${C}35`,padding:'20px',height:'100%',cursor:'pointer',display:'block'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>Next Match</p>
                <span style={{fontSize:11,fontWeight:600,color:C}}>View fixture →</span>
              </div>
              <p style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8}}>{next.team}</p>
              <p style={{fontSize:24,fontWeight:900,color:'white',marginBottom:4}}>vs {next.opponent}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:14,marginTop:14,paddingTop:14,borderTop:`1px solid rgba(255,255,255,0.06)`}}>
                {[
                  {icon:'M8 6h13M8 12h13M3 6h.01M3 12h.01',val:fmtDate(next.fixture_date,{weekday:'short',day:'numeric',month:'short',year:'numeric'})},
                  {icon:'M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',val:next.venue||next.home_away||'—'},
                  {icon:'M12 8v4l3 3',val:next.fixture_time||'TBC'},
                ].map((x,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,color:'rgba(255,255,255,0.55)'}}>
                    <Icon d={x.icon} size={13} color={C}/>{x.val}
                  </div>
                ))}
              </div>
              {athlete?.position&&(
                <div style={{marginTop:12,padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    <Icon d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" size={13} color="rgba(255,255,255,0.4)"/>
                    <span style={{fontSize:11,color:'rgba(255,255,255,0.45)'}}>Your Role</span>
                  </div>
                  <span style={{fontSize:13,fontWeight:800,color:'white'}}>{athlete.position}</span>
                </div>
              )}
            </div>
          </Link>
        ):(
          <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:10,minHeight:160}}>
            <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" size={28} color="rgba(255,255,255,0.1)"/>
            <p style={{fontSize:13,color:'rgba(255,255,255,0.3)'}}>No upcoming fixtures</p>
          </div>
        )}

        {/* Announcements */}
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
          <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em'}}>Latest Updates</p>
          </div>
          {reminders.length===0?(
            <p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No updates yet.</p>
          ):reminders.slice(0,4).map((r:Row,i:number)=>(
            <div key={r.id} style={{padding:'12px 16px',borderBottom:i<Math.min(3,reminders.length-1)?`1px solid ${BORDER}`:'none',display:'flex',gap:12,alignItems:'flex-start'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:C,flexShrink:0,marginTop:5}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',gap:8,marginBottom:2}}>
                  <p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.title}</p>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.28)',flexShrink:0}}>{timeAgo(r.created_at||'')}</p>
                </div>
                {(r.details||r.body)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.details||r.body}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom: Recent results + This week */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        {/* Recent results */}
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
          <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em'}}>Recent Results</p>
            <Link href={`/portal/fixtures/season?sport=${primary}&tab=results`} style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none'}}>All →</Link>
          </div>
          {results.length===0?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No results yet.</p>:
          results.slice(0,4).map((r:Row,i:number)=>{
            const p=r.final_score?.split(/[-–]/);
            const o=p?.length===2?(parseInt(p[0])>parseInt(p[1])?'WIN':parseInt(p[0])<parseInt(p[1])?'LOSS':'DRAW'):null;
            const oc=o==='WIN'?'#22c55e':o==='LOSS'?'#f87171':'#fbbf24';
            return(
              <div key={r.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:i<3?`1px solid ${BORDER}`:'none'}}>
                <div style={{minWidth:32,textAlign:'center',flexShrink:0}}>
                  <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(r.result_date,{month:'short'})}</p>
                  <p style={{fontSize:16,fontWeight:900,color:'white',lineHeight:1}}>{new Date(r.result_date).getDate()}</p>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>vs {r.opponent}</p>
                  <p style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{r.team}</p>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <p style={{fontSize:18,fontWeight:900,color:oc,lineHeight:1,marginBottom:2}}>{r.final_score||'—'}</p>
                  {o&&<span style={{fontSize:8,fontWeight:800,padding:'1px 6px',borderRadius:20,background:`${oc}18`,color:oc,border:`1px solid ${oc}25`}}>{o}</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* This week */}
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
          <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`}}>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em'}}>This Week</p>
          </div>
          {weekItems.length===0&&fixtures.slice(0,3).length===0?(
            <p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No schedule published.</p>
          ):[
            ...weekItems.slice(0,3).map((w:Row)=>({...w,_t:'training'})),
            ...fixtures.slice(0,2).map((f:Row)=>({...f,_t:'fixture'})),
          ].slice(0,5).map((item:any,i:number,arr:any[])=>(
            <div key={item.id||i} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 16px',borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none'}}>
              <div style={{minWidth:40,textAlign:'center',flexShrink:0}}>
                {item._t==='fixture'?(
                  <><p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(item.fixture_date,{weekday:'short'})}</p>
                  <p style={{fontSize:16,fontWeight:900,color:'white',lineHeight:1}}>{new Date(item.fixture_date).getDate()}</p></>
                ):<p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item._t==='fixture'?`vs ${item.opponent}`:item.title}</p>
                <p style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>{item._t==='fixture'?(item.fixture_time||'TBC'):item.subtitle||''}</p>
              </div>
              <span style={{fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:item._t==='fixture'?`${C}18`:'rgba(255,255,255,0.06)',color:item._t==='fixture'?C:'rgba(255,255,255,0.4)',border:`1px solid ${item._t==='fixture'?C+'30':'transparent'}`,flexShrink:0,whiteSpace:'nowrap'}}>
                {item._t==='fixture'?'MATCH':'TRAINING'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PerformancePage({testResults,athlete}:any){
  if(!testResults.length) return <ComingSoon label="Performance" desc="Your test results will appear here once your coach records your HP testing data."/>;
  const latestResult=testResults[0];
  const prevResult=testResults[1]||null;
  const completedTests=TESTS.filter(t=>latestResult[t.key]!=null&&!isNaN(parseFloat(latestResult[t.key])));
  const tiers=completedTests.map(t=>{const v=parseFloat(latestResult[t.key]);return getTier(t.key,v,t.lower);});
  const topTier=tiers.reduce((best,t)=>TIERS.indexOf(t)<TIERS.indexOf(best)?t:best,tiers[0]||TIERS[2]);
  const cats=['Speed','Power','Strength','Fitness','Agility'];

  return(
    <div style={{display:'grid',gap:14}}>
      {/* KPI row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
        {[
          {label:'Tests Completed', val:String(completedTests.length), sub:`Out of ${TESTS.length} total`, icon:'M9 11l3 3L22 4', color:'#22c55e'},
          {label:'Best Tier', val:topTier?.abbr||'—', sub:topTier?.label||'—', icon:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', color:topTier?.color||'white'},
          {label:'Tests Recorded', val:String(testResults.length), sub:'Across all terms', icon:'M4 6h16M4 10h16M4 14h16M4 18h16', color:'#818cf8'},
          {label:'Latest Term', val:latestResult?.term?.replace('Term ','T')||'—', sub:String(latestResult?.year||''), icon:'M8 6h13M8 12h13M3 6h.01M3 12h.01', color:'#fbbf24'},
        ].map(s=>(
          <div key={s.label} style={{borderRadius:14,background:CARD,border:`1px solid ${BORDER}`,padding:'16px'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',fontWeight:600}}>{s.label}</p>
              <Icon d={s.icon} size={14} color={s.color}/>
            </div>
            <p style={{fontSize:28,fontWeight:900,color:s.color,lineHeight:1,marginBottom:4}}>{s.val}</p>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Test results by category */}
      {cats.map(cat=>{
        const catTests=TESTS.filter(t=>t.cat===cat&&latestResult[t.key]!=null&&!isNaN(parseFloat(latestResult[t.key])));
        if(!catTests.length)return null;
        return(
          <div key={cat} style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:`1px solid ${BORDER}`}}>
              <p style={{fontSize:12,fontWeight:800,color:'white'}}>{cat}</p>
            </div>
            <div style={{padding:'0 20px'}}>
              {catTests.map((t,i)=>{
                const v=parseFloat(latestResult[t.key]);
                const pv=prevResult?parseFloat(prevResult[t.key]):null;
                const tier=getTier(t.key,v,t.lower);
                const improved=pv!==null&&(t.lower?(v<pv):(v>pv));
                const allVals=testResults.map((r:Row)=>parseFloat(r[t.key])).filter((x:number)=>!isNaN(x));
                return(
                  <div key={t.key} style={{display:'grid',gridTemplateColumns:'1fr auto auto auto',alignItems:'center',gap:16,padding:'14px 0',borderBottom:i<catTests.length-1?`1px solid ${BORDER}`:'none'}}>
                    <div>
                      <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>{t.label}</p>
                      {prevResult&&pv&&!isNaN(pv)&&<p style={{fontSize:10,color:improved?'#22c55e':'#f87171'}}>{improved?'↑':'↓'} prev {fmtTestVal(t.key,pv)}{t.unit}</p>}
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:20,fontWeight:900,color:tier.color}}>{fmtTestVal(t.key,v)}{t.unit}</p>
                    </div>
                    <Badge tier={tier}/>
                    <Sparkline vals={allVals.slice(-5)} color={tier.color} lower={t.lower}/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AttendancePage({attRows,C}:any){
  if(!attRows.length)return<ComingSoon label="Attendance" desc="Your attendance records will appear here once your coach links your account to an athlete record."/>;
  const total=attRows.length;
  const present=attRows.filter((a:Row)=>['present','late'].includes((a.status||'').toLowerCase())).length;
  const absent=attRows.filter((a:Row)=>(a.status||'').toLowerCase()==='absent').length;
  const excused=attRows.filter((a:Row)=>(a.status||'').toLowerCase()==='excused').length;
  const pct=Math.round((present/total)*100);
  const risk=pct>=90?'Low':pct>=75?'Medium':'High';
  const riskColor=pct>=90?'#22c55e':pct>=75?'#fbbf24':'#f87171';

  // Recent sessions
  const recent=[...attRows].sort((a:Row,b:Row)=>new Date(b.session_date||b.date||0).getTime()-new Date(a.session_date||a.date||0).getTime()).slice(0,12);

  return(
    <div style={{display:'grid',gap:14}}>
      {/* Summary */}
      <div style={{display:'grid',gridTemplateColumns:'auto 1fr',gap:14,alignItems:'center'}}>
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'28px 32px',display:'flex',flexDirection:'column',alignItems:'center',gap:0,position:'relative'}}>
          <div style={{position:'relative',marginBottom:12}}>
            <Donut pct={pct} color={C} size={110}/>
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <p style={{fontSize:26,fontWeight:900,color:C,lineHeight:1}}>{pct}%</p>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.4)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em'}}>Present</p>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:6,width:'100%'}}>
            {[
              {label:'Present',val:`${pct}%`,color:'#22c55e'},
              {label:'Absent', val:`${Math.round(absent/total*100)}%`,color:'#f87171'},
              {label:'Excused',val:`${Math.round(excused/total*100)}%`,color:'rgba(255,255,255,0.4)'},
            ].map(s=>(
              <div key={s.label} style={{display:'flex',alignItems:'center',gap:8}}>
                <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.55)',flex:1}}>{s.label}</span>
                <span style={{fontSize:11,fontWeight:700,color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,alignContent:'start'}}>
          {[
            {label:'Total Sessions', val:String(total), color:'white'},
            {label:'Present',val:String(present),color:'#22c55e'},
            {label:'Absent', val:String(absent), color:'#f87171'},
            {label:'Excused',val:String(excused),color:'rgba(255,255,255,0.5)'},
            {label:'Attendance Rate',val:`${pct}%`,color:C},
            {label:'Risk Level',val:risk,color:riskColor},
          ].map(s=>(
            <div key={s.label} style={{borderRadius:12,background:CARD,border:`1px solid ${BORDER}`,padding:'14px'}}>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>{s.label}</p>
              <p style={{fontSize:22,fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent sessions */}
      <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
        <div style={{padding:'14px 16px 10px',borderBottom:`1px solid ${BORDER}`}}>
          <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em'}}>Session History</p>
        </div>
        {recent.map((a:Row,i:number)=>{
          const st=(a.status||'').toLowerCase();
          const sc=st==='present'||st==='late'?'#22c55e':st==='absent'?'#f87171':'rgba(255,255,255,0.4)';
          const label=st.charAt(0).toUpperCase()+st.slice(1);
          const date=a.session_date||a.date||'';
          return(
            <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'10px 16px',borderBottom:i<recent.length-1?`1px solid ${BORDER}`:'none'}}>
              <div style={{minWidth:40,textAlign:'center',flexShrink:0}}>
                {date&&<><p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(date,{month:'short'})}</p>
                <p style={{fontSize:16,fontWeight:900,color:'white',lineHeight:1}}>{new Date(date).getDate()}</p></>}
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.6)'}}>Training Session</p>
              </div>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:20,background:`${sc}15`,color:sc,border:`1px solid ${sc}25`}}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TestResultsPage({testResults}:any){
  if(!testResults.length)return<ComingSoon label="Test Results" desc="Your fitness testing history will appear here once your coach records your HP testing data."/>;
  const latest=testResults[0];
  return(
    <div style={{display:'grid',gap:14}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <h2 style={{fontSize:18,fontWeight:900}}>Test Results</h2>
        <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',background:CARD,border:`1px solid ${BORDER}`,borderRadius:8,padding:'5px 12px'}}>{testResults.length} records</span>
      </div>
      <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'rgba(255,255,255,0.04)'}}>
              {['Test','Latest','Benchmark','Term','Trend'].map(h=>(
                <th key={h} style={{padding:'12px 16px',textAlign:'left',fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',borderBottom:`1px solid ${BORDER}`}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TESTS.map(t=>{
              const v=latest[t.key]!=null?parseFloat(latest[t.key]):null;
              if(!v||isNaN(v))return null;
              const tier=getTier(t.key,v,t.lower);
              const allVals=testResults.map((r:Row)=>parseFloat(r[t.key])).filter((x:number)=>!isNaN(x));
              return(
                <tr key={t.key} style={{borderBottom:`1px solid ${BORDER}`}}>
                  <td style={{padding:'12px 16px',fontSize:13,fontWeight:700,color:'white'}}>{t.label}</td>
                  <td style={{padding:'12px 16px',fontSize:14,fontWeight:900,color:tier.color}}>{fmtTestVal(t.key,v)}{t.unit}</td>
                  <td style={{padding:'12px 16px'}}><Badge tier={tier}/></td>
                  <td style={{padding:'12px 16px',fontSize:12,color:'rgba(255,255,255,0.5)'}}>{latest.term} {latest.year}</td>
                  <td style={{padding:'12px 16px'}}><Sparkline vals={allVals.slice(-5)} color={tier.color} lower={t.lower}/></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SchedulePage({fixtures,weekItems,C,primary}:any){
  return(
    <div style={{display:'grid',gap:14}}>
      <h2 style={{fontSize:18,fontWeight:900}}>Schedule</h2>
      {weekItems.length>0&&(
        <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
          <div style={{padding:'14px 16px',borderBottom:`1px solid ${BORDER}`}}>
            <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>Training This Week</p>
          </div>
          {weekItems.map((item:Row,i:number)=>(
            <div key={item.id} style={{display:'flex',alignItems:'center',gap:14,padding:'13px 16px',borderBottom:i<weekItems.length-1?`1px solid ${BORDER}`:'none'}}>
              <div style={{width:48,textAlign:'center'}}>
                <p style={{fontSize:11,fontWeight:800,color:C,textTransform:'uppercase'}}>{(item.day_label||'').slice(0,3)}</p>
              </div>
              <div style={{width:1,height:36,background:`${C}25`,flexShrink:0}}/>
              <div style={{flex:1}}>
                <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>{item.title}</p>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{item.subtitle||''}</p>
              </div>
              <span style={{fontSize:9,fontWeight:800,padding:'3px 9px',borderRadius:20,background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)',border:`1px solid ${BORDER}`}}>TRAINING</span>
            </div>
          ))}
        </div>
      )}
      <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <p style={{fontSize:10,fontWeight:800,color:C,textTransform:'uppercase',letterSpacing:'0.12em'}}>Upcoming Fixtures</p>
          <Link href={`/portal/fixtures/season?sport=${primary}`} style={{fontSize:11,fontWeight:700,color:C,textDecoration:'none'}}>Full schedule →</Link>
        </div>
        {fixtures.length===0?<p style={{padding:'20px 16px',fontSize:13,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No fixtures scheduled.</p>:
        fixtures.map((f:Row,i:number)=>(
          <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${primary}`}
            style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',borderBottom:i<fixtures.length-1?`1px solid ${BORDER}`:'none',textDecoration:'none',color:'inherit'}}>
            <div style={{minWidth:44,textAlign:'center',flexShrink:0}}>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(f.fixture_date,{month:'short'})}</p>
              <p style={{fontSize:22,fontWeight:900,color:'white',lineHeight:1}}>{new Date(f.fixture_date).getDate()}</p>
              <p style={{fontSize:9,color:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{fmtDate(f.fixture_date,{weekday:'short'})}</p>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:14,fontWeight:800,color:'white',marginBottom:3}}>vs {f.opponent}</p>
              <p style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{f.team} · {f.venue||f.home_away||'—'}</p>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:4}}>{f.fixture_time||'TBC'}</p>
              <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:20,background:f.home_away==='home'?`${C}18`:'rgba(255,255,255,0.06)',color:f.home_away==='home'?C:'rgba(255,255,255,0.4)',border:`1px solid ${f.home_away==='home'?C+'30':'transparent'}`}}>
                {(f.home_away||'').toUpperCase()||'—'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CoachFeedbackPage({reminders,C}:any){
  if(!reminders.length)return<ComingSoon label="Coach Feedback" desc="Your coach's feedback and action points will appear here."/>;
  return(
    <div style={{display:'grid',gap:14}}>
      <h2 style={{fontSize:18,fontWeight:900}}>Coach Feedback</h2>
      {reminders.map((r:Row,i:number)=>(
        <div key={r.id} style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
            <h3 style={{fontSize:15,fontWeight:800,color:'white'}}>{r.title}</h3>
            <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',flexShrink:0,marginLeft:12}}>{timeAgo(r.created_at||'')}</span>
          </div>
          {(r.details||r.body)&&<p style={{fontSize:13,color:'rgba(255,255,255,0.6)',lineHeight:1.7}}>{r.details||r.body}</p>}
          <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:'50%',background:`${C}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 0 1 0 8 4 4 0 0 1 0-8" size={13} color={C}/>
            </div>
            <span style={{fontSize:12,color:'rgba(255,255,255,0.5)',fontWeight:600}}>Coaching Staff</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SettingsPage({profile,C,onSignOut}:any){
  return(
    <div style={{display:'grid',gap:14}}>
      <h2 style={{fontSize:18,fontWeight:900}}>Settings</h2>
      <div style={{borderRadius:16,background:CARD,border:`1px solid ${BORDER}`,padding:'20px'}}>
        <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:16}}>Account</p>
        <div style={{display:'grid',gap:10}}>
          {[
            {label:'Full Name',val:profile.full_name||'—'},
            {label:'Email',val:profile.email||'—'},
            {label:'Grade',val:profile.grade||'—'},
          ].map(item=>(
            <div key={item.label} style={{display:'flex',justifyContent:'space-between',padding:'12px 14px',borderRadius:10,background:'rgba(255,255,255,0.03)',border:`1px solid ${BORDER}`}}>
              <span style={{fontSize:12,color:'rgba(255,255,255,0.5)'}}>{item.label}</span>
              <span style={{fontSize:12,fontWeight:700,color:'white'}}>{item.val}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <Link href="/player/setup" style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`1px solid ${BORDER}`,background:CARD,textDecoration:'none',color:'white'}}>
          <Icon d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" size={16} color={C}/>
          <span style={{fontSize:13,fontWeight:700}}>Edit Profile</span>
          <Icon d="M9 18l6-6-6-6" size={14} color="rgba(255,255,255,0.3)" sw={2}/>
        </Link>
        <button onClick={onSignOut} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:'1px solid rgba(248,113,113,0.2)',background:'rgba(248,113,113,0.06)',cursor:'pointer',color:'#f87171',textAlign:'left',width:'100%'}}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={16} color="#f87171"/>
          <span style={{fontSize:13,fontWeight:700}}>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function PlayerProfile(){
  const router=useRouter();
  const [nav,     setNav]     = React.useState('overview');
  const [profile, setProfile] = React.useState<Row|null>(null);
  const [athlete, setAthlete] = React.useState<Row|null>(null);
  const [fixtures,setFixtures]= React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [reminders,setReminders]=React.useState<Row[]>([]);
  const [weekItems,setWeekItems]=React.useState<Row[]>([]);
  const [attRows,  setAttRows]  =React.useState<Row[]>([]);
  const [testResults,setTestResults]=React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [menuOpen,setMenuOpen]= React.useState(false);

  React.useEffect(()=>{
    supabase.auth.getSession().then(async({data:{session}})=>{
      if(!session){router.replace('/player/auth');return;}
      const{data:prof}=await supabase.from('player_profiles').select('*').eq('user_id',session.user.id).maybeSingle();
      if(!prof){router.replace('/player/setup');return;}
      setProfile(prof);
      const sports=(prof.sports||[]).map((s:string)=>s.toLowerCase());
      const primary=sports[0]||'hockey';
      const today=new Date().toISOString().split('T')[0];
      const[fxR,resR,remR,planR]=await Promise.all([
        supabase.from('portal_fixtures').select('*').eq('sport',primary).eq('is_published',true).gte('fixture_date',today).order('fixture_date').limit(10),
        supabase.from('portal_results').select('*').eq('sport',primary).eq('is_published',true).order('result_date',{ascending:false}).limit(20),
        supabase.from('portal_reminders').select('*').eq('sport',primary).eq('is_published',true).order('created_at',{ascending:false}).limit(10),
        supabase.from('portal_week_plans').select('id').eq('sport',primary).eq('published',true).order('created_at',{ascending:false}).limit(1),
      ]);
      setFixtures(fxR.data||[]);setResults(resR.data||[]);setReminders(remR.data||[]);
      if(planR.data?.length){
        const{data:items}=await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id',planR.data[0].id).order('sort_order');
        setWeekItems(items||[]);
      }
      if(prof.athlete_id){
        const[{data:ath},{data:att}]=await Promise.all([
          supabase.from('athletes').select('*').eq('id',prof.athlete_id).maybeSingle(),
          supabase.from('attendance').select('*').eq('athlete_id',prof.athlete_id).order('session_date',{ascending:false}),
        ]);
        setAthlete(ath);setAttRows(att||[]);
      }
      // HP test results
      if(prof.athlete_id||prof.hp_student_id){
        const hpId=prof.hp_student_id||prof.athlete_id;
        const{data:tr}=await supabase.from('hp_test_results').select('*').eq('student_id',hpId)
          .order('year',{ascending:false}).order('term',{ascending:false}).limit(20);
        setTestResults((tr||[]).sort((a:Row,b:Row)=>TERM_ORDER.indexOf(b.term)-TERM_ORDER.indexOf(a.term)));
      }
      setLoading(false);
    });
  },[router]);

  if(loading)return(
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12}}>
      <div style={{width:26,height:26,borderRadius:'50%',border:'3px solid #38bdf8',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if(!profile)return null;

  const sports=(profile.sports||[]).map((s:string)=>s.toLowerCase());
  const primary=sports[0]||'hockey';
  const C=SPORT_COLORS[primary]||'#38bdf8';
  const initials=(profile.full_name||'?').split(' ').map((w:string)=>w[0]).join('').toUpperCase().slice(0,2);
  const attPct=attRows.length?Math.round(attRows.filter(a=>['present','late'].includes((a.status||'').toLowerCase())).length/attRows.length*100):null;
  const activeLabel=NAV.find(n=>n.id===nav)?.label||'Overview';

  async function signOut(){await supabase.auth.signOut();router.push('/player/auth');}

  return(<>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Inter',system-ui,sans-serif;background:${BG};color:white;overflow-x:hidden;}
      ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      @keyframes spin{to{transform:rotate(360deg)}}
      @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
      .fade-in{animation:fade 0.35s ease both}
      .nhov:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
      .row:hover{background:rgba(255,255,255,0.04)!important;}
      /* Layout */
      .sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;background:${SIDE};border-right:1px solid ${BORDER};display:flex;flex-direction:column;z-index:40;overflow-y:auto;}
      .body{margin-left:220px;min-height:100vh;}
      .mob-head{display:none;}
      .bot-nav{display:none;}
      @media(max-width:900px){
        .sidebar{display:none!important;}
        .body{margin-left:0!important;}
        .mob-head{display:flex!important;position:sticky;top:0;z-index:50;background:rgba(6,12,26,0.97);backdrop-filter:blur(12px);border-bottom:1px solid ${BORDER};height:52px;align-items:center;justify-content:space-between;padding:0 16px;}
        .bot-nav{display:flex!important;position:fixed;bottom:0;left:0;right:0;z-index:50;background:rgba(6,12,26,0.97);backdrop-filter:blur(12px);border-top:1px solid ${BORDER};padding:6px 0 10px;justify-content:space-around;}
        .page-pad{padding:14px 14px 80px!important;}
      }
    `}</style>

    <div style={{display:'flex',minHeight:'100vh'}}>
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        {/* Brand */}
        <div style={{padding:'16px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:10,flexShrink:0}}>
          <Image src="/st-benedicts-logo.png" alt="SBC" width={32} height={32} style={{objectFit:'contain',flexShrink:0}}/>
          <div>
            <p style={{fontSize:11,fontWeight:900,color:'white',lineHeight:1.2}}>ST BENEDICT&apos;S COLLEGE</p>
            <p style={{fontSize:9,fontWeight:700,color:C,textTransform:'uppercase',letterSpacing:'0.08em',marginTop:2}}>Kinetiq Sport</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{padding:'10px 8px',flex:1,overflowY:'auto'}}>
          {NAV.map(n=>{
            const active=nav===n.id;
            return(
              <button key={n.id} className="nhov" onClick={()=>setNav(n.id)}
                style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:9,border:'none',cursor:'pointer',marginBottom:1,textAlign:'left',background:active?`${C}18`:'transparent',color:active?C:'rgba(255,255,255,0.45)',fontWeight:active?700:500,fontSize:12,transition:'all 0.15s',borderLeft:active?`2px solid ${C}`:'2px solid transparent'}}>
                <Icon d={n.icon} size={14} color={active?C:'rgba(255,255,255,0.4)'}/>
                {n.label}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{padding:'12px',borderTop:`1px solid ${BORDER}`,flexShrink:0}}>
          <button className="nhov" onClick={()=>setNav('settings')}
            style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'10px',borderRadius:10,border:'none',cursor:'pointer',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.6)',textAlign:'left',transition:'all 0.15s'}}>
            <div style={{width:32,height:32,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,flexShrink:0,color:'white'}}>{initials}</div>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:12,fontWeight:700,color:'white',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile.full_name}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:1}}>View my account</p>
            </div>
          </button>
        </div>
      </aside>

      {/* ── BODY ── */}
      <div className="body" style={{flex:1}}>
        {/* Mobile header */}
        <header className="mob-head">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={26} height={26} style={{objectFit:'contain'}}/>
            <span style={{fontSize:14,fontWeight:800}}>{activeLabel}</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.05)',borderRadius:20,padding:'3px 12px 3px 3px',border:`1px solid ${BORDER}`}}>
            <div style={{width:26,height:26,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900}}>{initials}</div>
            <span style={{fontSize:12,fontWeight:600}}>{(profile.full_name||'').split(' ')[0]}</span>
          </div>
        </header>

        {/* Top bar (desktop) */}
        <header style={{height:56,borderBottom:`1px solid ${BORDER}`,background:'rgba(6,12,26,0.95)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:30,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px'}} className="desk-head">
          <style>{`.desk-head{display:flex;}@media(max-width:900px){.desk-head{display:none!important;}}`}</style>
          <p style={{fontSize:14,fontWeight:800,color:'white'}}>{activeLabel}</p>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BORDER}`,borderRadius:24,padding:'5px 16px 5px 5px'}}>
              <div style={{width:30,height:30,borderRadius:'50%',background:`linear-gradient(135deg,#1d4ed8,${C})`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900}}>{initials}</div>
              <span style={{fontSize:13,fontWeight:600}}>{profile.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-pad" style={{padding:'24px 28px',maxWidth:1100,margin:'0 auto'}}>
          <div className="fade-in" key={nav}>
            {nav==='overview'    && <OverviewPage profile={profile} athlete={athlete} fixtures={fixtures} results={results} reminders={reminders} weekItems={weekItems} att={attPct} C={C} sports={sports}/>}
            {nav==='schedule'    && <SchedulePage fixtures={fixtures} weekItems={weekItems} C={C} primary={primary}/>}
            {nav==='performance' && <PerformancePage testResults={testResults} athlete={athlete}/>}
            {nav==='testresults' && <TestResultsPage testResults={testResults}/>}
            {nav==='attendance'  && <AttendancePage attRows={attRows} C={C}/>}
            {nav==='programs'    && <ComingSoon label="Training Programs" desc="Your training programmes will appear here. Ask your coach to upload them to the system."/>}
            {nav==='feedback'    && <CoachFeedbackPage reminders={reminders} C={C}/>}
            {nav==='messages'    && <ComingSoon label="Messages" desc="Direct messaging from your coaching staff will appear here soon."/>}
            {nav==='documents'   && <ComingSoon label="Documents" desc="Training plans, season guides and team documents will be shared here."/>}
            {nav==='injuries'    && <ComingSoon label="Injuries & Medical" desc="Your availability status and return-to-play information will appear here. This section is private and secure."/>}
            {nav==='goals'       && <ComingSoon label="Goals" desc="Coach-set and self-set goals with progress tracking will appear here."/>}
            {nav==='settings'    && <SettingsPage profile={profile} C={C} onSignOut={signOut}/>}
          </div>
        </main>

        {/* Mobile bottom nav — top 4 tabs only */}
        <nav className="bot-nav">
          {[NAV[0],NAV[1],NAV[2],NAV[4],NAV[11]].map(n=>{
            const active=nav===n.id;
            return(
              <button key={n.id} onClick={()=>setNav(n.id)}
                style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'3px 10px',border:'none',background:'none',cursor:'pointer',color:active?C:'rgba(255,255,255,0.35)',transition:'color 0.15s'}}>
                <Icon d={n.icon} size={18} color={active?C:'rgba(255,255,255,0.35)'}/>
                <span style={{fontSize:9,fontWeight:active?800:600,letterSpacing:'0.03em'}}>{n.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>

    {/* Mobile slide-out full menu */}
    {menuOpen&&(
      <div style={{position:'fixed',inset:0,zIndex:60}} onClick={()=>setMenuOpen(false)}>
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}/>
        <div style={{position:'absolute',right:0,top:0,bottom:0,width:260,background:SIDE,borderLeft:`1px solid ${BORDER}`,overflow:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{padding:'16px',borderBottom:`1px solid ${BORDER}`}}>
            <p style={{fontSize:13,fontWeight:800}}>All Sections</p>
          </div>
          {NAV.map(n=>(
            <button key={n.id} onClick={()=>{setNav(n.id);setMenuOpen(false);}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:12,padding:'12px 16px',border:'none',cursor:'pointer',background:nav===n.id?`${C}15`:'transparent',color:nav===n.id?C:'rgba(255,255,255,0.6)',textAlign:'left',fontSize:13,fontWeight:nav===n.id?700:500}}>
              <Icon d={n.icon} size={15} color={nav===n.id?C:'rgba(255,255,255,0.45)'}/>
              {n.label}
            </button>
          ))}
        </div>
      </div>
    )}
  </>);
}
