'use client';
import * as React from 'react';
import Link from 'next/link';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { GRADE8_TESTS, GRADE9_TESTS, BENCHMARKS as BENCH, TIERS, getTier, fmtValue } from '@/lib/hpTests';
import { GROUP_COLORS, GROUP_LABELS } from '@/lib/hpScoring';
import { getSchoolContext } from '@/lib/hpRepository';

type Row = Record<string, any>;
type Tab = 'overview' | 'testing' | 'attendance' | 'progress' | 'notes' | 'reports' | 'interventions';
type PageProps = { params: Promise<{ id: string }> };

const TERM_ORD: Record<string, number> = { 'Term 1':1, 'Term 2':2, 'Term 3':3, 'Term 4':4 };
const ATT_COL: Record<string, string> = { Present:'#10b981', Late:'#fbbf24', Absent:'#f87171', Excused:'#38bdf8' };
const fmt = (k: string, v: number) => fmtValue(k as any, v);
const G = '#10b981';
const BG = '#060c1a';
const BD = 'rgba(255,255,255,0.07)';
const CARD: React.CSSProperties = { borderRadius:16, border:`1px solid ${BD}`, background:'rgba(255,255,255,0.025)', padding:20 };

function ini(name: string) { return name.split(' ').map(n=>n[0]||'').join('').slice(0,2).toUpperCase(); }
function fDate(d: string) { return new Date(d).toLocaleDateString('en-ZA',{weekday:'short',day:'numeric',month:'short'}); }

