'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group:'Senior', accent:'#a78bfa', dim:'rgba(167,139,250,0.08)', teams:['1sts','2nds','3rds','4ths','5ths'] },
  { group:'U16',    accent:'#38bdf8', dim:'rgba(56,189,248,0.08)',  teams:['U16A','U16B','U16C','U16D','U16E'] },
  { group:'U15',    accent:'#10b981', dim:'rgba(16,185,129,0.08)',  teams:['U15A','U15B','U15C','U15D','U15E'] },
  { group:'U14',    accent:'#f59e0b', dim:'rgba(245,158,11,0.08)',  teams:['U14A','U14B','U14C','U14D','U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);
function getAccent(t:string){return TEAM_GROUPS.find(g=>g.teams.includes(t))?.accent||'#94a3b8';}
function getDim(t:string){return TEAM_GROUPS.find(g=>g.teams.includes(t))?.dim||'rgba(255,255,255,0.04)';}
function weekAgo(){return new Date(Date.now()-7*86400000).toISOString().split('T')[0];}
function today(){return new Date().toISOString().split('T')[0];}

const STATUS_CFG = {
  Present: {bg:'rgba(16,185,129,0.12)',  color:'#6ee7b7', border:'rgba(16,185,129,0.3)' },
  Late:    {bg:'rgba(251,191,36,0.12)',  color:'#fde68a', border:'rgba(251,191,36,0.3)' },
  Absent:  {bg:'rgba(248,113,113,0.12)', color:'#fca5a5', border:'rgba(248,113,113,0.3)'},
  Excused: {bg:'rgba(56,189,248,0.12)',  color:'#7dd3fc', border:'rgba(56,189,248,0.3)' },
} as const;

// ── Micro-loader ─────────────────────────────────────────────
function Spinner({color='#38bdf8'}:{color?:string}) {
  return (
    <div className="relative h-5 w-5">
      <div className="absolute inset-0 rounded-full border-2 animate-spin"
        style={{borderColor:`${color}20`,borderTopColor:color}}/>
    </div>
  );
}

// ── Coach MyTeam View ────────────────────────────────────────
function MyTeamView({teamName,athletes,attendance,fixtures,onRefresh}:{
  teamName:string; athletes:Row[]; attendance:Row[]; fixtures:Row[]; onRefresh:()=>void;
}) {
  const accent   = getAccent(teamName);
  const dimBg    = getDim(teamName);
  const {showToast} = useToast();
  const [sessionType,setSessionType] = React.useState('Training');
  const [statuses,setStatuses]       = React.useState<Record<string,string>>({});
  const [saving,setSaving]           = React.useState(false);
  const [saved,setSaved]             = React.useState(false);
  const [tab,setTab]                 = React.useState<'register'|'squad'>('register');
  const [mounted,setMounted]         = React.useState(false);
  React.useEffect(()=>{setTimeout(()=>setMounted(true),50);},[]);

  const squad = React.useMemo(()=>
    [...athletes].sort((a,b)=>(a.full_name||'').split(' ').pop()!.localeCompare((b.full_name||'').split(' ').pop()!))
  ,[athletes]);

  React.useEffect(()=>{
    const init:Record<string,string>={};
    squad.forEach(a=>{
      const ex=attendance.find(r=>r.athlete_id===a.id&&r.session_date===today());
      init[a.id]=ex?.status||'Present';
    });
    setStatuses(init);
    setSaved(squad.some(a=>!!attendance.find(r=>r.athlete_id===a.id&&r.session_date===today())));
  },[squad,attendance]);

  async function save() {
    setSaving(true);
    const ids=squad.map(a=>a.id);
    await supabase.from('attendance').delete().eq('session_date',today()).in('athlete_id',ids);
    const {error}=await supabase.from('attendance').insert(squad.map(a=>({
      athlete_id:a.id,session_date:today(),session_type:sessionType,status:statuses[a.id]||'Present',
    })));
    if(error){showToast(`Error: ${error.message}`,'error');}
    else{setSaved(true);showToast('Register saved ✓');}
    setSaving(false);onRefresh();
  }

  const present = squad.filter(a=>(statuses[a.id]||'Present')==='Present').length;
  const absent  = squad.filter(a=>statuses[a.id]==='Absent').length;
  const late    = squad.filter(a=>statuses[a.id]==='Late').length;
  const unavail = squad.filter(a=>a.availability&&a.availability!=='Available');
  const next    = fixtures.find(f=>f.fixture_date>=today());
  const daysTo  = next?Math.max(0,Math.ceil((new Date(next.fixture_date).getTime()-Date.now())/86400000)):null;

  const fade = (d:number) => ({
    opacity:mounted?1:0,
    transform:mounted?'translateY(0)':'translateY(16px)',
    transition:`opacity 0.55s ease ${d}ms, transform 0.55s ease ${d}ms`,
  });

  return (
    <div className="space-y-4">

      {/* ── HERO HEADER ── */}
      <div style={fade(0)}>
        <div className="relative overflow-hidden rounded-3xl border"
          style={{background:`linear-gradient(135deg,${dimBg} 0%,rgba(255,255,255,0.015) 100%)`,borderColor:'rgba(255,255,255,0.07)'}}>
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{background:`linear-gradient(90deg,transparent,${accent}80,transparent)`}}/>
          {/* Glow */}
          <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full blur-[60px] pointer-events-none"
            style={{background:`${accent}20`}}/>

          <div className="relative p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1.5"
              style={{color:`${accent}90`}}>My Team</p>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-5xl font-black tracking-tight leading-none" style={{color:accent}}>{teamName}</h1>
                <p className="mt-2 text-[13px] font-medium" style={{color:'rgba(255,255,255,0.4)'}}>
                  {new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}
                </p>
                <p className="text-[13px]" style={{color:'rgba(255,255,255,0.25)'}}>
                  {squad.length} players registered
                </p>
              </div>
              <Link href={`/teams/${teamName}`}
                className="shrink-0 mt-1 rounded-xl px-3 py-1.5 text-[11px] font-semibold border transition"
                style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.45)'}}>
                Full page →
              </Link>
            </div>

            {/* Unavailable pills */}
            {unavail.length>0&&(
              <div className="mt-4 pt-4 border-t flex flex-wrap gap-1.5"
                style={{borderColor:'rgba(255,255,255,0.06)'}}>
                {unavail.map(a=>{
                  const inj=a.availability==='Injured';
                  return(
                    <Link key={a.id} href={`/athletes/${a.id}`}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition hover:opacity-80"
                      style={{
                        background:inj?'rgba(248,113,113,0.1)':'rgba(251,191,36,0.1)',
                        color:inj?'#fca5a5':'#fde68a',
                        border:`1px solid ${inj?'rgba(248,113,113,0.2)':'rgba(251,191,36,0.2)'}`,
                      }}>
                      <span className="h-1 w-1 rounded-full" style={{background:inj?'#f87171':'#fbbf24'}}/>
                      {a.full_name?.split(' ').pop()} · {a.availability}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── NEXT MATCH CARD ── */}
      {next&&(
        <div style={fade(60)}>
          <div className="relative overflow-hidden rounded-2xl border"
            style={{background:'rgba(167,139,250,0.04)',borderColor:'rgba(167,139,250,0.15)'}}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{background:'linear-gradient(90deg,transparent,rgba(167,139,250,0.5),transparent)'}}/>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-violet-400 mb-1">Next Match</p>
                <p className="text-[15px] font-black text-white">vs {next.opponent}</p>
                <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>
                  {new Date(next.fixture_date).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'})}
                  {next.fixture_time&&` · ${next.fixture_time}`}
                  {next.venue&&` · ${next.venue}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-4xl font-black leading-none" style={{color:'#a78bfa'}}>{daysTo}</p>
                <p className="text-[9px] font-semibold uppercase tracking-widest mt-1" style={{color:'rgba(167,139,250,0.5)'}}>days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TABS ── */}
      <div style={fade(90)}>
        <div className="flex gap-1 rounded-2xl p-1 border"
          style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
          {(['register','squad'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className="flex-1 rounded-xl py-2.5 text-[12px] font-semibold transition-all"
              style={{
                background:tab===t?'rgba(255,255,255,0.07)':'transparent',
                color:tab===t?'white':'rgba(255,255,255,0.35)',
              }}>
              {t==='register'?"Today's Register":"Squad"}
            </button>
          ))}
        </div>
      </div>

      {/* ── REGISTER TAB ── */}
      {tab==='register'&&(
        <div style={fade(110)}>
          <div className="overflow-hidden rounded-2xl border"
            style={{background:'rgba(255,255,255,0.015)',borderColor:'rgba(255,255,255,0.06)'}}>

            {/* Register controls */}
            <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-b"
              style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.05)'}}>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <span className="text-[22px] font-black text-white leading-none">{present}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide ml-1" style={{color:'rgba(255,255,255,0.25)'}}>present</span>
                </div>
                {absent>0&&<span className="text-[11px] font-semibold" style={{color:'#f87171'}}>{absent} absent</span>}
                {late>0&&<span className="text-[11px] font-semibold" style={{color:'#fbbf24'}}>{late} late</span>}
              </div>
              <div className="flex items-center gap-2">
                <select value={sessionType} onChange={e=>setSessionType(e.target.value)}
                  className="rounded-xl text-[12px] font-semibold px-3 py-1.5 outline-none transition"
                  style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.7)'}}>
                  {['Training','Match','Gym','Fitness','Extras','Other'].map(t=><option key={t}>{t}</option>)}
                </select>
                <button onClick={save} disabled={saving}
                  className="flex items-center gap-2 rounded-xl px-4 py-1.5 text-[12px] font-bold transition-all disabled:opacity-50"
                  style={{
                    background:saved?'rgba(16,185,129,0.12)':`${accent}12`,
                    color:saved?'#6ee7b7':accent,
                    border:`1px solid ${saved?'rgba(16,185,129,0.25)':`${accent}25`}`,
                  }}>
                  {saving?<Spinner color={saved?'#6ee7b7':accent}/>
                  :saved?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3.5 w-3.5"><polyline points="20 6 9 17 4 12"/></svg>
                  :null}
                  {saving?'Saving…':saved?'Saved':'Save'}
                </button>
              </div>
            </div>

            {/* Player list */}
            <div className="divide-y divide-white/5">
              {squad.map((a,i)=>{
                const status=statuses[a.id]||'Present';
                return(
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 transition"
                    style={{animationDelay:`${i*20}ms`}}>
                    {/* Avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-black"
                      style={{background:`${accent}12`,color:accent}}>
                      {(a.full_name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">{a.full_name}</p>
                      {a.availability&&a.availability!=='Available'&&(
                        <p className="text-[10px] font-medium" style={{color:a.availability==='Injured'?'#fca5a5':a.availability==='Modified'?'#fde68a':'#7dd3fc'}}>
                          {a.availability}
                        </p>
                      )}
                    </div>
                    {/* Status buttons */}
                    <div className="flex gap-1 shrink-0">
                      {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(s=>{
                        const c=STATUS_CFG[s];
                        const active=status===s;
                        return(
                          <button key={s}
                            onClick={()=>{setStatuses(p=>({...p,[a.id]:s}));setSaved(false);}}
                            className="rounded-lg text-[10px] font-black transition-all"
                            style={{
                              width:28,height:28,
                              background:active?c.bg:'rgba(255,255,255,0.03)',
                              color:active?c.color:'rgba(255,255,255,0.2)',
                              border:`1px solid ${active?c.border:'rgba(255,255,255,0.05)'}`,
                              transform:active?'scale(1.05)':'scale(1)',
                            }}>
                            {s[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── SQUAD TAB ── */}
      {tab==='squad'&&(
        <div style={fade(110)} className="space-y-3">
          <div className="overflow-hidden rounded-2xl border"
            style={{background:'rgba(255,255,255,0.015)',borderColor:'rgba(255,255,255,0.06)'}}>
            <div className="flex items-center justify-between px-5 py-3 border-b"
              style={{borderColor:'rgba(255,255,255,0.05)'}}>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'rgba(255,255,255,0.3)'}}>
                Full Squad · {squad.length}
              </p>
              <Link href={`/teams/${teamName}`}
                className="text-[10px] font-semibold transition" style={{color:'rgba(255,255,255,0.3)'}}>
                Manage →
              </Link>
            </div>
            <div className="divide-y divide-white/5">
              {squad.map(a=>{
                const av=a.availability||'Available';
                const c=av==='Available'?'#6ee7b7':av==='Modified'?'#fde68a':av==='Injured'?'#fca5a5':'#7dd3fc';
                return(
                  <Link key={a.id} href={`/athletes/${a.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 transition"
                    style={{}}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black"
                      style={{background:`${accent}12`,color:accent}}>
                      {(a.full_name||'?').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white">{a.full_name}</p>
                      <p className="text-[10px]" style={{color:'rgba(255,255,255,0.25)'}}>{a.position||a.age_group||'—'}</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
                      style={{background:`${c}12`,color:c,border:`1px solid ${c}25`}}>
                      {av}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 gap-2">
            {[
              {href:`/teams/${teamName}`,label:'Log Result',sub:'Post match score',color:accent,
                icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M12 5v14M5 12h14"/></svg>},
              {href:'/performance',label:'Testing',sub:'Enter results',color:'#a78bfa',
                icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
            ].map(l=>(
              <Link key={l.href} href={l.href}
                className="flex items-center gap-3 rounded-2xl border p-4 transition"
                style={{background:'rgba(255,255,255,0.015)',borderColor:'rgba(255,255,255,0.06)'}}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                  style={{background:`${l.color}12`,color:l.color}}>
                  {l.icon}
                </div>
                <div>
                  <p className="text-[12px] font-bold text-white">{l.label}</p>
                  <p className="text-[10px]" style={{color:'rgba(255,255,255,0.3)'}}>{l.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HOH Overview ─────────────────────────────────────────────
function OverviewView({athletes,attendance,myTeams,canSeeAllTeams,coaches}:{
  athletes:Row[];attendance:Row[];myTeams:string[];canSeeAllTeams:boolean;coaches:Row[];
}) {
  const visibleTeams = canSeeAllTeams?ALL_TEAMS:myTeams;
  const [mounted,setMounted] = React.useState(false);
  React.useEffect(()=>{setTimeout(()=>setMounted(true),50);},[]);

  function coachFor(team:string) {
    const c=coaches.find(c=>c.role==='coach'&&Array.isArray(c.teams)&&c.teams.includes(team));
    if(!c)return'';
    return c.full_name||(c.email.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase()));
  }

  const cards = visibleTeams
    .filter(t=>athletes.some(a=>a.team===t))
    .map(team=>{
      const sq=athletes.filter(a=>a.team===team);
      const ta=attendance.filter(r=>sq.some(a=>a.id===r.athlete_id));
      const tp=ta.filter(r=>['present','late'].includes(r.status?.toLowerCase()||'')).length;
      const rate=ta.length>0?Math.round((tp/ta.length)*100):null;
      const inj=sq.filter(a=>a.availability==='Injured').length;
      const mod=sq.filter(a=>a.availability==='Modified').length;
      return{team,count:sq.length,rate,inj,mod,accent:getAccent(team),dim:getDim(team),coach:coachFor(team)};
    });

  const total=athletes.length;
  const injured=athletes.filter(a=>a.availability==='Injured');
  const modified=athletes.filter(a=>a.availability==='Modified');
  const resting=athletes.filter(a=>a.availability==='Resting');
  const unavail=[...injured,...modified,...resting];
  const lowAtt=cards.filter(t=>t.rate!==null&&t.rate<70);
  const dateStr=new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'});

  const fade=(d:number)=>({
    opacity:mounted?1:0,
    transform:mounted?'translateY(0)':'translateY(14px)',
    transition:`opacity 0.55s ease ${d}ms, transform 0.55s ease ${d}ms`,
  });

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <div style={fade(0)}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-2"
          style={{color:'rgba(255,255,255,0.25)'}}>Head of Hockey</p>
        <h1 className="text-4xl font-black tracking-tight text-white leading-none">
          Department<br/>
          <span style={{
            background:'linear-gradient(135deg,#38bdf8,#818cf8)',
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
          }}>Overview</span>
        </h1>
        <p className="mt-2 text-[13px] font-medium" style={{color:'rgba(255,255,255,0.3)'}}>{dateStr}</p>
      </div>

      {/* ── STAT STRIP ── */}
      <div style={fade(80)}>
        <div className="grid grid-cols-4 gap-2">
          {[
            {label:'Squad',   val:total,          sub:'athletes', color:'white', glow:'rgba(255,255,255,0.04)'},
            {label:'Injured', val:injured.length, sub:'players',  color:injured.length>0?'#f87171':'rgba(255,255,255,0.15)', glow:injured.length>0?'rgba(248,113,113,0.06)':'transparent'},
            {label:'Modified',val:modified.length,sub:'players',  color:modified.length>0?'#fbbf24':'rgba(255,255,255,0.15)', glow:modified.length>0?'rgba(251,191,36,0.06)':'transparent'},
            {label:'Teams',   val:cards.length,   sub:'active',   color:'#38bdf8', glow:'rgba(56,189,248,0.06)'},
          ].map(s=>(
            <div key={s.label} className="relative overflow-hidden rounded-2xl border p-3 text-center"
              style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)',boxShadow:`0 0 30px ${s.glow}`}}>
              <p className="text-[22px] font-black leading-none" style={{color:s.color}}>{s.val}</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.15em] mt-1 leading-tight"
                style={{color:'rgba(255,255,255,0.25)'}}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ALERTS ── */}
      {unavail.length>0&&(
        <div style={fade(120)}>
          <div className="overflow-hidden rounded-2xl border"
            style={{background:'rgba(248,113,113,0.04)',borderColor:'rgba(248,113,113,0.15)'}}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{borderColor:'rgba(248,113,113,0.1)'}}>
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"/>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400">
                Unavailable · {unavail.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {unavail.map(a=>{
                const inj=a.availability==='Injured';
                const mod=a.availability==='Modified';
                const c=inj?{bg:'rgba(248,113,113,0.1)',color:'#fca5a5',border:'rgba(248,113,113,0.2)'}
                  :mod?{bg:'rgba(251,191,36,0.1)',color:'#fde68a',border:'rgba(251,191,36,0.2)'}
                  :{bg:'rgba(56,189,248,0.1)',color:'#7dd3fc',border:'rgba(56,189,248,0.2)'};
                return(
                  <Link key={a.id} href={`/athletes/${a.id}`}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition hover:opacity-80"
                    style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`}}>
                    {a.full_name?.split(' ').pop()}
                    <span style={{opacity:0.5}}>· {a.team} · {a.availability}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {lowAtt.length>0&&(
        <div style={fade(140)}>
          <div className="overflow-hidden rounded-2xl border"
            style={{background:'rgba(251,191,36,0.03)',borderColor:'rgba(251,191,36,0.12)'}}>
            <div className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{borderColor:'rgba(251,191,36,0.08)'}}>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400"/>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Low Attendance · 7 days
              </p>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {lowAtt.map(t=>(
                <Link key={t.team} href={`/teams/${t.team}`}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold"
                  style={{background:'rgba(251,191,36,0.08)',color:'#fde68a',border:'1px solid rgba(251,191,36,0.18)'}}>
                  {t.team}
                  <span style={{opacity:0.5}}>· {t.rate}%</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ACTIONS ── */}
      <div style={fade(160)}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{color:'rgba(255,255,255,0.2)'}}>Quick Actions</p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            {label:'Attendance',href:'/attendance',color:'#10b981',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
            {label:'Performance',href:'/performance',color:'#a78bfa',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
            {label:'Athletes',href:'/athletes',color:'#38bdf8',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>},
            {label:'Coaches',href:'/coaches',color:'#f59e0b',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>},
            {label:'Portal',href:'/portal-admin',color:'#f87171',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>},
            {label:'Export',href:'/export/attendance',color:'#94a3b8',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>},
          ].map((a,i)=>(
            <Link key={a.href} href={a.href}
              className="group flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background:'rgba(255,255,255,0.02)',
                borderColor:'rgba(255,255,255,0.06)',
                animationDelay:`${i*40}ms`,
              }}>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                style={{background:`${a.color}12`,color:a.color}}>
                {a.icon}
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] leading-tight transition"
                style={{color:'rgba(255,255,255,0.35)'}}>
                {a.label}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* ── TEAM GRID ── */}
      <div style={fade(200)}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{color:'rgba(255,255,255,0.2)'}}>All Teams</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({team,count,rate,inj,mod,accent,dim,coach},i)=>(
            <Link key={team} href={`/teams/${team}`}
              className="group relative overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background:'rgba(255,255,255,0.015)',
                borderColor:'rgba(255,255,255,0.06)',
                animationDelay:`${i*30}ms`,
              }}>
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{background:`radial-gradient(ellipse at 50% 0%,${dim},transparent 70%)`}}/>
              {/* Top accent */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity"
                style={{background:`linear-gradient(90deg,transparent,${accent}60,transparent)`}}/>

              <div className="relative flex items-center justify-between p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-[22px] font-black tracking-tight leading-none" style={{color:accent}}>{team}</p>
                  <p className="text-[10px] font-medium mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{count} players</p>
                  {coach&&(
                    <p className="text-[10px] mt-0.5 truncate" style={{color:'rgba(255,255,255,0.2)'}}>
                      {coach}
                    </p>
                  )}
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {inj>0&&<span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{background:'rgba(248,113,113,0.1)',color:'#fca5a5'}}>{inj} inj</span>}
                    {mod>0&&<span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{background:'rgba(251,191,36,0.1)',color:'#fde68a'}}>{mod} mod</span>}
                    {inj===0&&mod===0&&<span className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                      style={{background:'rgba(16,185,129,0.08)',color:'#6ee7b7'}}>✓ clear</span>}
                  </div>
                </div>
                {rate!==null&&(
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[26px] font-black leading-none"
                      style={{color:rate>=80?'#10b981':rate>=60?'#fbbf24':'#f87171'}}>
                      {rate}
                    </p>
                    <p className="text-[9px] font-semibold" style={{color:'rgba(255,255,255,0.2)'}}>% att</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const {canSeeAllTeams,teams:myTeams,loading:roleLoading}=useRole();
  const [athletes,setAthletes] = React.useState<Row[]>([]);
  const [attendance,setAttendance] = React.useState<Row[]>([]);
  const [fixtures,setFixtures] = React.useState<Row[]>([]);
  const [coaches,setCoaches] = React.useState<Row[]>([]);
  const [loading,setLoading] = React.useState(true);

  async function load() {
    if(roleLoading)return;
    let q=supabase.from('athletes').select('id,full_name,team,availability,position,age_group');
    if(!canSeeAllTeams&&myTeams.length>0)q=q.in('team',myTeams);
    const [aRes,attRes,fixRes,coachRes]=await Promise.all([
      q,
      supabase.from('attendance').select('id,athlete_id,status,session_date,session_type').gte('session_date',weekAgo()).order('session_date',{ascending:false}).limit(500),
      supabase.from('portal_fixtures').select('*').order('fixture_date').limit(20),
      supabase.from('staff_roles').select('email,teams,role,full_name').eq('is_active',true),
    ]);
    setAthletes(aRes.data||[]);setAttendance(attRes.data||[]);
    setFixtures(fixRes.data||[]);setCoaches(coachRes.data||[]);
    setLoading(false);
  }

  React.useEffect(()=>{load();},[roleLoading,canSeeAllTeams,myTeams.join(',')]);

  if(roleLoading||loading)return(
    <main className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{borderColor:'rgba(56,189,248,0.15)',borderTopColor:'#38bdf8'}}/>
          <div className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{borderColor:'rgba(167,139,250,0.1)',borderBottomColor:'#a78bfa',animationDuration:'1.5s',animationDirection:'reverse'}}/>
        </div>
        <p className="text-[11px] font-medium" style={{color:'rgba(255,255,255,0.2)'}}>Loading…</p>
      </div>
    </main>
  );

  const isSingle=!canSeeAllTeams&&myTeams.length===1;
  const singleTeam=isSingle?myTeams[0]:null;

  return(
    <main className="min-h-screen pb-24 text-white md:pb-8" style={{background:'var(--bg)'}}>
      {/* Ambient light */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 h-80 w-80 rounded-full blur-[100px]"
          style={{background:'rgba(56,189,248,0.05)'}}/>
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full blur-[80px]"
          style={{background:'rgba(167,139,250,0.04)'}}/>
      </div>
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6">
        {isSingle&&singleTeam?(
          <MyTeamView
            teamName={singleTeam}
            athletes={athletes.filter(a=>a.team===singleTeam)}
            attendance={attendance}
            fixtures={fixtures.filter(f=>f.team===singleTeam)}
            onRefresh={load}
          />
        ):(
          <OverviewView
            athletes={athletes}
            attendance={attendance}
            myTeams={myTeams}
            canSeeAllTeams={canSeeAllTeams}
            coaches={coaches}
          />
        )}
      </div>
    </main>
  );
}