'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useRouter } from 'next/navigation';

type Row = Record<string, any>;

const TEAM_GROUPS = [
  { group: 'Senior', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    teams: ['U14A','U14B','U14C','U14D','U14E'] },
];

const STATUS_COLORS: Record<string, string> = {
  present: '#059669', late: '#d97706', absent: '#dc2626', excused: '#0369a1',
};

function statusColor(s: string) {
  return STATUS_COLORS[s?.toLowerCase()] || '#64748b';
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function AttendanceExportPage() {
  const { isHOH, loading: roleLoading } = useRole();
  const router = useRouter();
  const [athletes, setAthletes] = React.useState<Row[]>([]);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selTeam, setSelTeam] = React.useState<string | null>(null);
  const [exportMode, setExportMode] = React.useState<'register' | 'history'>('register');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  React.useEffect(() => {
    if (!roleLoading && !isHOH) {
      router.replace('/dashboard');
    }
  }, [isHOH, roleLoading]);

  React.useEffect(() => {
    Promise.all([
      supabase.from('athletes').select('id, full_name, team, age_group').order('full_name'),
      supabase.from('attendance').select('*').order('session_date', { ascending: false }),
    ]).then(([a, att]) => {
      setAthletes(a.data || []);
      setAttendance(att.data || []);
      setLoading(false);
    });
  }, []);

  const teamAthletes = React.useMemo(() =>
    selTeam ? athletes.filter(a => a.team === selTeam).sort((a, b) => {
      const sA = a.full_name?.trim().split(' ').pop()?.toLowerCase() || '';
      const sB = b.full_name?.trim().split(' ').pop()?.toLowerCase() || '';
      return sA.localeCompare(sB);
    }) : []
  , [selTeam, athletes]);

  const teamAttendance = React.useMemo(() => {
    if (!selTeam) return [];
    const ids = new Set(teamAthletes.map(a => a.id));
    return attendance.filter(a => ids.has(a.athlete_id));
  }, [selTeam, teamAthletes, attendance]);

  const filteredAttendance = React.useMemo(() => {
    let data = teamAttendance;
    if (dateFrom) data = data.filter(a => a.session_date >= dateFrom);
    if (dateTo)   data = data.filter(a => a.session_date <= dateTo);
    return data;
  }, [teamAttendance, dateFrom, dateTo]);

  const sessionDates = [...new Set(filteredAttendance.map(a => a.session_date))].sort().reverse();

  // Per-athlete summary stats
  function athleteStats(athleteId: string) {
    const records = filteredAttendance.filter(a => a.athlete_id === athleteId);
    const present = records.filter(a => ['present','late'].includes(a.status?.toLowerCase())).length;
    const absent  = records.filter(a => a.status?.toLowerCase() === 'absent').length;
    const excused = records.filter(a => a.status?.toLowerCase() === 'excused').length;
    const rate    = records.length > 0 ? Math.round((present / records.length) * 100) : null;
    return { total: records.length, present, absent, excused, rate };
  }

  function openPrint() {
    window.print();
  }

  if (roleLoading || loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[rgba(255,255,255,0.01)]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"/>
    </main>
  );

  if (!isHOH) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; font-family: 'Inter', sans-serif; }
          @page { size: A4 landscape; margin: 10mm 12mm; }
          .print-page { padding: 0; }
        }
      `}</style>

      {/* ── COACH INTERFACE (no-print) ── */}
      <div className="no-print min-h-screen bg-[rgba(255,255,255,0.01)] pb-20 text-white md:pb-0">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <Link href="/dashboard" className="text-xs text-white/35 hover:text-white/70 transition mb-3 inline-block">← Dashboard</Link>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">Head of Hockey</p>
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-black text-amber-300">HOH Only</span>
              </div>
              <h1 className="text-3xl font-black text-white">Attendance Export</h1>
              <p className="mt-1 text-sm text-white/35">Export team registers and attendance history as PDF</p>
            </div>
          </div>

          {/* Export type */}
          <div className="mb-6 flex rounded-xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-1 w-fit">
            {(['register','history'] as const).map(mode => (
              <button key={mode} onClick={() => setExportMode(mode)}
                className={`rounded-lg px-5 py-2 text-xs font-black capitalize transition ${exportMode === mode ? 'bg-white/8 text-white' : 'text-white/35 hover:text-white'}`}>
                {mode === 'register' ? 'Session Register' : 'Full History'}
              </button>
            ))}
          </div>

          {/* Team selector */}
          <div className="mb-6">
            <p className="mb-3 text-[10px] font-black uppercase tracking-wide text-white/35">Select Team</p>
            <div className="space-y-3">
              {TEAM_GROUPS.map(g => (
                <div key={g.group}>
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wide text-white/15">{g.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.teams.map(t => {
                      const count = athletes.filter(a => a.team === t).length;
                      if (!count) return null;
                      return (
                        <button key={t} onClick={() => setSelTeam(selTeam === t ? null : t)}
                          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-black transition ${selTeam === t ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border-white/8 bg-[rgba(255,255,255,0.025)] text-white/50 hover:text-white hover:border-slate-500'}`}>
                          {t}
                          <span className={`text-[9px] ${selTeam === t ? 'text-amber-400/70' : 'text-white/25'}`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Date filter */}
          {selTeam && (
            <div className="mb-6 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/35">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[rgba(255,255,255,0.025)] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"/>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/35">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full rounded-xl border border-white/8 bg-[rgba(255,255,255,0.025)] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"/>
              </div>
            </div>
          )}

          {/* Preview summary */}
          {selTeam && (
            <div className="mb-6 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
              <p className="text-xs font-black uppercase tracking-wide text-white/35 mb-3">Export Preview</p>
              <div className="flex gap-6">
                <div>
                  <p className="text-2xl font-black text-white">{teamAthletes.length}</p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wide">Athletes</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{sessionDates.length}</p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wide">Sessions</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-white">{filteredAttendance.length}</p>
                  <p className="text-[10px] text-white/25 uppercase tracking-wide">Records</p>
                </div>
              </div>
              {sessionDates.length > 0 && (
                <p className="mt-3 text-[11px] text-white/25">
                  {fmt(sessionDates[sessionDates.length - 1])} → {fmt(sessionDates[0])}
                </p>
              )}
            </div>
          )}

          {/* Export button */}
          {selTeam && (
            <button onClick={openPrint}
              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-3.5 text-sm font-black text-amber-300 hover:bg-amber-500/25 transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export {selTeam} — {exportMode === 'register' ? 'Session Register' : 'Full History'}
            </button>
          )}

          {!selTeam && (
            <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)]/50 py-12 text-center">
              <p className="text-white/25 text-sm">Select a team above to preview and export</p>
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT DOCUMENT ── */}
      {selTeam && (
        <div className="print-page hidden print:block" style={{fontFamily:'Inter,sans-serif',color:'#111827',background:'#fff'}}>

          {/* Document header */}
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,paddingBottom:14,borderBottom:'2.5px solid #111827'}}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/st-benedicts-logo.png" alt="SBC" style={{width:44,height:44,objectFit:'contain'}}/>
              <div>
                <div style={{fontSize:17,fontWeight:900,lineHeight:1.2}}>St Benedict&apos;s College</div>
                <div style={{fontSize:10,color:'#6b7280',marginTop:2,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:500}}>
                  Hockey Programme · Attendance {exportMode === 'register' ? 'Register' : 'History'}
                </div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:28,fontWeight:900,color:'#111827',lineHeight:1}}>{selTeam}</div>
              <div style={{fontSize:10,color:'#6b7280',marginTop:3}}>
                {dateFrom || dateTo
                  ? `${dateFrom ? fmt(dateFrom) : 'Start'} → ${dateTo ? fmt(dateTo) : 'Today'}`
                  : 'All sessions'
                } · Generated {new Date().toLocaleDateString('en-ZA')}
              </div>
            </div>
          </div>

          {exportMode === 'register' ? (
            /* ── SESSION REGISTER — athletes as rows, dates as columns ── */
            <>
              <div style={{marginBottom:14,display:'flex',gap:24}}>
                <div style={{fontSize:11,color:'#6b7280'}}>{teamAthletes.length} athletes · {sessionDates.length} sessions</div>
                {/* Legend */}
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  {[['P','Present','#059669'],['L','Late','#d97706'],['A','Absent','#dc2626'],['E','Excused','#0369a1']].map(([code,label,color])=>(
                    <span key={code} style={{fontSize:9,color:'#6b7280',display:'flex',alignItems:'center',gap:3}}>
                      <span style={{fontWeight:700,color,fontSize:10}}>{code}</span> {label}
                    </span>
                  ))}
                </div>
              </div>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}>
                <thead>
                  <tr style={{background:'#111827'}}>
                    <th style={{color:'#fff',padding:'7px 10px',textAlign:'left',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',whiteSpace:'nowrap',minWidth:120}}>Athlete</th>
                    {sessionDates.map(d => (
                      <th key={d} style={{color:'#fff',padding:'7px 6px',textAlign:'center',fontWeight:600,whiteSpace:'nowrap',fontSize:8}}>
                        {new Date(d).toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}
                      </th>
                    ))}
                    <th style={{color:'#fff',padding:'7px 8px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',whiteSpace:'nowrap'}}>Rate</th>
                    <th style={{color:'#fff',padding:'7px 8px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>P</th>
                    <th style={{color:'#fff',padding:'7px 8px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em'}}>A</th>
                  </tr>
                </thead>
                <tbody>
                  {teamAthletes.map((a, i) => {
                    const stats = athleteStats(a.id);
                    const surname = a.full_name?.trim().split(' ').pop() || a.full_name;
                    const firstName = a.full_name?.trim().split(' ').slice(0, -1).join(' ') || '';
                    return (
                      <tr key={a.id} style={{background: i % 2 === 0 ? '#f9fafb' : '#fff', borderBottom:'1px solid #f3f4f6'}}>
                        <td style={{padding:'6px 10px',fontWeight:600,fontSize:10}}>
                          {surname}
                          {firstName && <span style={{fontWeight:400,color:'#9ca3af',fontSize:9}}> {firstName}</span>}
                        </td>
                        {sessionDates.map(d => {
                          const rec = filteredAttendance.find(r => r.athlete_id === a.id && r.session_date === d);
                          const s = rec?.status?.toLowerCase() || '';
                          const code = s === 'present' ? 'P' : s === 'late' ? 'L' : s === 'absent' ? 'A' : s === 'excused' ? 'E' : '—';
                          return (
                            <td key={d} style={{padding:'6px 6px',textAlign:'center',fontWeight:700,color:statusColor(s),fontSize:10}}>
                              {code}
                            </td>
                          );
                        })}
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:800,fontSize:10,color:stats.rate!==null?(stats.rate>=80?'#059669':stats.rate>=60?'#d97706':'#dc2626'):'#9ca3af'}}>
                          {stats.rate !== null ? `${stats.rate}%` : '—'}
                        </td>
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#059669',fontSize:10}}>{stats.present}</td>
                        <td style={{padding:'6px 8px',textAlign:'center',fontWeight:700,color:'#dc2626',fontSize:10}}>{stats.absent}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          ) : (
            /* ── FULL HISTORY — chronological log ── */
            <>
              <div style={{marginBottom:14,fontSize:11,color:'#6b7280'}}>
                {teamAthletes.length} athletes · {sessionDates.length} sessions · {filteredAttendance.length} records
              </div>
              {/* Summary table first */}
              <div style={{marginBottom:20}}>
                <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#9ca3af',marginBottom:8}}>Athlete Summary</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                  <thead>
                    <tr style={{background:'#f1f5f9',borderBottom:'2px solid #e2e8f0'}}>
                      <th style={{padding:'6px 10px',textAlign:'left',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Athlete</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Sessions</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Present</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Late</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Absent</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Excused</th>
                      <th style={{padding:'6px 10px',textAlign:'center',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',fontSize:9,color:'#64748b'}}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamAthletes.map((a, i) => {
                      const stats = athleteStats(a.id);
                      const late = filteredAttendance.filter(r => r.athlete_id === a.id && r.status?.toLowerCase() === 'late').length;
                      const surname = a.full_name?.trim().split(' ').pop() || a.full_name;
                      const firstName = a.full_name?.trim().split(' ').slice(0,-1).join(' ') || '';
                      return (
                        <tr key={a.id} style={{background: i%2===0?'#f9fafb':'#fff', borderBottom:'1px solid #f3f4f6'}}>
                          <td style={{padding:'6px 10px',fontWeight:600}}>
                            {surname}
                            {firstName && <span style={{fontWeight:400,color:'#9ca3af',fontSize:9}}> {firstName}</span>}
                          </td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:600}}>{stats.total}</td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#059669'}}>{stats.present}</td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#d97706'}}>{late}</td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#dc2626'}}>{stats.absent}</td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:700,color:'#0369a1'}}>{stats.excused}</td>
                          <td style={{padding:'6px 10px',textAlign:'center',fontWeight:800,color:stats.rate!==null?(stats.rate>=80?'#059669':stats.rate>=60?'#d97706':'#dc2626'):'#9ca3af'}}>
                            {stats.rate !== null ? `${stats.rate}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Session-by-session log */}
              <div style={{fontSize:9,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'#9ca3af',marginBottom:8}}>Session Log</div>
              {sessionDates.map(d => {
                const recs = filteredAttendance.filter(r => r.session_date === d);
                const present = recs.filter(r => ['present','late'].includes(r.status?.toLowerCase())).length;
                const sessionType = recs[0]?.session_type || recs[0]?.type || '';
                return (
                  <div key={d} style={{marginBottom:10,pageBreakInside:'avoid'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f8fafc',borderLeft:'3px solid #0ea5e9',padding:'6px 10px',marginBottom:4,borderRadius:'0 6px 6px 0'}}>
                      <div>
                        <span style={{fontWeight:700,fontSize:11}}>{fmt(d)}</span>
                        {sessionType && <span style={{marginLeft:8,fontSize:9,color:'#6b7280'}}>{sessionType}</span>}
                      </div>
                      <span style={{fontSize:10,color:'#059669',fontWeight:700}}>{present}/{recs.length} attended</span>
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4,paddingLeft:10}}>
                      {recs.sort((a,b) => a.athlete_name?.localeCompare(b.athlete_name)).map(r => (
                        <span key={r.id} style={{fontSize:9,padding:'2px 7px',borderRadius:20,fontWeight:600,
                          background: r.status?.toLowerCase()==='present'?'#d1fae5':r.status?.toLowerCase()==='late'?'#fef3c7':r.status?.toLowerCase()==='absent'?'#fee2e2':'#e0f2fe',
                          color: statusColor(r.status)}}>
                          {(r.athlete_name||'').trim().split(' ').pop()}
                          {r.status?.toLowerCase()!=='present'&&<span style={{marginLeft:3,opacity:0.7}}>·{r.status?.[0]?.toUpperCase()}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {/* Footer */}
          <div style={{marginTop:24,paddingTop:12,borderTop:'1px solid #e5e7eb',display:'flex',justifyContent:'space-between',fontSize:9,color:'#9ca3af'}}>
            <span>St Benedict&apos;s College · Hockey Programme · {selTeam}</span>
            <span>Confidential · Head of Hockey Use Only</span>
            <span>Generated {new Date().toLocaleDateString('en-ZA')}</span>
          </div>
        </div>
      )}
    </>
  );
}
