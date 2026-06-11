'use client';

import Link from 'next/link';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/Toast';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { getTeamGroups, type SportKey } from '@/lib/sports';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';

type Row = Record<string, any>;

// Sport-aware team group builder
function buildTeamGroups(sport: SportKey | null) {
  const groups = getTeamGroups((sport || 'hockey') as SportKey);
  const ACCENTS = ['#a78bfa','#38bdf8','#10b981','#f59e0b','#f87171','#34d399'];
  return groups.map((g, i) => ({
    group: g.group,
    accent: ACCENTS[i] || '#94a3b8',
    dim: `${ACCENTS[i] || '#94a3b8'}14`,
    teams: g.teams,
  }));
}

// Keep these as functions that accept groups
function getAccent(t:string, groups:{teams:string[];accent:string}[]){
  return groups.find(g=>g.teams.includes(t))?.accent||'#94a3b8';
}
function getDim(t:string, groups:{teams:string[];dim:string}[]){
  return groups.find(g=>g.teams.includes(t))?.dim||'rgba(255,255,255,0.04)';
}
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
  const accent   = getAccent(teamName, buildTeamGroups(null));
  const dimBg    = getDim(teamName, buildTeamGroups(null));
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
  const nowTs = React.useMemo(()=>Date.now(),[]);
  const daysTo  = next?Math.max(0,Math.ceil((new Date(next.fixture_date).getTime()-nowTs)/86400000)):null;

  const fade = (d:number) => ({
    opacity:mounted?1:0,
    transform:mounted?'translateY(0)':'translateY(16px)',
    transition:`opacity 0.55s ease ${d}ms, transform 0.55s ease ${d}ms`,
  });

  return (
    <div className="space-y-4">

      {/* ── HERO HEADER ── */}
      <FadeUp delay={0}>
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
      </FadeUp>

      {/* ── NEXT MATCH CARD ── */}
      {next&&(
        <FadeUp delay={60}>
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
        </FadeUp>
      )}

      {/* ── TABS ── */}
      <FadeUp delay={90}>
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
      </FadeUp>

      {/* ── REGISTER TAB ── */}
      {tab==='register'&&(
        <FadeUp delay={110}>
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
        </FadeUp>
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
// ── ATTENDANCE TREND CHART ────────────────────────────────────
function AttendanceTrendChart({attendance,teams,athletes,sport}:{attendance:Row[];teams:string[];athletes:Row[];sport:SportKey|null}) {
  const SPORT_COLORS: Record<string,string> = {hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const data = React.useMemo(() => {
    const weeks: {week:string;rate:number}[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const start = new Date(d); start.setDate(start.getDate() - 6);
      const startStr = start.toISOString().split('T')[0];
      const endStr   = d.toISOString().split('T')[0];
      const weekRecs = attendance.filter(a => a.session_date >= startStr && a.session_date <= endStr);
      if (!weekRecs.length) return weeks;
      const present = weekRecs.filter(a => ['present','late'].includes(a.status?.toLowerCase()||'')).length;
      const rate = Math.round((present / weekRecs.length) * 100);
      const label = start.toLocaleDateString('en-ZA',{day:'numeric',month:'short'});
      weeks.push({week:label, rate});
    }
    return weeks;
  }, [attendance]);

  if (data.length < 2) return (
    <div className="rounded-2xl border py-8 text-center" style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
      <p className="text-sm" style={{color:'rgba(255,255,255,0.25)'}}>Not enough data yet</p>
    </div>
  );

  return (
    <div className="rounded-2xl border p-4" style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{top:5,right:5,bottom:0,left:-20}}>
          <XAxis dataKey="week" tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
          <YAxis domain={[0,100]} tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
          <Tooltip
            contentStyle={{background:'rgba(10,15,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:11}}
            labelStyle={{color:'rgba(255,255,255,0.5)'}}
            itemStyle={{color:sportColor}}
            formatter={(v:any) => [`${v}%`, 'Attendance']}
          />
          <Line type="monotone" dataKey="rate" stroke={sportColor} strokeWidth={2} dot={{fill:sportColor,r:3}} activeDot={{r:5}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── WIN / LOSS CHART ──────────────────────────────────────────
function WinLossChart({sport}:{sport:SportKey|null}) {
  const [data, setData] = React.useState<{team:string;W:number;D:number;L:number}[]>([]);

  React.useEffect(() => {
    supabase.from('portal_results').select('team,final_score,sport').eq('sport',sport||'hockey').limit(200).then(({data:rows}) => {
      if (!rows) return;
      const map: Record<string,{W:number;D:number;L:number}> = {};
      rows.forEach(r => {
        const parts = r.final_score?.split(/[-–]/);
        if (!parts || parts.length !== 2) return;
        const a = parseInt(parts[0]), b = parseInt(parts[1]);
        if (isNaN(a) || isNaN(b)) return;
        if (!map[r.team]) map[r.team] = {W:0,D:0,L:0};
        if (a > b) map[r.team].W++;
        else if (a === b) map[r.team].D++;
        else map[r.team].L++;
      });
      const sorted = Object.entries(map)
        .map(([team,s]) => ({team,...s}))
        .sort((a,b) => b.W - a.W)
        .slice(0, 8);
      setData(sorted);
    });
  }, [sport]);

  if (!data.length) return null;

  return (
    <div style={{marginTop:0}}>
      <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
        style={{color:'rgba(255,255,255,0.2)'}}>Win / Draw / Loss by Team</p>
      <div className="rounded-2xl border p-4" style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{top:5,right:5,bottom:0,left:-20}} barSize={8} barGap={2}>
            <XAxis dataKey="team" tick={{fill:'rgba(255,255,255,0.35)',fontSize:9}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
            <Tooltip
              contentStyle={{background:'rgba(10,15,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:11}}
              labelStyle={{color:'rgba(255,255,255,0.5)'}}
            />
            <Bar dataKey="W" name="Won"  fill="#10b981" radius={[4,4,0,0]}/>
            <Bar dataKey="D" name="Drew" fill="#fbbf24" radius={[4,4,0,0]}/>
            <Bar dataKey="L" name="Lost" fill="#f87171" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex justify-center gap-4 mt-2">
          {[{c:'#10b981',l:'Won'},{c:'#fbbf24',l:'Drew'},{c:'#f87171',l:'Lost'}].map(x=>(
            <div key={x.l} className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{background:x.c}}/>
              <span className="text-[10px]" style={{color:'rgba(255,255,255,0.3)'}}>{x.l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── OverviewView ──────────────────────────────────────────────
function OverviewView({athletes,attendance,myTeams,canSeeAllTeams,coaches,sport}:{
  athletes:Row[];attendance:Row[];myTeams:string[];canSeeAllTeams:boolean;coaches:Row[];sport:SportKey|null;
}) {
  const TEAM_GROUPS = buildTeamGroups(sport);
  const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);
  const SPORT_COLORS: Record<string,string> = {
    hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',
    rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4',
  };
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
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
      return{team,count:sq.length,rate,inj,mod,accent:getAccent(team,TEAM_GROUPS),dim:getDim(team,TEAM_GROUPS),coach:coachFor(team)};
    });

  const total=athletes.length;
  const injured=athletes.filter(a=>a.availability==='Injured');
  const modified=athletes.filter(a=>a.availability==='Modified');
  const resting=athletes.filter(a=>a.availability==='Resting');
  const unavail=[...injured,...modified,...resting];
  const lowAtt=cards.filter(t=>t.rate!==null&&t.rate<70);
  const dateStr=new Date().toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'});

  return (
    <div className="space-y-5">

      {/* ── HEADER ── */}
      <FadeUp delay={0}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-2"
          style={{color:'rgba(255,255,255,0.25)'}}>Head of {sportLabel}</p>
        <h1 className="text-4xl font-black tracking-tight text-white leading-none">
          Department<br/>
          <span style={{
            background:`linear-gradient(135deg,${sportColor},${sportColor}99)`,
            WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
          }}>Overview</span>
        </h1>
        <p className="mt-2 text-[13px] font-medium" style={{color:'rgba(255,255,255,0.3)'}}>{dateStr}</p>
      </FadeUp>

      {/* ── STAT STRIP ── */}
      <FadeUp delay={80}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {label:'Squad',    val:total,           color:'white',    accent:'rgba(255,255,255,0.15)', icon:'👥'},
            {label:'Injured',  val:injured.length,  color:injured.length>0?'#f87171':'rgba(255,255,255,0.15)',  accent:injured.length>0?'#f87171':'rgba(255,255,255,0.08)', icon:'🏥'},
            {label:'Modified', val:modified.length, color:modified.length>0?'#fbbf24':'rgba(255,255,255,0.15)', accent:modified.length>0?'#fbbf24':'rgba(255,255,255,0.08)', icon:'⚡'},
            {label:'Teams',    val:cards.length,    color:sportColor, accent:sportColor, icon:'🏆'},
          ].map(s=>(
            <div key={s.label} className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background:'rgba(255,255,255,0.02)',
                border:'1px solid transparent',
                backgroundClip:'padding-box',
                boxShadow:`0 0 0 1px ${s.accent}30, 0 8px 32px ${s.accent}10, inset 0 1px 0 rgba(255,255,255,0.05)`,
              }}>
              <div className="absolute inset-x-0 top-0 h-px" style={{background:`linear-gradient(90deg,transparent,${s.accent}60,transparent)`}}/>
              <p className="text-[11px] mb-0.5" style={{color:s.accent === 'rgba(255,255,255,0.08)'?'rgba(255,255,255,0.2)':s.accent+'99'}}>{s.icon} {s.label}</p>
              <CountUp value={s.val} className="text-4xl font-black leading-none block tracking-tight" style={{color:s.color}}/>
            </div>
          ))}
        </div>
      </FadeUp>

      {/* ── ALERTS ── */}
      {unavail.length>0&&(
        <FadeUp delay={120}>
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
        </FadeUp>
      )}

      {lowAtt.length>0&&(
        <FadeUp delay={140}>
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
        </FadeUp>
      )}

      {/* ── QUICK ACTIONS ── */}
      <FadeUp delay={160}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{color:'rgba(255,255,255,0.2)'}}>Quick Actions</p>
        <StaggerList className="grid grid-cols-3 gap-3 sm:grid-cols-6" stagger={40}>
          {[
            {label:'Attendance',href:'/attendance',color:'#10b981',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>},
            {label:'Performance',href:'/performance',color:'#a78bfa',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
            {label:'Athletes',href:'/athletes',color:sportColor,
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>},
            {label:'Coaches',href:'/coaches',color:'#f59e0b',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>},
            {label:'Portal',href:'/portal-admin',color:'#f87171',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>},
            {label:'Export',href:'/export/attendance',color:'#94a3b8',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/></svg>},
          ].map((a)=>(
            <StaggerItem key={a.href}>
              <Link href={a.href}
                className="group relative flex flex-col items-center gap-2.5 rounded-2xl p-4 text-center block transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background:'rgba(255,255,255,0.02)',
                  boxShadow:'0 0 0 1px rgba(255,255,255,0.07)',
                }}>
                <div className="absolute inset-x-0 top-0 h-px rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{background:`linear-gradient(90deg,transparent,${a.color}60,transparent)`}}/>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl transition-all group-hover:scale-110"
                  style={{background:a.color+'15',color:a.color,boxShadow:'0 4px 12px '+a.color+'20'}}>
                  {a.icon}
                </div>
                <p className="text-[9px] font-bold uppercase tracking-[0.12em]"
                  style={{color:'rgba(255,255,255,0.35)'}}>
                  {a.label}
                </p>
              </Link>
            </StaggerItem>
          ))}
        </StaggerList>
      </FadeUp>

      {/* ── TEAM GRID ── */}
      <FadeUp delay={200}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{color:'rgba(255,255,255,0.2)'}}>All Teams</p>
        <StaggerList className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" stagger={25}>
          {cards.map(({team,count,rate,inj,mod,accent,dim,coach})=>(
            <StaggerItem key={team}>
              <HoverCard>
                <Link href={'/teams/'+encodeURIComponent(team)}
                  className="group relative overflow-hidden rounded-2xl block"
                  style={{
                    background:'rgba(255,255,255,0.015)',
                    boxShadow:'0 0 0 1px rgba(255,255,255,0.07), 0 4px 24px rgba(0,0,0,0.2)',
                  }}>
                  {/* Top accent line */}
                  <div className="absolute inset-x-0 top-0 h-[2px]"
                    style={{background:`linear-gradient(90deg,transparent,${accent}80,transparent)`}}/>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{background:`radial-gradient(ellipse at 50% -20%,${accent}10,transparent 70%)`}}/>
                  <div className="relative p-4">
                    {/* Team name + rate */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="text-2xl font-black tracking-tight leading-none" style={{color:accent}}>{team}</p>
                        <p className="text-[10px] mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{count} players{coach?' · '+coach:''}</p>
                      </div>
                      {rate!==null&&(
                        <div className="text-right">
                          <p className="text-2xl font-black leading-none" style={{color:rate>=80?'#10b981':rate>=60?'#fbbf24':'#f87171'}}>{rate}</p>
                          <p className="text-[8px] font-bold" style={{color:'rgba(255,255,255,0.2)'}}>% ATT</p>
                        </div>
                      )}
                    </div>
                    {/* Availability bar */}
                    <div className="h-1 rounded-full overflow-hidden mb-3" style={{background:'rgba(255,255,255,0.06)'}}>
                      <div className="h-full rounded-full" style={{
                        width: count>0?((count-inj-mod)/count*100)+'%':'100%',
                        background:'#10b981'
                      }}/>
                    </div>
                    {/* Status badges */}
                    <div className="flex gap-1.5 flex-wrap">
                      {inj>0&&<span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{background:'rgba(248,113,113,0.12)',color:'#fca5a5',border:'1px solid rgba(248,113,113,0.2)'}}>{inj} inj</span>}
                      {mod>0&&<span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{background:'rgba(251,191,36,0.12)',color:'#fde68a',border:'1px solid rgba(251,191,36,0.2)'}}>{mod} mod</span>}
                      {inj===0&&mod===0&&<span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{background:'rgba(16,185,129,0.1)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.2)'}}>✓ clear</span>}
                    </div>
                  </div>
                </Link>
              </HoverCard>
            </StaggerItem>
          ))}
        </StaggerList>
      </FadeUp>

      {/* ── ATTENDANCE TREND ── */}
      <FadeUp delay={240}>
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em]"
          style={{color:'rgba(255,255,255,0.2)'}}>Attendance Trend · Past 8 Weeks</p>
        <AttendanceTrendChart attendance={attendance} teams={visibleTeams} athletes={athletes} sport={sport}/>
      </FadeUp>

      {/* ── WIN / LOSS ── */}
      <WinLossChart sport={sport}/>

    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const {canSeeAllTeams,canSeeAllSports,teams:myTeams,loading:roleLoading,sport}=useRole();
  const SPORT_COLORS: Record<string,string> = {
    hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',
    rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4',
  };
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
  const [athletes,setAthletes] = React.useState<Row[]>([]);
  const [attendance,setAttendance] = React.useState<Row[]>([]);
  const [fixtures,setFixtures] = React.useState<Row[]>([]);
  const [coaches,setCoaches] = React.useState<Row[]>([]);
  const [loading,setLoading] = React.useState(true);

  async function load() {
    if(roleLoading)return;
    let q=supabase.from('athletes').select('id,full_name,team,availability,position,age_group,sport');
    if(!canSeeAllTeams&&myTeams.length>0) q=q.in('team',myTeams);
    // MIC/coach: filter by sport
    else if(sport) q=q.eq('sport',sport);
    const [aRes,attRes,fixRes,coachRes]=await Promise.all([
      q,
      supabase.from('attendance').select('id,athlete_id,status,session_date,session_type,sport')
        .eq('sport', sport || 'hockey')
        .gte('session_date',weekAgo())
        .order('session_date',{ascending:false})
        .limit(500),
      supabase.from('portal_fixtures').select('*')
        .eq('sport', sport || 'hockey')
        .order('fixture_date').limit(20),
      (() => { let sr = supabase.from('staff_roles').select('email,teams,role,full_name,sport').eq('is_active',true); if(sport && !canSeeAllSports) sr = sr.eq('sport',sport); return sr; })(),
    ]);
    setAthletes(aRes.data||[]);setAttendance(attRes.data||[]);
    setFixtures(fixRes.data||[]);setCoaches(coachRes.data||[]);
    setLoading(false);
  }

  React.useEffect(()=>{load();},[roleLoading,canSeeAllTeams,myTeams.join(','),sport]);

  if(roleLoading||loading)return(
    <main className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-8 h-8">
          <div className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{borderColor:`${sportColor}26`,borderTopColor:sportColor}}/>
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
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
            sport={sport}
          />
        )}
      </div>
    </main>
  );
}