export default function HPStudentPage({ params }: PageProps) {
  return (
    <React.Suspense fallback={
      <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{width:24,height:24,borderRadius:'50%',border:`3px solid ${G}`,borderTopColor:'transparent',animation:'spin .8s linear infinite'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <Profile params={params}/>
    </React.Suspense>
  );
}

function Profile({ params }: PageProps) {
  const { id } = React.use(params);
  const [tab,          setTab]          = React.useState<Tab>('overview');
  const [student,      setStudent]      = React.useState<Row|null>(null);
  const [attendance,   setAttendance]   = React.useState<Row[]>([]);
  const [results,      setResults]      = React.useState<Row[]>([]);
  const [loading,      setLoading]      = React.useState(true);
  const [notes,        setNotes]        = React.useState('');
  const [savingNotes,  setSavingNotes]  = React.useState(false);
  const [notesSaved,   setNotesSaved]   = React.useState(false);
  const [flags,        setFlags]        = React.useState<Row[]>([]);
  const [flagNote,     setFlagNote]     = React.useState('');
  const [flagType,     setFlagType]     = React.useState('attention');
  const [savingFlag,   setSavingFlag]   = React.useState(false);
  const [aiText,       setAiText]       = React.useState<string|null>(null);
  const [aiLoading,    setAiLoading]    = React.useState(false);
  const [aiTerm,       setAiTerm]       = React.useState('Term 2');
  const [selYear,      setSelYear]      = React.useState(new Date().getFullYear());
  const [toast,        setToast]        = React.useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(''),3000); }

  async function load() {
    const res = await fetch(`/api/hp/data?type=student&id=${id}`, { credentials:'include' });
    if (!res.ok) { setLoading(false); return; }
    const d = await res.json();
    if (!d.student) { setLoading(false); return; }
    setStudent(d.student);
    setAttendance(d.attendance || []);
    setResults((d.tests || []).sort((a:Row,b:Row) => {
      if (a.year !== b.year) return a.year - b.year;
      return (TERM_ORD[a.term]||0) - (TERM_ORD[b.term]||0);
    }));
    setNotes(d.student.notes || '');
    setFlags(d.student.flags ? JSON.parse(d.student.flags) : []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, [id]);

  async function saveNotes() {
    if (!student) return;
    setSavingNotes(true);
    await fetch('/api/hp/students', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_notes', id:student.id, notes }),
    });
    setSavingNotes(false); setNotesSaved(true);
    setTimeout(()=>setNotesSaved(false), 2000);
    showToast('Notes saved ✓');
  }

  async function addFlag() {
    if (!flagNote.trim() || !student) return;
    setSavingFlag(true);
    const newFlags = [...flags, { type:flagType, note:flagNote.trim(), date:new Date().toISOString().split('T')[0] }];
    await fetch('/api/hp/students', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_notes', id:student.id, notes: JSON.stringify(newFlags), field:'flags' }),
    });
    setFlags(newFlags); setFlagNote(''); setSavingFlag(false);
    showToast('Flag added ✓');
  }

  async function generateReport() {
    if (!student) return;
    setAiLoading(true); setAiText(null);
    const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
    const yearResults = results.filter(r => r.year === selYear);
    const attRate = attendance.length > 0 ? Math.round((attendance.filter(a=>['Present','Late'].includes(a.status)).length / attendance.length)*100) : null;
    const breakdown = tests.map(t => {
      const termVals = yearResults.map(r => {
        const v = parseFloat(r[t.key]);
        if (isNaN(v)) return null;
        return `${r.term}: ${fmt(t.key,v)}${t.unit !== 'mm:ss' ? t.unit : ''}`;
      }).filter(Boolean);
      if (!termVals.length) return null;
      const vals = yearResults.map(r => parseFloat(r[t.key])).filter(v => !isNaN(v));
      const delta = vals.length >= 2 ? (t.lower ? vals[0]-vals[vals.length-1] : vals[vals.length-1]-vals[0]) : 0;
      return `${t.label}: ${termVals.join(' | ')}${delta !== 0 ? ` (${delta > 0 ? '+' : ''}${delta.toFixed(2)} ${t.lower?'improvement':'improvement'})` : ''}`;
    }).filter(Boolean).join('\n');
    const school = getSchoolContext();
    const prompt = `You are an HP coach at ${school.name} writing a ${aiTerm} athlete report.
Write 4-5 sentences. Quote specific numbers. Mention improvements and declines honestly. Reference attendance. End with a development focus. No bullet points. Use first name.

Student: ${student.full_name.split(' ')[0]}
Grade: ${student.grade} | Group: ${student.training_group ? `G${student.training_group} (${GROUP_LABELS[student.training_group]||''})` : 'Unassigned'}
Attendance: ${attRate !== null ? `${attRate}%` : 'No data'}

Test Results ${selYear}:
${breakdown || 'No results recorded.'}`;

    try {
      const r = await fetch('/api/hp-summary', {
        method:'POST', headers:{'Content-Type':'application/json','x-hp-access':'true'},
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      setAiText(d.text || d.error || 'Could not generate report.');
    } catch (e:any) { setAiText(`Error: ${e.message}`); }
    setAiLoading(false);
  }

  if (loading) return (
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:24,height:24,borderRadius:'50%',border:`3px solid ${G}`,borderTopColor:'transparent',animation:'spin .8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!student) return (
    <div style={{minHeight:'100vh',background:BG,display:'flex',alignItems:'center',justifyContent:'center',color:'white'}}>
      <p>Student not found</p>
    </div>
  );

  const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const present = attendance.filter(a=>['Present','Late'].includes(a.status)).length;
  const attRate = attendance.length > 0 ? Math.round((present/attendance.length)*100) : null;
  const yearResults = results.filter(r => r.year === selYear).sort((a,b)=>(TERM_ORD[a.term]||0)-(TERM_ORD[b.term]||0));
  const latest = yearResults[yearResults.length-1] || null;
  const group = student.training_group;
  const gcls = group ? GROUP_COLORS[group] : 'border-white/8 bg-white/5 text-white/40';
  const accent = student.grade === 'Grade 8' ? '#38bdf8' : '#a78bfa';

  // Radar data — latest result vs benchmarks
  const radarData = tests.map(t => {
    if (!latest || latest[t.key] == null) return null;
    const val = parseFloat(latest[t.key]);
    if (isNaN(val)) return null;
    const b = BENCH[t.key as any];
    if (!b) return null;
    const [e,,a] = b;
    const mn = Math.min(e,a), mx = Math.max(e,a);
    const norm = mx===mn ? 50 : Math.min(100,Math.max(0,((val-mn)/(mx-mn))*100));
    return { subject: t.label.split(' ')[0], value: t.lower ? 100-norm : norm, full:100 };
  }).filter(Boolean);

  // Progress data — per test across terms
  const progressData = ['Term 1','Term 2','Term 3','Term 4'].map(term => {
    const r = yearResults.find(x => x.term === term);
    if (!r) return null;
    const row: Row = { term: term.replace('Term ','T') };
    tests.forEach(t => {
      const v = parseFloat(r[t.key]);
      if (!isNaN(v)) row[t.key] = v;
    });
    return row;
  }).filter(Boolean);

  const TABS: { key: Tab; label: string }[] = [
    { key:'overview',      label:'Overview'      },
    { key:'testing',       label:'Testing'       },
    { key:'attendance',    label:'Attendance'    },
    { key:'progress',      label:'Progress'      },
    { key:'notes',         label:'Notes'         },
    { key:'reports',       label:'Reports'       },
    { key:'interventions', label:'Interventions' },
  ];

  const inp: React.CSSProperties = { width:'100%', borderRadius:10, border:`1px solid ${BD}`, background:'rgba(0,0,0,0.3)', padding:'10px 14px', color:'white', fontSize:13, outline:'none' };

  return (
    <main style={{minHeight:'100vh',background:BG,color:'white'}} className="pt-[54px] lg:pt-0">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(16,185,129,0.15)',border:'1px solid rgba(16,185,129,0.4)',borderRadius:12,padding:'11px 20px',color:G,fontWeight:700,fontSize:13,backdropFilter:'blur(12px)',whiteSpace:'nowrap'}}>{toast}</div>}

      <div style={{maxWidth:800,margin:'0 auto',padding:'0 16px 60px'}}>

        {/* ── HEADER ── */}
        <div style={{padding:'24px 0 0'}}>
          <Link href="/hp/students" style={{fontSize:11,color:'rgba(255,255,255,0.25)',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:4,marginBottom:16}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:12,height:12}}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            Students
          </Link>

          <div style={{display:'flex',alignItems:'flex-start',gap:16,flexWrap:'wrap',marginBottom:20}}>
            {/* Avatar */}
            <div style={{width:64,height:64,borderRadius:20,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:900,background:`${accent}18`,color:accent,border:`1px solid ${accent}30`}}>
              {ini(student.full_name)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <h1 style={{fontSize:24,fontWeight:900,letterSpacing:'-0.02em',marginBottom:4,lineHeight:1}}>{student.full_name}</h1>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,alignItems:'center'}}>
                <span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>{student.grade}</span>
                {student.class_group && <><span style={{color:'rgba(255,255,255,0.2)',fontSize:11}}>·</span><span style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>Class {student.class_group}</span></>}
                {group && (
                  <span className={`rounded-lg border px-2.5 py-0.5 text-[10px] font-black ${gcls}`}>
                    G{group} · {GROUP_LABELS[group]}
                  </span>
                )}
                {attRate !== null && (
                  <span style={{fontSize:11,fontWeight:700,color:attRate>=80?G:attRate>=60?'#fbbf24':'#f87171'}}>
                    {attRate}% att.
                  </span>
                )}
                {latest && <span style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Tested {latest.term}</span>}
              </div>
            </div>
            <Link href={`/hp-print/student/${id}`} target="_blank"
              style={{padding:'8px 14px',borderRadius:10,border:`1px solid ${BD}`,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.4)',fontSize:12,fontWeight:700,textDecoration:'none',flexShrink:0,display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Print Report
            </Link>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:2,overflowX:'auto',paddingBottom:2,borderBottom:`1px solid ${BD}`}}>
            {TABS.map(t => (
              <button key={t.key} onClick={()=>setTab(t.key)} style={{
                padding:'9px 14px',borderRadius:'10px 10px 0 0',fontSize:12,fontWeight:700,
                whiteSpace:'nowrap',border:'none',cursor:'pointer',transition:'all .15s',
                background: tab===t.key ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: tab===t.key ? 'white' : 'rgba(255,255,255,0.35)',
                borderBottom: tab===t.key ? `2px solid ${accent}` : '2px solid transparent',
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        <div style={{paddingTop:20}}>

          {/* ── OVERVIEW ── */}
          {tab==='overview' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Stats row */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                {[
                  { label:'Attendance',  val: attRate!==null ? `${attRate}%` : '—', col: attRate===null?'rgba(255,255,255,0.4)':attRate>=80?G:attRate>=60?'#fbbf24':'#f87171' },
                  { label:'Sessions',    val: String(attendance.length),            col:'white' },
                  { label:'Tests',       val: String(results.length),               col:'white' },
                ].map(s=>(
                  <div key={s.label} style={{...CARD,textAlign:'center',padding:'14px 10px'}}>
                    <p style={{fontSize:26,fontWeight:900,color:s.col,lineHeight:1,marginBottom:4}}>{s.val}</p>
                    <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.12em'}}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Radar */}
              {radarData.length > 0 && (
                <div style={CARD}>
                  <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:14}}>Performance Profile — {latest?.term} {selYear}</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={radarData as any[]}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)"/>
                      <PolarAngleAxis dataKey="subject" tick={{fill:'rgba(255,255,255,0.45)',fontSize:11}}/>
                      <Radar name="Score" dataKey="value" stroke={accent} fill={accent} fillOpacity={0.15} strokeWidth={2}/>
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Latest tier breakdown */}
              {latest && (
                <div style={CARD}>
                  <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:14}}>Latest Test Results</p>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {tests.map(t => {
                      const val = parseFloat(latest[t.key]);
                      if (isNaN(val)) return null;
                      const tier = getTier(t.key as any, val, t.lower);
                      const b = BENCH[t.key as any];
                      const progress = b ? Math.min(100,Math.max(0,(t.lower ? (b[0]-val)/(b[0]-b[3]) : (val-b[3])/(b[0]-b[3]))*100)) : 50;
                      return (
                        <div key={t.key}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                            <span style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{t.label}</span>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <span style={{fontSize:13,fontWeight:900,color:'white'}}>{fmt(t.key,val)} <span style={{fontSize:10,color:'rgba(255,255,255,0.35)'}}>{t.unit}</span></span>
                              {tier && <span style={{fontSize:9,fontWeight:800,padding:'2px 8px',borderRadius:6,background:tier.bg,color:tier.color}}>{tier.abbr}</span>}
                            </div>
                          </div>
                          <div style={{height:4,borderRadius:4,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                            <div style={{height:'100%',borderRadius:4,background:`${accent}`,width:`${progress}%`,transition:'width .4s ease'}}/>
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              )}

              {!latest && <div style={{...CARD,textAlign:'center',padding:'32px'}}><p style={{color:'rgba(255,255,255,0.25)',fontSize:13}}>No test results yet</p></div>}
            </div>
          )}

          {/* ── TESTING ── */}
          {tab==='testing' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Year selector */}
              <div style={{display:'flex',gap:8}}>
                {[new Date().getFullYear()-1, new Date().getFullYear()].map(y=>(
                  <button key={y} onClick={()=>setSelYear(y)} style={{
                    padding:'7px 16px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',
                    border:`1px solid ${selYear===y?`${accent}45`:BD}`,
                    background:selYear===y?`${accent}15`:'rgba(255,255,255,0.03)',
                    color:selYear===y?accent:'rgba(255,255,255,0.4)',
                  }}>{y}</button>
                ))}
              </div>

              {/* Term by term table */}
              {yearResults.length === 0 ? (
                <div style={{...CARD,textAlign:'center',padding:'32px'}}><p style={{color:'rgba(255,255,255,0.25)',fontSize:13}}>No results for {selYear}</p></div>
              ) : (
                <div style={{...CARD,padding:0,overflow:'hidden'}}>
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',minWidth:480}}>
                      <thead>
                        <tr style={{background:'rgba(255,255,255,0.03)'}}>
                          <th style={{padding:'10px 16px',textAlign:'left',fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',borderBottom:`1px solid ${BD}`}}>Test</th>
                          {yearResults.map(r=>(
                            <th key={r.term} style={{padding:'10px 16px',textAlign:'center',fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.1em',borderBottom:`1px solid ${BD}`}}>{r.term}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tests.map((t,i) => (
                          <tr key={t.key} style={{borderBottom:i<tests.length-1?`1px solid ${BD}`:'none'}}>
                            <td style={{padding:'11px 16px',fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.6)'}}>{t.label}</td>
                            {yearResults.map(r => {
                              const val = parseFloat(r[t.key]);
                              if (isNaN(val)) return <td key={r.term} style={{padding:'11px 16px',textAlign:'center',fontSize:12,color:'rgba(255,255,255,0.2)'}}>—</td>;
                              const tier = getTier(t.key as any, val, t.lower);
                              return (
                                <td key={r.term} style={{padding:'11px 16px',textAlign:'center'}}>
                                  <div style={{fontSize:13,fontWeight:800,color:'white'}}>{fmt(t.key,val)}</div>
                                  {tier && <div style={{fontSize:9,fontWeight:700,color:tier.border,marginTop:2}}>{tier.abbr}</div>}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Delta summary */}
              {yearResults.length >= 2 && (
                <div style={CARD}>
                  <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>{yearResults[0].term} → {yearResults[yearResults.length-1].term} Changes</p>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>
                    {tests.map(t => {
                      const v1 = parseFloat(yearResults[0][t.key]);
                      const v2 = parseFloat(yearResults[yearResults.length-1][t.key]);
                      if (isNaN(v1)||isNaN(v2)) return null;
                      const improved = t.lower ? v2<v1 : v2>v1;
                      const pct = Math.abs(((v2-v1)/v1)*100).toFixed(1);
                      return (
                        <div key={t.key} style={{borderRadius:10,border:`1px solid ${improved?'rgba(16,185,129,0.2)':'rgba(248,113,113,0.2)'}`,background:improved?'rgba(16,185,129,0.06)':'rgba(248,113,113,0.06)',padding:'10px 12px'}}>
                          <p style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.4)',marginBottom:4}}>{t.label.split(' ')[0]}</p>
                          <p style={{fontSize:16,fontWeight:900,color:improved?G:'#f87171'}}>{improved?'+':'-'}{pct}%</p>
                          <p style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:2}}>{fmt(t.key,v1)} → {fmt(t.key,v2)}</p>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab==='attendance' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Rate card */}
              <div style={{...CARD,display:'flex',gap:16,alignItems:'center',flexWrap:'wrap'}}>
                <div style={{width:72,height:72,borderRadius:'50%',border:`4px solid ${attRate!==null&&attRate>=80?G:attRate!==null&&attRate>=60?'#fbbf24':'#f87171'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:18,fontWeight:900,color:'white'}}>{attRate!==null?`${attRate}%`:'—'}</span>
                </div>
                <div>
                  <p style={{fontSize:15,fontWeight:800,color:'white',marginBottom:4}}>Overall Attendance</p>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>{attendance.length} sessions · {present} present · {attendance.filter(a=>a.status==='Absent').length} absent</p>
                </div>
                <div style={{marginLeft:'auto',display:'flex',gap:8,flexWrap:'wrap'}}>
                  {['Present','Late','Absent','Excused'].map(s=>(
                    <div key={s} style={{textAlign:'center'}}>
                      <p style={{fontSize:16,fontWeight:900,color:ATT_COL[s]}}>{attendance.filter(a=>a.status===s).length}</p>
                      <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.3)',textTransform:'uppercase'}}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session history */}
              <div style={CARD}>
                <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>Session History</p>
                {attendance.length===0 ? (
                  <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,textAlign:'center',padding:'24px 0'}}>No sessions recorded</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:4,maxHeight:400,overflowY:'auto'}}>
                    {[...attendance].sort((a,b)=>b.session_date.localeCompare(a.session_date)).map((a,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,0.02)',border:`1px solid ${BD}`}}>
                        <div>
                          <p style={{fontSize:12,fontWeight:600,color:'white'}}>{fDate(a.session_date)}</p>
                          {a.session_type && <p style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{a.session_type}</p>}
                        </div>
                        <span style={{fontSize:11,fontWeight:800,padding:'3px 10px',borderRadius:8,background:`${ATT_COL[a.status]||'#94a3b8'}18`,color:ATT_COL[a.status]||'#94a3b8',border:`1px solid ${ATT_COL[a.status]||'#94a3b8'}30`}}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── PROGRESS ── */}
          {tab==='progress' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={{display:'flex',gap:8}}>
                {[new Date().getFullYear()-1, new Date().getFullYear()].map(y=>(
                  <button key={y} onClick={()=>setSelYear(y)} style={{padding:'7px 16px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${selYear===y?`${accent}45`:BD}`,background:selYear===y?`${accent}15`:'rgba(255,255,255,0.03)',color:selYear===y?accent:'rgba(255,255,255,0.4)'}}>{y}</button>
                ))}
              </div>

              {progressData.length < 2 ? (
                <div style={{...CARD,textAlign:'center',padding:'48px'}}><p style={{color:'rgba(255,255,255,0.25)',fontSize:13}}>Need at least 2 terms of data to show progress</p></div>
              ) : (
                tests.map(t => {
                  const data = progressData.filter(r => r && r[t.key] !== undefined) as Row[];
                  if (data.length < 2) return null;
                  const v1 = data[0][t.key], vN = data[data.length-1][t.key];
                  const improved = t.lower ? vN<v1 : vN>v1;
                  return (
                    <div key={t.key} style={CARD}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12,flexWrap:'wrap',gap:6}}>
                        <p style={{fontSize:13,fontWeight:800,color:'white'}}>{t.label}</p>
                        <span style={{fontSize:11,fontWeight:700,color:improved?G:'#f87171'}}>
                          {improved ? '▲ Improving' : '▼ Declining'}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height={120}>
                        <LineChart data={data} margin={{top:4,right:8,left:0,bottom:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
                          <XAxis dataKey="term" tick={{fill:'rgba(255,255,255,0.4)',fontSize:10}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:'rgba(255,255,255,0.4)',fontSize:10}} axisLine={false} tickLine={false} width={36}
                            tickFormatter={v=>fmt(t.key,v)} domain={['auto','auto']} reversed={t.lower}/>
                          <Tooltip contentStyle={{background:'#0d1424',border:`1px solid ${BD}`,borderRadius:8,fontSize:11}}
                            labelStyle={{color:'rgba(255,255,255,0.6)'}} itemStyle={{color:accent}}
                            formatter={(v:any)=>[fmt(t.key,v),t.label]}/>
                          <Line dataKey={t.key} stroke={improved?G:'#f87171'} strokeWidth={2.5}
                            dot={{fill:improved?G:'#f87171',r:4,strokeWidth:0}} activeDot={{r:6,strokeWidth:0}}/>
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab==='notes' && (
            <div style={CARD}>
              <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:10}}>Coach Notes — {student.full_name.split(' ')[0]}</p>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={10}
                placeholder={`Notes about ${student.full_name.split(' ')[0]}...`}
                style={{...inp,resize:'vertical',fontFamily:'system-ui',lineHeight:1.6}}/>
              <button onClick={saveNotes} disabled={savingNotes}
                style={{marginTop:10,width:'100%',padding:'11px',borderRadius:11,border:`1px solid ${G}35`,background:`${G}12`,color:G,fontWeight:800,fontSize:13,cursor:'pointer',opacity:savingNotes?0.6:1}}>
                {savingNotes ? 'Saving…' : notesSaved ? 'Saved ✓' : 'Save Notes'}
              </button>
            </div>
          )}

          {/* ── REPORTS ── */}
          {tab==='reports' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div style={CARD}>
                <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:14}}>AI Athlete Report</p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
                  {['Term 1','Term 2','Term 3','Full Year'].map(t=>(
                    <button key={t} onClick={()=>setAiTerm(t)} style={{padding:'7px 14px',borderRadius:9,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${aiTerm===t?`${accent}45`:BD}`,background:aiTerm===t?`${accent}15`:'rgba(255,255,255,0.03)',color:aiTerm===t?accent:'rgba(255,255,255,0.4)'}}>
                      {t}
                    </button>
                  ))}
                  {[new Date().getFullYear()-1, new Date().getFullYear()].map(y=>(
                    <button key={y} onClick={()=>setSelYear(y)} style={{padding:'7px 14px',borderRadius:9,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${selYear===y?'rgba(251,191,36,0.4)':BD}`,background:selYear===y?'rgba(251,191,36,0.12)':'rgba(255,255,255,0.03)',color:selYear===y?'#fbbf24':'rgba(255,255,255,0.4)'}}>
                      {y}
                    </button>
                  ))}
                </div>
                <button onClick={generateReport} disabled={aiLoading}
                  style={{width:'100%',padding:'12px',borderRadius:11,border:`1px solid ${G}35`,background:`${G}12`,color:G,fontWeight:800,fontSize:13,cursor:'pointer',opacity:aiLoading?0.6:1,marginBottom:14}}>
                  {aiLoading ? 'Generating…' : 'Generate Report'}
                </button>
                {aiText && (
                  <div style={{borderRadius:12,border:'1px solid rgba(16,185,129,0.2)',background:'rgba(16,185,129,0.06)',padding:16}}>
                    <p style={{fontSize:13,lineHeight:1.75,color:'rgba(255,255,255,0.82)'}}>{aiText}</p>
                  </div>
                )}
              </div>
              <Link href={`/hp-print/student/${id}`} target="_blank"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'13px',borderRadius:12,border:`1px solid ${BD}`,background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.5)',textDecoration:'none',fontSize:13,fontWeight:700}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:15,height:15}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download Print Report
              </Link>
            </div>
          )}

          {/* ── INTERVENTIONS ── */}
          {tab==='interventions' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Add flag */}
              <div style={CARD}>
                <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>Add Intervention Flag</p>
                <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                  {[
                    {key:'attention',   label:'Needs Attention', col:'#fbbf24'},
                    {key:'injury',      label:'Injury',          col:'#f87171'},
                    {key:'attendance',  label:'Attendance',      col:'#fb923c'},
                    {key:'performance', label:'Performance',     col:'#a78bfa'},
                    {key:'positive',    label:'Positive',        col:'#10b981'},
                  ].map(f=>(
                    <button key={f.key} onClick={()=>setFlagType(f.key)} style={{padding:'6px 12px',borderRadius:9,fontSize:11,fontWeight:700,cursor:'pointer',border:`1px solid ${flagType===f.key?`${f.col}50`:BD}`,background:flagType===f.key?`${f.col}15`:'rgba(255,255,255,0.03)',color:flagType===f.key?f.col:'rgba(255,255,255,0.4)'}}>
                      {f.label}
                    </button>
                  ))}
                </div>
                <textarea value={flagNote} onChange={e=>setFlagNote(e.target.value)} rows={3}
                  placeholder="Describe the intervention or note..."
                  style={{...inp,resize:'none',marginBottom:10,fontFamily:'system-ui'}}/>
                <button onClick={addFlag} disabled={savingFlag||!flagNote.trim()}
                  style={{width:'100%',padding:'11px',borderRadius:11,border:'1px solid rgba(251,191,36,0.3)',background:'rgba(251,191,36,0.1)',color:'#fbbf24',fontWeight:800,fontSize:13,cursor:'pointer',opacity:!flagNote.trim()?0.4:1}}>
                  {savingFlag ? 'Saving…' : 'Add Flag'}
                </button>
              </div>

              {/* Existing flags */}
              <div style={CARD}>
                <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.15em',marginBottom:12}}>Intervention History</p>
                {flags.length===0 ? (
                  <p style={{color:'rgba(255,255,255,0.25)',fontSize:13,textAlign:'center',padding:'24px 0'}}>No flags recorded</p>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[...flags].reverse().map((f,i)=>{
                      const cols: Record<string,string> = {attention:'#fbbf24',injury:'#f87171',attendance:'#fb923c',performance:'#a78bfa',positive:'#10b981'};
                      const col = cols[f.type]||'#94a3b8';
                      return (
                        <div key={i} style={{borderRadius:10,border:`1px solid ${col}25`,background:`${col}08`,padding:'12px 14px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                            <span style={{fontSize:10,fontWeight:800,color:col,textTransform:'uppercase',letterSpacing:'0.1em'}}>{f.type}</span>
                            <span style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{f.date}</span>
                          </div>
                          <p style={{fontSize:13,color:'rgba(255,255,255,0.75)',lineHeight:1.5}}>{f.note}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
