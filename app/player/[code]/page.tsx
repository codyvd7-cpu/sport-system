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
const TIER_CONFIG = [
  { label:'Outstanding', hex:'#10b981', bg:'rgba(16,185,129,0.12)',  border:'rgba(16,185,129,0.3)'  },
  { label:'Strong',      hex:'#38bdf8', bg:'rgba(56,189,248,0.12)',  border:'rgba(56,189,248,0.3)'  },
  { label:'On Track',    hex:'#a78bfa', bg:'rgba(167,139,250,0.12)', border:'rgba(167,139,250,0.3)' },
  { label:'Developing',  hex:'#fbbf24', bg:'rgba(251,191,36,0.12)',  border:'rgba(251,191,36,0.3)'  },
  { label:'Needs Work',  hex:'#94a3b8', bg:'rgba(148,163,184,0.10)', border:'rgba(148,163,184,0.25)'},
];

function getTier(test: string, val: number, ag: string) {
  const b = BENCHMARKS[test]; if (!b) return null;
  const lower = LOWER_IS_BETTER.some(t => test.toLowerCase().includes(t.toLowerCase()));
  const t = ag.includes('14')||ag.includes('15') ? b.u1415 : b.u1618;
  if (lower) { if(val<t[0])return TIER_CONFIG[0];if(val<t[1])return TIER_CONFIG[1];if(val<t[2])return TIER_CONFIG[2];if(val<t[3])return TIER_CONFIG[3];return TIER_CONFIG[4]; }
  else { if(val>t[0])return TIER_CONFIG[0];if(val>t[1])return TIER_CONFIG[1];if(val>t[2])return TIER_CONFIG[2];if(val>t[3])return TIER_CONFIG[3];return TIER_CONFIG[4]; }
}
function initials(n:string) { return (n||'?').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase(); }
function fDate(d?:string|null) { if(!d) return '—'; const dt=new Date(d); return Number.isNaN(dt.getTime())?'—':dt.toLocaleDateString('en-ZA',{day:'numeric',month:'short',year:'numeric'}); }

