'use client';

import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/Toast';

type Row = Record<string, any>;

const SESSION_TYPES = ['Training','Match','Gym','Fitness','Extras','Other'];
const STATUS_OPTIONS = ['Present','Late','Absent','Excused'];
const STATUS_STYLES: Record<string,{bg:string;text:string;border:string}> = {
  Present: {bg:'bg-emerald-500/20',text:'text-emerald-300',border:'border-emerald-500/30'},
  Late:    {bg:'bg-amber-500/20',  text:'text-amber-300',  border:'border-amber-500/30'},
  Absent:  {bg:'bg-red-500/20',    text:'text-red-300',    border:'border-red-500/30'},
  Excused: {bg:'bg-sky-500/20',    text:'text-sky-300',    border:'border-sky-500/30'},
};

const TEAM_GROUPS = [
  {group:'Senior',teams:['1sts','2nds','3rds','4ths','5ths']},
  {group:'U16',   teams:['U16A','U16B','U16C','U16D','U16E']},
  {group:'U15',   teams:['U15A','U15B','U15C','U15D','U15E']},
  {group:'U14',   teams:['U14A','U14B','U14C','U14D','U14E']},
];

function fDate(d:string) {
  return new Date(d).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'});
}

export default function AttendancePage() {
  const {showToast} = useToast();
  const {canSeeAllTeams, teams:myTeams, loading:roleLoading} = useRole();

  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [history, setHistory] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Session setup
  const [selTeam, setSelTeam] = React.useState('');
  const [sessionType, setSessionType] = React.useState('Training');
  const [sessionDate, setSessionDate] = React.useState(()=>new Date().toISOString().split('T')[0]);

  // Mark phase
  const [statuses, setStatuses] = React.useState<Record<string,string>>({});
  const [saving, setSaving] = React.useState(false);

  // History view
  const [view, setView] = React.useState<'mark'|'history'>('mark');
  const [histTeam, setHistTeam] = React.useState('All');

  React.useEffect(()=>{
    if(roleLoading) return;
    async function load(){
      let q = supabase.from('athletes').select('id,full_name,team,availability').order('full_name');
      if(!canSeeAllTeams&&myTeams.length>0) q=q.in('team',myTeams);
      const [aRes,hRes] = await Promise.all([
        q,
        supabase.from('attendance').select('*,athletes(full_name,team)').order('session_date',{ascending:false}).limit(500),
      ]);
      setAthletes(aRes.data||[]);
      setHistory(hRes.data||[]);
      setLoading(false);
    }
    load();
  },[roleLoading,canSeeAllTeams,myTeams.join(',')]);

  // When team changes, pre-load existing attendance for today
  React.useEffect(()=>{
    if(!selTeam) return;
    const squad=athletes.filter(a=>a.team===selTeam);
    const init:Record<string,string>={};
    squad.forEach(a=>{ init[a.id]='Present'; });
    // Check if there's existing data for this date+team
    const existing=history.filter(h=>{
      const teamAth=athletes.find(a=>a.id===h.athlete_id);
      return h.session_date===sessionDate&&teamAth?.team===selTeam;
    });
    existing.forEach(h=>{ init[h.athlete_id]=h.status||'Present'; });
    setStatuses(init);
  },[selTeam,sessionDate,athletes]);

  const squad=React.useMemo(()=>
    athletes.filter(a=>a.team===selTeam).sort((a,b)=>
      (a.full_name?.split(' ').pop()||'').localeCompare(b.full_name?.split(' ').pop()||'')
    )
  ,[selTeam,athletes]);

  const visibleTeams=React.useMemo(()=>{
    const all=TEAM_GROUPS.flatMap(g=>g.teams).filter(t=>athletes.some(a=>a.team===t));
    return canSeeAllTeams?all:all.filter(t=>myTeams.includes(t));
  },[canSeeAllTeams,myTeams,athletes]);

  function cycleStatus(athleteId:string) {
    setStatuses(prev=>{
      const cur=prev[athleteId]||'Present';
      const idx=STATUS_OPTIONS.indexOf(cur);
      const next=STATUS_OPTIONS[(idx+1)%STATUS_OPTIONS.length];
      return {...prev,[athleteId]:next};
    });
  }

  async function saveSession() {
    if(!selTeam||squad.length===0) return;
    setSaving(true);
    // Delete existing records for this date+team
    const ids=squad.map(a=>a.id);
    await supabase.from('attendance').delete().eq('session_date',sessionDate).in('athlete_id',ids);
    // Insert new
    const rows=squad.map(a=>({
      athlete_id:a.id,
      session_date:sessionDate,
      session_type:sessionType,
      status:statuses[a.id]||'Present',
    }));
    const {error}=await supabase.from('attendance').insert(rows);
    if(error){showToast(`Error: ${error.message}`,'error');}
    else{
      showToast(`${squad.length} athletes marked ✓`);
      // Refresh history
      const {data}=await supabase.from('attendance').select('*,athletes(full_name,team)').order('session_date',{ascending:false}).limit(500);
      setHistory(data||[]);
    }
    setSaving(false);
  }

  function markAll(status:string){
    const next:Record<string,string>={};
    squad.forEach(a=>{next[a.id]=status;});
    setStatuses(next);
  }

  const presentCount=squad.filter(a=>(statuses[a.id]||'Present')==='Present').length;
  const lateCount=squad.filter(a=>statuses[a.id]==='Late').length;
  const absentCount=squad.filter(a=>statuses[a.id]==='Absent').length;
  const excusedCount=squad.filter(a=>statuses[a.id]==='Excused').length;

  // History filtered
  const histFiltered=React.useMemo(()=>{
    if(histTeam==='All') return history;
    return history.filter(h=>(h.athletes as any)?.team===histTeam);
  },[history,histTeam]);
  const histDates=[...new Set(histFiltered.map(h=>h.session_date))].slice(0,10);

  if(loading) return(
    <main className="flex min-h-screen items-center justify-center bg-[#04060e]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"/>
    </main>
  );

  return(
    <main className="min-h-screen pb-24 text-white md:pb-0 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:"rgba(255,255,255,0.25)"}}>Hockey</p>
            <h1 className="text-4xl font-black text-white tracking-tight leading-none">Attendance</h1>
          </div>
          <div className="flex rounded-xl border border-white/7 bg-[rgba(255,255,255,0.025)] p-0.5">
            <button onClick={()=>setView('mark')}
              className={`rounded-lg px-4 py-2 text-xs font-black transition ${view==='mark'?'bg-white/8 text-white':'text-white/35 hover:text-white'}`}>
              Mark Register
            </button>
            <button onClick={()=>setView('history')}
              className={`rounded-lg px-4 py-2 text-xs font-black transition ${view==='history'?'bg-white/8 text-white':'text-white/35 hover:text-white'}`}>
              History
            </button>
          </div>
        </div>

        {/* ── MARK REGISTER ── */}
        {view==='mark'&&(
          <div className="space-y-5">

            {/* Session setup */}
            <div className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] p-5">
              <p className="mb-4 text-xs font-black uppercase tracking-wide text-white/35">Session Setup</p>
              <div className="grid gap-3 sm:grid-cols-3 mb-4">
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Date</label>
                  <input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500"/>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Type</label>
                  <select value={sessionType} onChange={e=>setSessionType(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                    {SESSION_TYPES.map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/25">Team</label>
                  <select value={selTeam} onChange={e=>setSelTeam(e.target.value)}
                    className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-emerald-500">
                    <option value="">Select team…</option>
                    {TEAM_GROUPS.map(g=>{
                      const vt=g.teams.filter(t=>visibleTeams.includes(t));
                      if(!vt.length) return null;
                      return<optgroup key={g.group} label={g.group}>{vt.map(t=><option key={t}>{t}</option>)}</optgroup>;
                    })}
                  </select>
                </div>
              </div>

              {/* Quick mark all */}
              {selTeam&&squad.length>0&&(
                <div className="flex flex-wrap gap-2">
                  <p className="self-center text-[10px] font-black uppercase tracking-wide text-white/25 mr-1">Mark all:</p>
                  {STATUS_OPTIONS.map(s=>{
                    const st=STATUS_STYLES[s];
                    return(
                      <button key={s} onClick={()=>markAll(s)}
                        className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${st.bg} ${st.border} ${st.text}`}>
                        {s}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Squad roster */}
            {selTeam&&squad.length>0?(
              <>
                {/* Stats strip */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    {label:'Present',val:presentCount,color:'text-emerald-400'},
                    {label:'Late',val:lateCount,color:'text-amber-400'},
                    {label:'Absent',val:absentCount,color:absentCount>0?'text-red-400':'text-white/25'},
                    {label:'Excused',val:excusedCount,color:'text-sky-400'},
                  ].map(s=>(
                    <div key={s.label} className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] p-3 text-center">
                      <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                      <p className="text-[9px] font-black uppercase tracking-wide text-white/25 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Player cards with explicit status buttons */}
                <div className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] overflow-hidden">
                  <div className="border-b border-white/7 px-5 py-3">
                    <p className="text-xs font-black uppercase tracking-wide text-white/35">{selTeam} · {squad.length} players</p>
                  </div>
                  <div className="divide-y divide-white/5">
                    {squad.map(a=>{
                      const status=statuses[a.id]||'Present';
                      const injured=a.availability==='Injured';
                      return(
                        <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-white/65">
                            {(a.full_name||'').split(' ').map((n:string)=>n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{a.full_name}</p>
                            {injured&&<p className="text-[10px] text-red-400">Injured</p>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {STATUS_OPTIONS.map(s=>{
                              const st=STATUS_STYLES[s];
                              const active=status===s;
                              return(
                                <button key={s} onClick={()=>setStatuses(prev=>({...prev,[a.id]:s}))}
                                  className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black transition ${active?`${st.bg} ${st.border} ${st.text}`:'border-white/7 bg-[#04060e] text-white/25 hover:text-white/65'}`}>
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

                {/* Save button */}
                <button onClick={saveSession} disabled={saving}
                  className="w-full rounded-2xl border border-emerald-500/40 bg-emerald-500/15 py-4 text-sm font-black text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving&&<div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent"/>}
                  {saving?'Saving…':`Save Register — ${selTeam} · ${sessionDate}`}
                </button>
              </>
            ):selTeam?(
              <div className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] py-12 text-center">
                <p className="text-sm text-white/25">No players in {selTeam}.</p>
              </div>
            ):(
              <div className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] py-12 text-center">
                <p className="text-white/35 text-sm">Select a team above to start marking</p>
              </div>
            )}
          </div>
        )}

        {/* ── HISTORY ── */}
        {view==='history'&&(
          <div className="space-y-5">
            {/* Team filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={()=>setHistTeam('All')}
                className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${histTeam==='All'?'border-slate-500 bg-slate-700 text-white':'border-white/7 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                All Teams
              </button>
              {visibleTeams.map(t=>(
                <button key={t} onClick={()=>setHistTeam(t)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-black transition ${histTeam===t?'border-emerald-500/40 bg-emerald-500/15 text-emerald-300':'border-white/7 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                  {t}
                </button>
              ))}
            </div>

            {histDates.length===0?(
              <div className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] py-12 text-center">
                <p className="text-sm text-white/25">No attendance recorded yet.</p>
              </div>
            ):(
              <div className="space-y-3">
                {histDates.map(date=>{
                  const sess=histFiltered.filter(h=>h.session_date===date);
                  const present=sess.filter(h=>['present','late'].includes(h.status?.toLowerCase()||'')).length;
                  const absent=sess.filter(h=>h.status?.toLowerCase()==='absent').length;
                  const sessType=sess[0]?.session_type||'';
                  return(
                    <div key={date} className="rounded-2xl border border-white/7 bg-[rgba(255,255,255,0.025)] overflow-hidden">
                      {/* Session header */}
                      <div className="flex items-center justify-between px-5 py-3 border-b border-white/7">
                        <div>
                          <p className="text-sm font-black text-white">{fDate(date)}</p>
                          <p className="text-[11px] text-white/35">{sessType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {absent>0&&<span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-black text-red-400">{absent} absent</span>}
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-black text-emerald-300">{present}/{sess.length}</span>
                        </div>
                      </div>
                      {/* Athlete chips */}
                      <div className="flex flex-wrap gap-1.5 px-5 py-3">
                        {sess.map(h=>{
                          const s=h.status||'—';
                          const st=STATUS_STYLES[s]||{bg:'bg-white/5',text:'text-white/50',border:'border-white/8'};
                          const n=(h.athletes as any)?.full_name||'Unknown';
                          return(
                            <span key={h.id} className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${st.bg} ${st.border} ${st.text}`}>
                              {n.trim().split(' ').pop()}
                              {s!=='Present'&&<span className="ml-1 opacity-60">· {s[0]}</span>}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
