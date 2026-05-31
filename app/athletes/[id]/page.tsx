'use client';

import Link from 'next/link';
import * as React from 'react';
import { useToast } from '@/components/Toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeUUID, generatePlayerCode } from '@/lib/uuid';
import { AthletePDFButton } from '@/components/PDFButton';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip,
} from 'recharts';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

// ── Utilities ─────────────────────────────────────────────────
function fStr(...v: any[]) { for (const x of v) if (typeof x==='string'&&x.trim()) return x.trim(); return ''; }
function fVal(...v: any[]) { for (const x of v) if (x!==null&&x!==undefined&&x!=='') return String(x); return ''; }
function fNum(...v: any[]) { for (const x of v) { if (x===null||x===undefined||x==='') continue; const n=Number(x); if (!Number.isNaN(n)) return n; } return null; }
function fDate(d?: string|null) { if (!d) return '—'; const dt=new Date(d); if (Number.isNaN(dt.getTime())) return '—'; return dt.toLocaleDateString('en-ZA',{day:'2-digit',month:'short',year:'numeric'}); }
function initials(name: string) { return name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase(); }

const STATUS_STYLES: Record<string,string> = {
  present: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  late:    'bg-amber-500/15 text-amber-300 border-amber-500/20',
  absent:  'bg-red-500/15 text-red-300 border-red-500/20',
  excused: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
};
const AVAIL_STYLES: Record<string,{label:string;color:string;bg:string;border:string}> = {
  'Available': { label:'Available', color:'text-emerald-300', bg:'bg-emerald-500/15', border:'border-emerald-500/30' },
  'Modified':  { label:'Modified',  color:'text-amber-300',   bg:'bg-amber-500/15',   border:'border-amber-500/30'   },
  'Injured':   { label:'Injured',   color:'text-red-300',     bg:'bg-red-500/15',     border:'border-red-500/30'     },
  'Resting':   { label:'Resting',   color:'text-sky-300',     bg:'bg-sky-500/15',     border:'border-sky-500/30'     },
};
const LOWER = ['Sprint','505','Bronco','RSA'];
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
const TIERS = [
  {label:'Outstanding',color:'#10b981',bg:'rgba(16,185,129,0.12)',border:'rgba(16,185,129,0.3)'},
  {label:'Strong',     color:'#38bdf8',bg:'rgba(56,189,248,0.12)',border:'rgba(56,189,248,0.3)'},
  {label:'On Track',   color:'#a78bfa',bg:'rgba(167,139,250,0.12)',border:'rgba(167,139,250,0.3)'},
  {label:'Developing', color:'#fbbf24',bg:'rgba(251,191,36,0.12)',border:'rgba(251,191,36,0.3)'},
  {label:'Needs Work', color:'#94a3b8',bg:'rgba(148,163,184,0.10)',border:'rgba(148,163,184,0.25)'},
];
function getTier(key:string,val:number,ag:string) {
  const b=BENCHMARKS[key]; if(!b) return null;
  const lower=LOWER.some(t=>key.toLowerCase().includes(t.toLowerCase()));
  const t=ag.includes('14')||ag.includes('15')?b.u1415:b.u1618;
  if(lower){if(val<t[0])return TIERS[0];if(val<t[1])return TIERS[1];if(val<t[2])return TIERS[2];if(val<t[3])return TIERS[3];return TIERS[4];}
  else{if(val>t[0])return TIERS[0];if(val>t[1])return TIERS[1];if(val>t[2])return TIERS[2];if(val>t[3])return TIERS[3];return TIERS[4];}
}

// ── Attendance ring ──────────────────────────────────────────
function AttRing({rate}:{rate:number|null}) {
  const r=36,circ=2*Math.PI*r,pct=rate??0,dash=(pct/100)*circ;
  const col=pct>=80?'#10b981':pct>=60?'#f59e0b':'#ef4444';
  return(
    <div className="relative flex h-20 w-20 items-center justify-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="#1e293b" strokeWidth="6"/>
        <circle cx="40" cy="40" r={r} fill="none" stroke={col} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div className="text-center">
        <p className="text-base font-black text-white leading-none">{rate!==null?`${rate}%`:'—'}</p>
        <p className="text-[8px] text-white/35 uppercase tracking-wide mt-0.5">Att.</p>
      </div>
    </div>
  );
}