function AttRing({rate}:{rate:number|null}) {
  const r=40,circ=2*Math.PI*r,pct=rate??0,dash=(pct/100)*circ;
  const color=pct>=80?'#10b981':pct>=60?'#f59e0b':'#ef4444';
  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg viewBox="0 0 88 88" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#1e293b" strokeWidth="6"/>
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div className="text-center">
        {rate !== null ? (
          <>
            <p className="text-2xl font-black text-white leading-none">{rate}%</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Att.</p>
          </>
        ) : (
          <>
            <p className="text-xl font-black text-slate-600">—</p>
            <p className="text-[9px] text-slate-700 uppercase tracking-wider mt-0.5">Att.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Spark({vals,lower}:{vals:number[];lower:boolean}) {
  if(vals.length<2) return null;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=72,H=28;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*H}`).join(' ');
  const improved=lower?vals[vals.length-1]<vals[0]:vals[vals.length-1]>vals[0];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} className="w-[72px] h-7">
      <polyline points={pts} fill="none" stroke={improved?'#10b981':'#ef4444'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function PlayerProfilePage({params}:PageProps) {
  const {code} = React.use(params);
  const [athlete,setAthlete] = React.useState<Row|null>(null);
  const [attendance,setAttendance] = React.useState<Row[]>([]);
  const [performance,setPerformance] = React.useState<Row[]>([]);
  const [feedback,setFeedback] = React.useState<Row|null>(null);
  const [coachName,setCoachName] = React.useState('');
  const [loading,setLoading] = React.useState(true);
  const [notFound,setNotFound] = React.useState(false);

  React.useEffect(()=>{
    async function load() {
      try {
        const res = await fetch(`/api/player/profile?code=${encodeURIComponent(code)}`);
        if(!res.ok){setNotFound(true);setLoading(false);return;}
        const data = await res.json();
        setAthlete(data.athlete);
        setAttendance(data.attendance||[]);
        setPerformance(data.performance||[]);
        setFeedback(data.feedback||null);
        setCoachName(data.coachName||'');
      } catch { setNotFound(true); }
      setLoading(false);
    }
    load();
  },[code]);

  const name = athlete?.full_name || athlete?.name || 'Athlete';
  const team = athlete?.team||'';
  const ageGroup = athlete?.age_group||'';
  const position = athlete?.position||'';
  const avail = athlete?.availability||'Available';

  const present = attendance.filter(a=>['present','late'].includes(a.status?.toLowerCase()||'')).length;
  const absent  = attendance.filter(a=>a.status?.toLowerCase()==='absent').length;
  const attRate = attendance.length>0 ? Math.round((present/attendance.length)*100) : null;

  // Personal bests + trends
  const pbMap = React.useMemo(()=>{
    const m=new Map<string,{vals:number[];unit:string}>();
    performance.forEach(p=>{
      if(p.value===null||p.value===undefined) return;
      if(!m.has(p.test_type)) m.set(p.test_type,{vals:[],unit:p.unit||''});
      m.get(p.test_type)!.vals.push(p.value);
    });
    return m;
  },[performance]);

  const pbs = React.useMemo(()=>{
    const result: {test:string;pb:number;unit:string;vals:number[];tier:typeof TIER_CONFIG[0]|null;lower:boolean}[]=[];
    pbMap.forEach(({vals,unit},test)=>{
      const lower=LOWER_IS_BETTER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
      const pb=lower?Math.min(...vals):Math.max(...vals);
      const tier=getTier(test,pb,ageGroup);
      result.push({test,pb,unit,vals,tier,lower});
    });
    return result;
  },[pbMap,ageGroup]);

  const availColor = avail==='Available'?'#10b981':avail==='Injured'?'#f87171':avail==='Modified'?'#fbbf24':'#38bdf8';
  const hasData = attendance.length>0 || performance.length>0 || feedback;

  if(loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#060812]">
      <div className="text-center">
        <div className="relative mx-auto mb-4 h-10 w-10">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-sky-500"/>
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-b-violet-500/30" style={{animationDuration:'1.5s',animationDirection:'reverse'}}/>
        </div>
        <p className="text-sm text-slate-500">Loading your profile…</p>
      </div>
    </main>
  );

  if(notFound) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#060812] px-4 text-white">
      <div className="text-center">
        <p className="text-5xl mb-4">🔍</p>
        <p className="text-xl font-black text-white">Code not found</p>
        <p className="mt-2 text-sm text-slate-500">Check your code and try again.</p>
        <Link href="/player" className="mt-6 inline-block rounded-2xl border border-sky-500/40 bg-sky-500/15 px-6 py-3 text-sm font-black text-sky-300">Try Again</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#060812] text-white">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden" style={{background:'linear-gradient(180deg,rgba(14,20,50,0.95) 0%,#060812 100%)'}}>
        <div className="absolute inset-0" style={{background:'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(56,189,248,0.08), transparent)'}}/>

        <div className="relative mx-auto max-w-2xl px-5 pt-8 pb-6 sm:px-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-400">St Benedict's College</p>
              <p className="text-[9px] text-slate-600 tracking-widest uppercase mt-0.5">Hockey</p>
            </div>
            <Link href="/portal" className="rounded-xl border border-white/8 bg-white/4 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition">
              Portal →
            </Link>
          </div>

          {/* Player card */}
          <div className="flex items-start gap-5">
            <div className="flex-1 min-w-0">
              {/* Avatar + name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative shrink-0">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-black"
                    style={{background:'rgba(56,189,248,0.12)',color:'#38bdf8',border:'1px solid rgba(56,189,248,0.2)'}}>
                    {initials(name)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-[#060812]"
                    style={{background:availColor}}/>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-600">Player Profile</p>
                  <h1 className="text-2xl font-black text-white leading-tight mt-0.5">{name}</h1>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {team&&<span className="rounded-full px-2.5 py-0.5 text-[10px] font-black" style={{background:'rgba(56,189,248,0.12)',color:'#38bdf8',border:'1px solid rgba(56,189,248,0.2)'}}>{team}</span>}
                    {ageGroup&&<span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-slate-400" style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.08)'}}>{ageGroup}</span>}
                    {position&&<span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{background:'rgba(167,139,250,0.12)',color:'#a78bfa',border:'1px solid rgba(167,139,250,0.2)'}}>{position}</span>}
                    <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black" style={{background:`${availColor}18`,color:availColor,border:`1px solid ${availColor}40`}}>{avail}</span>
                  </div>
                </div>
              </div>

              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {label:'Sessions',val:attendance.length,color:'#fff'},
                  {label:'Present',val:present,color:'#10b981'},
                  {label:'Absent',val:absent,color:absent>3?'#f87171':'#334155'},
                ].map(s=>(
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                    <p className="text-xl font-black" style={{color:s.color}}>{s.val}</p>
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-600 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Coach */}
              {coachName&&(
                <p className="mt-3 text-[11px] text-slate-600">
                  <span className="text-slate-700">Coach · </span>
                  <span className="text-slate-400 font-semibold">{coachName}</span>
                </p>
              )}
            </div>

            {/* Attendance ring */}
            <div className="shrink-0">
              <AttRing rate={attRate}/>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8 space-y-5">

        {/* ── EMPTY STATE — looks premium, not dead ── */}
        {!hasData&&(
          <div className="rounded-2xl border border-white/5 p-8 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl" style={{background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.15)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.5} className="h-7 w-7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <p className="text-lg font-black text-white mb-2">Your season profile is building</p>
            <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
              As your coach logs attendance and test data, your performance profile will come to life here.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                {label:'Attendance',sub:'Every session tracked',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,color:'#10b981'},
                {label:'Testing',sub:'Benchmark scores',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,color:'#a78bfa'},
                {label:'Progress',sub:'Trends over time',icon:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/></svg>,color:'#f59e0b'},
              ].map(item=>(
                <div key={item.label} className="rounded-xl p-3 text-center" style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg" style={{background:`${item.color}12`,color:item.color}}>
                    {item.icon}
                  </div>
                  <p className="text-[11px] font-black text-white">{item.label}</p>
                  <p className="text-[9px] text-slate-600 mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── COACH FEEDBACK ── */}
        {feedback&&(
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="px-5 py-4 border-b border-white/5" style={{background:'rgba(56,189,248,0.04)'}}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-400">From Your Coach</p>
              <p className="text-base font-black text-white mt-0.5">Latest Feedback</p>
            </div>
            <div className="p-5 space-y-3">
              {feedback.strengths&&(
                <div className="rounded-xl p-4" style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)'}}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400 mb-2">Strengths</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{feedback.strengths}</p>
                </div>
              )}
              {feedback.current_focus&&(
                <div className="rounded-xl p-4" style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.15)'}}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-400 mb-2">Focus Area</p>
                  <p className="text-sm text-slate-200 leading-relaxed">{feedback.current_focus}</p>
                </div>
              )}
              {feedback.coach_comment&&(
                <div className="rounded-xl p-4" style={{background:'rgba(56,189,248,0.05)',border:'1px solid rgba(56,189,248,0.12)'}}>
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-sky-400 mb-2">Comment</p>
                  <p className="text-sm text-slate-200 leading-relaxed italic">"{feedback.coach_comment}"</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── PERSONAL BESTS ── */}
        {pbs.length>0&&(
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="px-5 py-4 border-b border-white/5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">My Records</p>
              <p className="text-base font-black text-white mt-0.5">Personal Bests</p>
            </div>
            <div className="p-4 grid gap-3 sm:grid-cols-2">
              {pbs.map(pb=>{
                const improved = pb.lower ? pb.vals[pb.vals.length-1]<pb.vals[0] : pb.vals[pb.vals.length-1]>pb.vals[0];
                return(
                  <div key={pb.test} className="rounded-xl p-4" style={{
                    background: pb.tier ? pb.tier.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${pb.tier ? pb.tier.border : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">{pb.test}</p>
                      {pb.tier&&<span className="rounded-full px-2 py-0.5 text-[9px] font-black" style={{background:pb.tier.bg,color:pb.tier.hex,border:`1px solid ${pb.tier.border}`}}>{pb.tier.label}</span>}
                    </div>
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-3xl font-black text-white leading-none">{pb.pb}<span className="text-base text-slate-500 ml-1">{pb.unit}</span></p>
                        {pb.vals.length>1&&(
                          <p className="text-[11px] mt-1 font-semibold" style={{color:improved?'#10b981':'#f87171'}}>
                            {improved?'↑ Improving':'↓ Declining'}
                          </p>
                        )}
                      </div>
                      <Spark vals={pb.vals} lower={pb.lower}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ATTENDANCE ── */}
        {attendance.length>0&&(
          <div className="rounded-2xl border border-white/5 overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Commitment</p>
                <p className="text-base font-black text-white mt-0.5">Attendance</p>
              </div>
              {attRate!==null&&(
                <span className="text-2xl font-black" style={{color:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171'}}>
                  {attRate}%
                </span>
              )}
            </div>
            {attRate!==null&&(
              <div className="px-5 py-3 border-b border-white/5">
                <div className="h-2 w-full overflow-hidden rounded-full" style={{background:'rgba(255,255,255,0.06)'}}>
                  <div className="h-full rounded-full transition-all" style={{
                    width:`${attRate}%`,
                    background:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171',
                  }}/>
                </div>
              </div>
            )}
            <div className="divide-y divide-white/3 max-h-64 overflow-y-auto">
              {attendance.slice(0,15).map((r,i)=>{
                const s=r.status?.toLowerCase()||'';
                const c=s==='present'?{bg:'rgba(16,185,129,0.1)',color:'#6ee7b7',border:'rgba(16,185,129,0.2)'}
                  :s==='late'?{bg:'rgba(251,191,36,0.1)',color:'#fde68a',border:'rgba(251,191,36,0.2)'}
                  :s==='absent'?{bg:'rgba(248,113,113,0.1)',color:'#fca5a5',border:'rgba(248,113,113,0.2)'}
                  :{bg:'rgba(56,189,248,0.1)',color:'#7dd3fc',border:'rgba(56,189,248,0.2)'};
                return(
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black"
                      style={{background:c.bg,color:c.color,border:`1px solid ${c.border}`}}>
                      {r.status}
                    </span>
                    <p className="flex-1 text-sm text-slate-300">{r.session_type||'—'}</p>
                    <p className="text-[11px] text-slate-600 shrink-0">{fDate(r.session_date)}</p>
                  </div>
                );
              })}
              {attendance.length>15&&(
                <p className="px-5 py-3 text-center text-[11px] text-slate-600">+{attendance.length-15} more sessions</p>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="py-4 text-center space-y-2">
          <p className="text-[10px] text-slate-700 font-semibold uppercase tracking-widest">St Benedict's College · Hockey</p>
          <Link href="/player" className="text-[11px] text-slate-600 hover:text-slate-400 transition">← Back to code entry</Link>
        </div>
      </div>
    </main>
  );
}