// ── Sparkline ────────────────────────────────────────────────
function Spark({vals,lower}:{vals:number[];lower:boolean}) {
  if(vals.length<2) return <span className="text-[10px] text-white/15">—</span>;
  const mn=Math.min(...vals),mx=Math.max(...vals),rng=mx-mn||1;
  const W=56,H=24;
  const pts=vals.map((v,i)=>`${(i/(vals.length-1))*W},${H-((v-mn)/rng)*H}`).join(' ');
  const improved=lower?vals[vals.length-1]<vals[0]:vals[vals.length-1]>vals[0];
  return(
    <svg viewBox={`0 0 ${W} ${H}`} className="w-14 h-6">
      <polyline points={pts} fill="none" stroke={improved?'#10b981':'#ef4444'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Main ─────────────────────────────────────────────────────
// ── ATHLETE RADAR CHART ───────────────────────────────────────
function AthleteRadarChart({pbs}:{pbs:{test:string;pb:number;unit:string;tier:any;vals:number[]}[]}) {
  // Normalise each PB to 0-100 scale based on tier benchmarks
  const data = pbs.slice(0,8).map(p => {
    // Simple normalisation: use pb value as % of max observed
    const max = Math.max(...p.vals, p.pb);
    const min = Math.min(...p.vals, p.pb);
    const range = max - min || 1;
    const score = Math.round(((p.pb - min) / range) * 60 + 40); // 40-100 range
    const label = p.test.split(' ').slice(-1)[0].slice(0,6); // short label
    return { test: label, score };
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data} margin={{top:10,right:20,bottom:10,left:20}}>
        <PolarGrid stroke="rgba(255,255,255,0.08)" radialLines={false}/>
        <PolarAngleAxis dataKey="test" tick={{fill:'rgba(255,255,255,0.4)',fontSize:9}} tickLine={false}/>
        <Radar dataKey="score" stroke="#a78bfa" fill="#a78bfa" fillOpacity={0.15} strokeWidth={1.5}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ── ATHLETE PROGRESS CHART ────────────────────────────────────
function AthleteProgressChart({pbs}:{pbs:{test:string;pb:number;unit:string;tier:any;vals:number[]}[]}) {
  const [selected, setSelected] = React.useState(0);
  const p = pbs.filter(x => x.vals.length > 1)[selected] || pbs.find(x => x.vals.length > 1);
  if (!p) return null;

  const data = p.vals.map((v,i) => ({session:`S${i+1}`,value:v}));

  return (
    <div>
      {/* Test selector */}
      <div className="flex flex-wrap gap-1 mb-3">
        {pbs.filter(x=>x.vals.length>1).map((x,i) => (
          <button key={x.test} onClick={()=>setSelected(i)}
            className="rounded-lg px-2 py-1 text-[9px] font-bold transition"
            style={{
              background: i===selected ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.04)',
              color: i===selected ? '#a78bfa' : 'rgba(255,255,255,0.3)',
              border: `1px solid ${i===selected ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}>
            {x.test.split(' ').slice(-1)[0]}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={130}>
        <LineChart data={data} margin={{top:5,right:5,bottom:0,left:-25}}>
          <XAxis dataKey="session" tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:'rgba(255,255,255,0.25)',fontSize:9}} axisLine={false} tickLine={false}/>
          <Tooltip
            contentStyle={{background:'rgba(10,15,30,0.95)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,fontSize:11}}
            labelStyle={{color:'rgba(255,255,255,0.4)'}}
            itemStyle={{color:'#a78bfa'}}
            formatter={(v:any) => [`${v} ${p.unit}`, p.test]}
          />
          <Line type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} dot={{fill:'#a78bfa',r:3}} activeDot={{r:5}}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AthleteProfile({params}:PageProps) {
  const {id} = React.use(params);
  const router = useRouter();
  const {showToast} = useToast();

  const [rawAthlete, setRawAthlete] = React.useState<Row|null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [performance, setPerformance] = React.useState<Row[]>([]);
  const [notes, setNotes] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'overview'|'attendance'|'performance'|'notes'>('overview');

  // Edit states
  const [editingInfo, setEditingInfo] = React.useState(false);
  const [editName, setEditName] = React.useState('');
  const [editTeam, setEditTeam] = React.useState('');
  const [editAge, setEditAge] = React.useState('');
  const [editPos, setEditPos] = React.useState('');
  const [savingInfo, setSavingInfo] = React.useState(false);

  // Quick add attendance
  const [attDate, setAttDate] = React.useState(()=>new Date().toISOString().split('T')[0]);
  const [attType, setAttType] = React.useState('Training');
  const [attStatus, setAttStatus] = React.useState('Present');
  const [savingAtt, setSavingAtt] = React.useState(false);

  // Quick add performance
  const [perfDate, setPerfDate] = React.useState(()=>new Date().toISOString().split('T')[0]);
  const [perfTest, setPerfTest] = React.useState('');
  const [perfVal, setPerfVal] = React.useState('');
  const [perfUnit, setPerfUnit] = React.useState('');
  const [savingPerf, setSavingPerf] = React.useState(false);

  // Notes
  const [newNote, setNewNote] = React.useState('');
  const [savingNote, setSavingNote] = React.useState(false);

  // Feedback
  const [editFb, setEditFb] = React.useState(false);
  const [fbStr, setFbStr] = React.useState('');
  const [fbFoc, setFbFoc] = React.useState('');
  const [fbCom, setFbCom] = React.useState('');
  const [savingFb, setSavingFb] = React.useState(false);

  // AI
  const [aiText, setAiText] = React.useState('');
  const [genAI, setGenAI] = React.useState(false);

  // Availability
  const [availability, setAvailability] = React.useState('Available');

  // Player code
  const [genCode, setGenCode] = React.useState(false);

  async function load() {
    setLoading(true);
    const [aRes,attRes,perfRes,nRes] = await Promise.all([
      supabase.from('athletes').select('*').eq('id',id).single(),
      supabase.from('attendance').select('*').eq('athlete_id',id).order('session_date',{ascending:false}).limit(100),
      supabase.from('performance_tests').select('*').eq('athlete_id',id).order('test_date',{ascending:false}).limit(100),
      supabase.from('coach_notes').select('*').eq('athlete_id',id).order('created_at',{ascending:false}),
    ]);
    if(aRes.data){
      setRawAthlete(aRes.data);
      setAvailability(aRes.data.availability||'Available');
      setEditName(fStr(aRes.data.full_name,aRes.data.name));
      setEditTeam(fStr(aRes.data.team));
      setEditAge(fStr(aRes.data.age_group));
      setEditPos(fStr(aRes.data.position));
    }
    setAttendance(attRes.data||[]);
    setPerformance(perfRes.data||[]);
    setNotes(nRes.data||[]);
    setLoading(false);
  }

  React.useEffect(()=>{ load(); },[id]);

  if(loading) return(
    <main className="flex min-h-screen items-center justify-center bg-[#04060e]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"/>
    </main>
  );
  if(!rawAthlete) return(
    <main className="flex min-h-screen items-center justify-center bg-[#04060e] text-white">
      <div className="text-center">
        <p className="text-white/50 mb-3">Athlete not found</p>
        <Link href="/athletes" className="text-sky-400 text-sm">← Back to Athletes</Link>
      </div>
    </main>
  );

  const name = fStr(rawAthlete.full_name,rawAthlete.name)||'Unknown';
  const team = fStr(rawAthlete.team)||'Unassigned';
  const ageGroup = fStr(rawAthlete.age_group)||'—';
  const position = fStr(rawAthlete.position)||'—';
  const playerCode = fStr(rawAthlete.player_code);

  const present = attendance.filter(a=>['present','late'].includes(a.status?.toLowerCase()||'')).length;
  const absent  = attendance.filter(a=>a.status?.toLowerCase()==='absent').length;
  const excused = attendance.filter(a=>a.status?.toLowerCase()==='excused').length;
  const attRate = attendance.length>0?Math.round((present/attendance.length)*100):null;

  // Performance PBs and trends
  const grouped = new Map<string,Row[]>();
  performance.forEach(p=>{ if(!grouped.has(p.test_type)) grouped.set(p.test_type,[]); grouped.get(p.test_type)!.push(p); });
  const pbs: {test:string;pb:number;unit:string;tier:typeof TIERS[0]|null;vals:number[]}[] = [];
  grouped.forEach((entries,test)=>{
    const valid=entries.filter(e=>e.value!==null).sort((a,b)=>new Date(a.test_date).getTime()-new Date(b.test_date).getTime());
    if(!valid.length) return;
    const lower=LOWER.some(t=>test.toLowerCase().includes(t.toLowerCase()));
    const pb=lower?Math.min(...valid.map(e=>e.value)):Math.max(...valid.map(e=>e.value));
    const unit=valid[0]?.unit||'';
    const tier=getTier(test,pb,ageGroup);
    const vals=valid.map(e=>e.value as number);
    pbs.push({test,pb,unit,tier,vals});
  });

  const latestFeedback = notes.find(n=>n.is_feedback)||null;
  const coachNotes = notes.filter(n=>!n.is_feedback);
  const availStyle = AVAIL_STYLES[availability]||AVAIL_STYLES['Available'];

  async function saveInfo() {
    setSavingInfo(true);
    await supabase.from('athletes').update({full_name:editName,team:editTeam,age_group:editAge,position:editPos}).eq('id',id);
    setEditingInfo(false); showToast('Profile updated'); await load(); setSavingInfo(false);
  }

  async function setAvail(status:string) {
    await supabase.from('athletes').update({availability:status}).eq('id',id);
    setAvailability(status); showToast(`Status: ${status}`);
  }

  async function addAttendance(e:React.FormEvent) {
    e.preventDefault(); setSavingAtt(true);
    await supabase.from('attendance').insert([{athlete_id:id,session_date:attDate,session_type:attType,status:attStatus}]);
    showToast('Session added'); await load(); setSavingAtt(false);
  }

  async function addPerformance(e:React.FormEvent) {
    e.preventDefault();
    const num=Number(perfVal); if(Number.isNaN(num)){showToast('Result must be a number','error');return;}
    setSavingPerf(true);
    await supabase.from('performance_tests').upsert([{athlete_id:id,test_date:perfDate,test_type:perfTest.trim(),value:num,unit:perfUnit.trim()}],{onConflict:'athlete_id,test_date,test_type'});
    showToast('Result saved'); setPerfTest(''); setPerfVal(''); setPerfUnit(''); await load(); setSavingPerf(false);
  }

  async function addNote(e:React.FormEvent) {
    e.preventDefault(); if(!newNote.trim()) return;
    setSavingNote(true);
    const {data:{session}} = await supabase.auth.getSession();
    await supabase.from('coach_notes').insert([{athlete_id:id,note:newNote.trim(),author_email:session?.user?.email||'',is_feedback:false}]);
    setNewNote(''); showToast('Note saved'); await load(); setSavingNote(false);
  }

  async function saveFeedback() {
    setSavingFb(true);
    if(latestFeedback) await supabase.from('coach_notes').delete().eq('id',latestFeedback.id);
    await supabase.from('coach_notes').insert([{athlete_id:id,strengths:fbStr,current_focus:fbFoc,coach_comment:fbCom,is_feedback:true,author_email:''}]);
    setEditFb(false); showToast('Feedback saved'); await load(); setSavingFb(false);
  }

  async function generateCode() {
    setGenCode(true);
    let code=''; let tries=0;
    while(tries<8){ code=generatePlayerCode(); const {data:ex}=await supabase.from('athletes').select('id').eq('player_code',code).maybeSingle(); if(!ex) break; tries++; }
    if(tries>=8){showToast('Could not generate unique code','error');setGenCode(false);return;}
    await supabase.from('athletes').update({player_code:code}).eq('id',id);
    showToast(`Code: ${code}`); await load(); setGenCode(false);
  }

  async function generateAI() {
    setGenAI(true); setAiText('');
    const firstName=name.split(' ')[0];
    const perfLines=pbs.map(p=>`${p.test}: ${p.pb}${p.unit}${p.tier?` (${p.tier.label})`:''}`).join(', ')||'No data';
    const prompt=`You are a high-performance hockey coach at St Benedict's College. Write a professional 3-4 sentence athlete summary for coach use.\n\nFirst name: ${firstName}\nTeam: ${team} | Age group: ${ageGroup} | Position: ${position}\nAvailability: ${availability}\nAttendance: ${attRate!==null?`${attRate}%`:'No data'} (${present} present, ${absent} absent of ${attendance.length} sessions)\nPersonal bests: ${perfLines}\n\nBe specific, constructive, professional. No medical claims.`;
    try {
      const res=await fetch('/api/athlete-summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({athlete:{name:firstName,team,ageGroup,position,availability,attendanceRate:attRate,totalSessions:attendance.length,absences:absent,pbs:pbs.map(p=>({testType:p.test,pb:p.pb,unit:p.unit})),tiers:pbs.filter(p=>p.tier).map(p=>({test:p.test,tier:p.tier!.label})),prompt}})});
      const d=await res.json();
      setAiText(d.text||'Could not generate.');
    } catch{ setAiText('Failed. Please try again.'); }
    setGenAI(false);
  }

  const TABS = [
    {key:'overview',    label:'Overview'},
    {key:'attendance',  label:`Attendance ${attendance.length>0?`(${attendance.length})`:''}` },
    {key:'performance', label:`Performance ${pbs.length>0?`(${pbs.length})`:''}`},
    {key:'notes',       label:`Notes ${coachNotes.length>0?`(${coachNotes.length})`:''}`},
  ] as const;

  return(
    <main className="min-h-screen pb-24 text-white md:pb-0 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Back */}
        <Link href="/athletes" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-white/30 hover:text-white/60 transition">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Athletes
        </Link>

        {/* ── PROFILE HEADER ── */}
        <div className="mb-5 rounded-3xl overflow-hidden relative" style={{
          background:'linear-gradient(135deg,rgba(56,189,248,0.07) 0%,rgba(255,255,255,0.015) 100%)',
          border:'1px solid rgba(255,255,255,0.07)',
        }}>
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{background:'linear-gradient(90deg,transparent,rgba(56,189,248,0.6),rgba(167,139,250,0.4),transparent)'}}/>
          {/* Glow */}
          <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full blur-[50px] pointer-events-none"
            style={{background:'rgba(56,189,248,0.12)'}}/>

          {/* Top banner */}
          <div className="relative px-5 pt-5 pb-4 flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-sky-300"
              style={{background:'linear-gradient(135deg,rgba(56,189,248,0.2),rgba(167,139,250,0.15))',border:'1px solid rgba(56,189,248,0.2)'}}>
              {initials(name)}
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              {editingInfo ? (
                <div className="space-y-2">
                  <input value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Full name"
                    className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2 text-sm text-white outline-none focus:border-sky-500"/>
                  <div className="grid grid-cols-3 gap-2">
                    <input value={editTeam} onChange={e=>setEditTeam(e.target.value)} placeholder="Team"
                      className="rounded-xl border border-white/8 bg-[#04060e] px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"/>
                    <input value={editAge} onChange={e=>setEditAge(e.target.value)} placeholder="Age group"
                      className="rounded-xl border border-white/8 bg-[#04060e] px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"/>
                    <input value={editPos} onChange={e=>setEditPos(e.target.value)} placeholder="Position"
                      className="rounded-xl border border-white/8 bg-[#04060e] px-2.5 py-1.5 text-xs text-white outline-none focus:border-sky-500"/>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveInfo} disabled={savingInfo}
                      className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
                      {savingInfo?'Saving…':'Save'}
                    </button>
                    <button onClick={()=>setEditingInfo(false)}
                      className="rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-xs font-black text-white/50 hover:text-white transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-white leading-tight">{name}</h1>
                    <button onClick={()=>setEditingInfo(true)}
                      className="mt-1 rounded-lg border border-white/8 bg-white/5 px-2 py-0.5 text-[10px] font-black text-white/35 hover:text-white transition">
                      Edit
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/65">{team}</span>
                    {ageGroup!=='—'&&<span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/65">{ageGroup}</span>}
                    {position!=='—'&&<span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-white/65">{position}</span>}
                  </div>
                </>
              )}
            </div>
            {/* Attendance ring */}
            <div className="shrink-0">
              <AttRing rate={attRate}/>
            </div>
          </div>

          {/* Availability strip */}
          <div className="border-t border-white/7 px-5 py-3 flex items-center gap-2 flex-wrap">
            <p className="text-[10px] font-black uppercase tracking-wide text-white/25 mr-1">Status:</p>
            {Object.entries(AVAIL_STYLES).map(([key,s])=>(
              <button key={key} onClick={()=>setAvail(key)}
                className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition ${availability===key?`${s.bg} ${s.border} ${s.color}`:'border-white/7 bg-[#04060e] text-white/25 hover:text-white/50'}`}>
                {s.label}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <AthletePDFButton athleteId={id} name={name}/>
              {playerCode && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-xl border px-3 py-1.5 text-[11px] font-black font-mono"
                    style={{borderColor:'rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)'}}>
                    {playerCode}
                  </span>
                  <button onClick={() => navigator.clipboard.writeText(playerCode)}
                    className="rounded-xl border px-2 py-1.5 text-[10px] font-semibold transition hover:text-white"
                    style={{borderColor:'rgba(255,255,255,0.07)',background:'rgba(255,255,255,0.03)',color:'rgba(255,255,255,0.3)'}}>
                    Copy
                  </button>
                </div>
              )}
              <button onClick={generateCode} disabled={genCode}
                className="rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 hover:text-white"
                style={{
                  borderColor: playerCode ? 'rgba(251,191,36,0.25)' : 'rgba(56,189,248,0.25)',
                  background:  playerCode ? 'rgba(251,191,36,0.06)' : 'rgba(56,189,248,0.06)',
                  color:       playerCode ? '#fde68a' : '#7dd3fc',
                }}>
                {genCode ? '…' : playerCode ? '↻ Regen' : '+ Gen Code'}
              </button>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mb-6 flex gap-1 rounded-2xl border border-white/5 p-1">
          {TABS.map(t=>(
            <button key={t.key} onClick={()=>setActiveTab(t.key)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-black transition ${activeTab===t.key?'bg-white/8 text-white':'text-white/35 hover:text-white/65'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {activeTab==='overview'&&(
          <div className="space-y-5">
            {/* Stats strip */}
            <div className="grid grid-cols-4 gap-3">
              {[
                {label:'Sessions',val:attendance.length,color:'text-white'},
                {label:'Present',val:present,color:'text-emerald-400'},
                {label:'Absent',val:absent,color:absent>0?'text-red-400':'text-white/25'},
                {label:'Excused',val:excused,color:'text-sky-400'},
              ].map(s=>(
                <div key={s.label} className="rounded-2xl border border-white/5 p-4 text-center">
                  <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
                  <p className="text-[10px] font-black uppercase tracking-wide text-white/25 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Personal bests */}
            {pbs.length>0&&(
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
                <div className="border-b border-white/7 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Personal Bests</p>
                </div>
                <div className="divide-y divide-white/5">
                  {pbs.map(p=>(
                    <div key={p.test} className="flex items-center gap-4 px-5 py-3.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{p.test}</p>
                        {p.tier&&(
                          <span className="inline-block rounded-full px-2 py-0.5 text-[9px] font-black mt-0.5"
                            style={{background:p.tier.bg,color:p.tier.color,border:`1px solid ${p.tier.border}`}}>
                            {p.tier.label}
                          </span>
                        )}
                      </div>
                      <Spark vals={p.vals} lower={LOWER.some(t=>p.test.toLowerCase().includes(t.toLowerCase()))}/>
                      <p className="text-base font-black text-white text-right">
                        {p.pb}<span className="text-xs text-white/35 ml-1">{p.unit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Radar chart */}
            {pbs.length>=3&&(
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
                <div className="border-b border-white/7 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Performance Profile</p>
                </div>
                <div className="p-4">
                  <AthleteRadarChart pbs={pbs}/>
                </div>
              </div>
            )}

            {/* Progress chart */}
            {pbs.some(p=>p.vals.length>1)&&(
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
                <div className="border-b border-white/7 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Progress Over Time</p>
                </div>
                <div className="p-4">
                  <AthleteProgressChart pbs={pbs}/>
                </div>
              </div>
            )}

            {/* Player feedback */}
            <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
              <div className="border-b border-white/7 px-5 py-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Coach Feedback</p>
                <button onClick={()=>{setEditFb(true);setFbStr(latestFeedback?.strengths||'');setFbFoc(latestFeedback?.current_focus||'');setFbCom(latestFeedback?.coach_comment||'');}}
                  className="rounded-xl border border-white/8 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white transition">
                  {latestFeedback?'Edit':'Add'}
                </button>
              </div>
              {editFb?(
                <div className="p-5 space-y-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-emerald-400">Strengths</label>
                    <textarea value={fbStr} onChange={e=>setFbStr(e.target.value)} rows={2} placeholder="e.g. Excellent work ethic…"
                      className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500 resize-none"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-amber-400">Current Focus</label>
                    <textarea value={fbFoc} onChange={e=>setFbFoc(e.target.value)} rows={2} placeholder="e.g. Improve acceleration…"
                      className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 resize-none"/>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-sky-400">Comment</label>
                    <textarea value={fbCom} onChange={e=>setFbCom(e.target.value)} rows={2} placeholder="General coach comment…"
                      className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 resize-none"/>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveFeedback} disabled={savingFb}
                      className="rounded-xl border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-xs font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
                      {savingFb?'Saving…':'Save Feedback'}
                    </button>
                    <button onClick={()=>setEditFb(false)}
                      className="rounded-xl border border-white/8 bg-white/5 px-4 py-2 text-xs font-black text-white/50 hover:text-white transition">
                      Cancel
                    </button>
                  </div>
                </div>
              ):latestFeedback?(
                <div className="p-5 space-y-3">
                  {latestFeedback.strengths&&<div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4"><p className="mb-1 text-[10px] font-black uppercase tracking-wide text-emerald-400">Strengths</p><p className="text-sm text-slate-200 leading-relaxed">{latestFeedback.strengths}</p></div>}
                  {latestFeedback.current_focus&&<div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-4"><p className="mb-1 text-[10px] font-black uppercase tracking-wide text-amber-400">Current Focus</p><p className="text-sm text-slate-200 leading-relaxed">{latestFeedback.current_focus}</p></div>}
                  {latestFeedback.coach_comment&&<div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-4"><p className="mb-1 text-[10px] font-black uppercase tracking-wide text-sky-400">Comment</p><p className="text-sm text-slate-200 leading-relaxed italic">"{latestFeedback.coach_comment}"</p></div>}
                </div>
              ):(
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-white/25">No feedback recorded yet.</p>
                </div>
              )}
            </div>

            {/* AI Summary */}
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 overflow-hidden">
              <div className="border-b border-violet-500/15 px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4 text-violet-400"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>
                  <p className="text-xs font-black text-white">AI Summary</p>
                </div>
                <button onClick={generateAI} disabled={genAI}
                  className="rounded-xl border border-violet-500/40 bg-violet-500/15 px-3 py-1.5 text-[11px] font-black text-violet-300 hover:bg-violet-500/25 transition disabled:opacity-50 flex items-center gap-1.5">
                  {genAI&&<div className="h-3 w-3 animate-spin rounded-full border border-violet-400 border-t-transparent"/>}
                  {genAI?'Generating…':'Generate'}
                </button>
              </div>
              <div className="px-5 py-4">
                {aiText?(
                  <div>
                    <p className="text-sm text-slate-200 leading-relaxed">{aiText}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={()=>navigator.clipboard.writeText(aiText)}
                        className="rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white transition">Copy</button>
                      <button onClick={()=>setAiText('')}
                        className="rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-[10px] font-black text-white/50 hover:text-white transition">Clear</button>
                    </div>
                  </div>
                ):<p className="text-sm text-white/25">Click Generate to create an AI-assisted athlete summary for coach or parent use.</p>}
              </div>
            </div>
          </div>
        )}

        {/* ══ ATTENDANCE TAB ══ */}
        {activeTab==='attendance'&&(
          <div className="space-y-5">
            {/* Quick add */}
            <div className="rounded-2xl border border-white/6 p-5">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Add Session</p>
              <form onSubmit={addAttendance} className="grid gap-3 sm:grid-cols-3">
                <input type="date" value={attDate} onChange={e=>setAttDate(e.target.value)}
                  className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500"/>
                <select value={attType} onChange={e=>setAttType(e.target.value)}
                  className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                  {['Training','Match','Gym','Fitness','Other'].map(t=><option key={t}>{t}</option>)}
                </select>
                <select value={attStatus} onChange={e=>setAttStatus(e.target.value)}
                  className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                  {['Present','Late','Absent','Excused'].map(s=><option key={s}>{s}</option>)}
                </select>
                <button type="submit" disabled={savingAtt}
                  className="sm:col-span-3 rounded-xl border border-sky-500/40 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
                  {savingAtt?'Adding…':'Add Session'}
                </button>
              </form>
            </div>
            {/* History */}
            <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
              <div className="border-b border-white/7 px-5 py-3 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">History</p>
                {attRate!==null&&<span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${attRate>=80?'bg-emerald-500/15 text-emerald-300':attRate>=60?'bg-amber-500/15 text-amber-300':'bg-red-500/15 text-red-300'}`}>{attRate}% rate</span>}
              </div>
              {attendance.length===0?(
                <div className="py-10 text-center"><p className="text-sm text-white/25">No sessions recorded.</p></div>
              ):(
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {attendance.map(a=>{
                    const s=a.status?.toLowerCase()||'';
                    return(
                      <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white">{fDate(a.session_date)}</p>
                          <p className="text-[11px] text-white/35">{a.session_type||'—'}</p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${STATUS_STYLES[s]||'bg-white/5 text-white/65 border-white/8'}`}>
                          {a.status}
                        </span>
                        <button onClick={async()=>{if(!confirm('Delete?'))return;await supabase.from('attendance').delete().eq('id',a.id);await load();}}
                          className="text-white/15 hover:text-red-400 transition text-xs">✕</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ PERFORMANCE TAB ══ */}
        {activeTab==='performance'&&(
          <div className="space-y-5">
            {/* Quick add */}
            <div className="rounded-2xl border border-white/6 p-5">
              <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">Add Result</p>
              <form onSubmit={addPerformance} className="grid gap-3 sm:grid-cols-3">
                <input type="date" value={perfDate} onChange={e=>setPerfDate(e.target.value)}
                  className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"/>
                <input value={perfTest} onChange={e=>setPerfTest(e.target.value)} placeholder="Test type e.g. SBJ"
                  list="test-suggestions"
                  className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"/>
                <datalist id="test-suggestions">
                  {['SBJ','10m Sprint','30m Sprint','505 Left','505 Right','Push-Ups','Pull-Ups','Yo-Yo IR1','Bronco','RSA Sdec%'].map(t=><option key={t} value={t}/>)}
                </datalist>
                <div className="flex gap-2">
                  <input value={perfVal} onChange={e=>setPerfVal(e.target.value)} placeholder="Value" type="number" step="any"
                    className="flex-1 rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"/>
                  <input value={perfUnit} onChange={e=>setPerfUnit(e.target.value)} placeholder="Unit" style={{width:70}}
                    className="rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"/>
                </div>
                <button type="submit" disabled={savingPerf||!perfTest.trim()||!perfVal}
                  className="sm:col-span-3 rounded-xl border border-violet-500/40 bg-violet-500/15 py-2.5 text-sm font-black text-violet-300 hover:bg-violet-500/25 transition disabled:opacity-50">
                  {savingPerf?'Saving…':'Save Result'}
                </button>
              </form>
            </div>
            {/* All results */}
            {performance.length===0?(
              <div className="rounded-2xl border border-white/5 py-10 text-center">
                <p className="text-sm text-white/25">No results recorded yet.</p>
              </div>
            ):(
              <div className="rounded-2xl overflow-hidden" style={{border:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.015)"}}>
                <div className="border-b border-white/7 px-5 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25">All Results</p>
                </div>
                <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
                  {performance.map(p=>{
                    const tier=p.value!==null?getTier(p.test_type,p.value,ageGroup):null;
                    return(
                      <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{p.test_type}</p>
                          <p className="text-[11px] text-white/35">{fDate(p.test_date)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-white">{p.value}{p.unit&&<span className="text-white/35 text-xs ml-1">{p.unit}</span>}</p>
                          {tier&&<span className="text-[9px] font-black" style={{color:tier.color}}>{tier.label}</span>}
                        </div>
                        <button onClick={async()=>{if(!confirm('Delete?'))return;await supabase.from('performance_tests').delete().eq('id',p.id);await load();}}
                          className="text-white/15 hover:text-red-400 transition text-xs shrink-0">✕</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ NOTES TAB ══ */}
        {activeTab==='notes'&&(
          <div className="space-y-5">
            {/* Add note */}
            <div className="rounded-2xl border border-white/6 p-5">
              <form onSubmit={addNote} className="space-y-3">
                <textarea value={newNote} onChange={e=>setNewNote(e.target.value)} rows={3}
                  placeholder="Add a coach note…"
                  className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500 resize-none"/>
                <button type="submit" disabled={savingNote||!newNote.trim()}
                  className="w-full rounded-xl border border-sky-500/40 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 hover:bg-sky-500/25 transition disabled:opacity-50">
                  {savingNote?'Saving…':'Add Note'}
                </button>
              </form>
            </div>
            {/* Notes list */}
            {coachNotes.length===0?(
              <div className="rounded-2xl border border-white/5 py-10 text-center">
                <p className="text-sm text-white/25">No notes yet.</p>
              </div>
            ):(
              <div className="space-y-3">
                {coachNotes.map(n=>(
                  <div key={n.id} className="rounded-2xl border border-white/5 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-[10px] text-white/25">{fDate(n.created_at)}{n.author_email&&` · ${n.author_email}`}</p>
                      <button onClick={async()=>{if(!confirm('Delete?'))return;await supabase.from('coach_notes').delete().eq('id',n.id);await load();}}
                        className="text-white/15 hover:text-red-400 transition text-xs shrink-0">✕</button>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-8 pt-6 border-t border-white/7">
          <button onClick={async()=>{if(!confirm(`Delete ${name}? This cannot be undone.`))return;await supabase.from('athletes').delete().eq('id',id);router.push('/athletes');}}
            className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-xs font-black text-red-400 hover:bg-red-500/15 transition">
            Delete Athlete
          </button>
        </div>

      </div>
    </main>
  );
}
