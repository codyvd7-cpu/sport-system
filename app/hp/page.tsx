'use client';
import * as React from 'react';
import Link from 'next/link';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { getCalendarTerm, getCurrentYear } from '@/lib/hpTerm';

type Row = Record<string, any>;

const G = '#10b981';
const BORDER = 'rgba(255,255,255,0.07)';
const CARD = 'rgba(255,255,255,0.03)';

const CLASSES = [
  { id:'8B', grade:'Grade 8', cls:'B' },{ id:'8E', grade:'Grade 8', cls:'E' },
  { id:'8F', grade:'Grade 8', cls:'F' },{ id:'8J', grade:'Grade 8', cls:'J' },
  { id:'8M', grade:'Grade 8', cls:'M' },{ id:'9B', grade:'Grade 9', cls:'B' },
  { id:'9E', grade:'Grade 9', cls:'E' },{ id:'9F', grade:'Grade 9', cls:'F' },
  { id:'9J', grade:'Grade 9', cls:'J' },{ id:'9M', grade:'Grade 9', cls:'M' },
];

const ACTIONS = [
  { href:'/hp/attendance', label:'Take Register',  sub:'Mark class attendance',    color:G,         iconD:'M9 11l3 3L22 4 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11' },
  { href:'/hp/testing',    label:'Enter Tests',    sub:'Record fitness scores',    color:'#a78bfa',  iconD:'M22 12h-4l-3 9L9 3l-3 9H2' },
  { href:'/hp/students',   label:'All Students',   sub:'Browse full roster',       color:'#38bdf8',  iconD:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
  { href:'/hp/trends',     label:'Trends',         sub:'Performance over time',    color:'#f59e0b',  iconD:'M23 6L13.5 15.5 8.5 10.5 1 18 M17 6h6v6' },
];

function Icon({ d, size=18, color='currentColor' }: { d: string; size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width:size, height:size, flexShrink:0 }}>
      {d.split(' M').map((seg, i) => <path key={i} d={i===0 ? seg : 'M'+seg}/>)}
    </svg>
  );
}

export default function HPDashboard() {
  const [students, setStudents] = React.useState<Row[]>([]);
  const [tests,    setTests]    = React.useState<Row[]>([]);
  const [attendance, setAtt]   = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const term = getCalendarTerm();
  const year = getCurrentYear();

  React.useEffect(() => {
    fetch(`/api/hp/data?type=dashboard&year=${year}`, { credentials:'include' })
      .then(r => r.json()).then(d => {
        setStudents(d.students||[]); setTests(d.tests||[]); setAtt(d.attendance||[]);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [year]);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#060c1a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
      <div style={{ width:28, height:28, borderRadius:'50%', border:'3px solid #10b981', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>Loading...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const testedIds     = new Set(tests.filter(r => r.term===term).map(r => r.student_id));
  const totalStudents = students.length;
  const totalTested   = testedIds.size;
  const totalUntested = totalStudents - totalTested;
  const overallAtt    = (() => {
    if (!attendance.length) return null;
    const present = attendance.filter(a => a.status==='Present').length;
    return Math.round((present/attendance.length)*100);
  })();

  const classStats = CLASSES.map(c => {
    const cs    = students.filter(s => s.grade===c.grade && s.class_group===c.cls);
    const total = cs.length; if (!total) return null;
    const tested = cs.filter(s => testedIds.has(s.id)).length;
    const pct    = Math.round((tested/total)*100);
    const classAtt = attendance.filter(a => cs.some(s => s.id===a.student_id));
    const dates  = [...new Set(classAtt.map(a => a.session_date))].slice(0,8);
    const present = classAtt.filter(a => dates.includes(a.session_date) && a.status==='Present').length;
    const possible = dates.length * total;
    const attRate = possible>0 ? Math.round((present/possible)*100) : null;
    return {...c, total, tested, pct, attRate};
  }).filter(Boolean) as any[];

  const grade8  = classStats.filter(c => c.grade==='Grade 8');
  const grade9  = classStats.filter(c => c.grade==='Grade 9');
  const allDone8 = grade8.every(c => c.pct===100);
  const allDone9 = grade9.every(c => c.pct===100);

  const STATS = [
    { label:'ENROLLED',  sub:'All students',    val:totalStudents, color:'#38bdf8', bg:'rgba(56,189,248,0.12)',  href:'/hp/students',             iconD:'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 3a4 4 0 0 1 0 8 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    { label:'TESTED',    sub:'This term',        val:totalTested,   color:G,         bg:'rgba(16,185,129,0.12)', href:'/hp/students?tested=true',  iconD:'M22 12h-4l-3 9L9 3l-3 9H2' },
    { label:'REMAINING', sub:'To be tested',     val:totalUntested, color:totalUntested>0?'#f59e0b':'rgba(255,255,255,0.15)', bg:totalUntested>0?'rgba(245,158,11,0.12)':'rgba(255,255,255,0.04)', href:'/hp/students?tested=false', iconD:'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4l3 3' },
  ];

  return (
    <main style={{ minHeight:'100vh', background:'#060c1a', color:'white' }} className="pt-14 pb-20 lg:pt-0 lg:pb-10">
      <style>{`
        .hp-heading { font-size:34px; }
        .hp-stat-num { font-size:28px; }
        .hp-stat-icon { width:46px; height:46px; border-radius:12px; }
        .hp-stat-icon-sz { width:22px; height:22px; }
        .hp-action-sub { display:block; }
        .hp-action-arrow { display:flex; }
        .hp-action-label { font-size:12px; }
        @media(max-width:640px) {
          .hp-heading { font-size:24px !important; }
          .hp-stat-num { font-size:22px !important; }
          .hp-stat-icon { width:38px !important; height:38px !important; border-radius:10px !important; }
          .hp-stat-icon-sz { width:18px !important; height:18px !important; }
          .hp-action-sub { display:none !important; }
          .hp-action-arrow { display:none !important; }
          .hp-action-label { font-size:11px !important; }
        }
      `}</style>


      {/* ── TOP BAR ── */}
      <header className="hidden lg:flex" style={{ borderBottom:`1px solid ${BORDER}`, background:'rgba(6,12,26,0.95)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:30, height:56, alignItems:'center', justifyContent:'space-between', padding:'0 28px' }}>
        <div/>{/* spacer */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:7, fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.55)', padding:'7px 14px', borderRadius:20, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.04)', textDecoration:'none' }}>
            <Icon d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" size={13}/>
            Departments
          </Link>
          <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.05)', border:`1px solid ${BORDER}`, borderRadius:24, padding:'4px 14px 4px 4px' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:`linear-gradient(135deg,#065f46,${G})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'white', flexShrink:0 }}>HP</div>
            <span style={{ fontSize:13, fontWeight:600, color:'white' }}>HP Admin</span>
          </div>
        </div>
      </header>

      <div className="px-4 py-5 lg:px-7 lg:py-7" style={{ maxWidth:1200 }}>

        {/* ── HEADER ── */}
        <FadeUp delay={0}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:8 }}>
            <div>
              <p style={{ fontSize:11, fontWeight:600, color:`${G}99`, letterSpacing:'0.1em', marginBottom:4 }}>Welcome back</p>
              <h1 className="hp-heading" style={{ fontWeight:900, color:'white', lineHeight:1, letterSpacing:'-0.02em' }}>
                High <span style={{ background:`linear-gradient(135deg,${G},#38bdf8)`, WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>Performance</span>
              </h1>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.4)' }}>{term} · {year}</p>
              {overallAtt!==null && (
                <p style={{ fontSize:11, marginTop:3, fontWeight:700, color:overallAtt>=80?G:overallAtt>=60?'#fbbf24':'#f87171' }}>
                  {overallAtt}% avg attendance
                </p>
              )}
            </div>
          </div>
        </FadeUp>

        {/* ── STAT CARDS ── */}
        <FadeUp delay={60}>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {STATS.map(s => (
              <HoverCard key={s.label}>
                <Link href={s.href} style={{ display:'flex', alignItems:'center', gap:8, padding:'12px 10px', borderRadius:14, background:CARD, border:`1px solid ${BORDER}`, textDecoration:'none', position:'relative', overflow:'hidden' }}>
                  <div className="hp-stat-icon" style={{ background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <span className="hp-stat-icon-sz" style={{display:'flex',alignItems:'center',justifyContent:'center'}}><Icon d={s.iconD} size={22} color={s.color}/></span>
                  </div>
                  <div>
                    <CountUp value={s.val} className="hp-stat-num" style={{ fontWeight:900, color:s.color, lineHeight:1, display:'block' }}/>
                    <p style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.4)', letterSpacing:'0.12em', marginTop:4 }}>{s.label}</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:1 }}>{s.sub}</p>
                  </div>
                </Link>
              </HoverCard>
            ))}
          </div>
        </FadeUp>

        {/* ── QUICK ACTIONS ── */}
        <FadeUp delay={100}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-6">
            {ACTIONS.map(a => (
              <HoverCard key={a.href}>
                <Link href={a.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 14px', borderRadius:14, background:CARD, border:`1px solid ${BORDER}`, textDecoration:'none', position:'relative', overflow:'hidden' }}>
                  <div style={{ width:38, height:38, borderRadius:10, background:`${a.color}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon d={a.iconD} size={17} color={a.color}/>
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p className="hp-action-label" style={{ fontWeight:800, color:'white', marginBottom:1 }}>{a.label}</p>
                    <p className="hp-action-sub" style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{a.sub}</p>
                  </div>
                  <span className="hp-action-arrow"><Icon d="M9 18l6-6-6-6" size={13} color="rgba(255,255,255,0.2)"/></span>
                </Link>
              </HoverCard>
            ))}
          </div>
        </FadeUp>

        {/* ── GRADE 8 ── */}
        <FadeUp delay={140}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:4, height:24, borderRadius:2, background:'rgba(56,189,248,0.6)' }}/>
              <div>
                <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.2em', color:'#38bdf8', textTransform:'uppercase' }}>Grade 8</p>
                {allDone8 && <p style={{ fontSize:10, color:`${G}99`, marginTop:1 }}>All classes tested ✓</p>}
              </div>
            </div>
            <a href="/hp-print/grade/8" target="_blank"
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', padding:'7px 14px', borderRadius:10, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.03)', textDecoration:'none' }}>
              <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5" size={13}/>
              Export
            </a>
          </div>
          <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" stagger={30}>
            {grade8.map((c: any) => (
              <StaggerItem key={c.id}><ClassCard c={c} accent="#38bdf8"/></StaggerItem>
            ))}
          </StaggerList>
        </FadeUp>

        {/* ── GRADE 9 ── */}
        <FadeUp delay={180}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, marginTop:28 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:4, height:24, borderRadius:2, background:'rgba(167,139,250,0.6)' }}/>
              <div>
                <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.2em', color:'#a78bfa', textTransform:'uppercase' }}>Grade 9</p>
                {allDone9 && <p style={{ fontSize:10, color:`${G}99`, marginTop:1 }}>All classes tested ✓</p>}
              </div>
            </div>
            <a href="/hp-print/grade/9" target="_blank"
              style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.35)', padding:'7px 14px', borderRadius:10, border:`1px solid ${BORDER}`, background:'rgba(255,255,255,0.03)', textDecoration:'none' }}>
              <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5" size={13}/>
              Export
            </a>
          </div>
          <StaggerList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" stagger={30}>
            {grade9.map((c: any) => (
              <StaggerItem key={c.id}><ClassCard c={c} accent="#a78bfa"/></StaggerItem>
            ))}
          </StaggerList>
        </FadeUp>

      </div>
    </main>
  );
}

function ClassCard({ c, accent }: { c: any; accent: string }) {
  const done = c.pct === 100;
  const none = c.tested === 0;
  const BORDER = 'rgba(255,255,255,0.07)';

  return (
    <HoverCard>
      <Link href={`/hp/class/${c.id}`}
        style={{ display:'block', borderRadius:16, background:'rgba(255,255,255,0.025)', border:`1px solid ${BORDER}`, textDecoration:'none', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${accent}60,transparent)`, opacity:0 }} className="card-top-line"/>
        <div style={{ padding:'16px' }}>
          {/* Class ID */}
          <p style={{ fontSize:30, fontWeight:900, color:accent, lineHeight:1, letterSpacing:'-0.01em', marginBottom:4 }}>{c.id}</p>
          <p style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:12 }}>{c.total} students</p>

          {/* Progress bar */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.1em', color:'rgba(255,255,255,0.25)', textTransform:'uppercase' }}>Tested</span>
              <span style={{ fontSize:10, fontWeight:900, color:done?G:accent }}>{c.pct}%</span>
            </div>
            <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,0.07)', overflow:'hidden' }}>
              <div style={{ height:'100%', borderRadius:2, width:`${c.pct}%`, background:done?G:accent, transition:'width 0.7s ease' }}/>
            </div>
          </div>

          {/* Status */}
          <div style={{ marginBottom:8 }}>
            {done ? (
              <span style={{ fontSize:10, fontWeight:800, color:G }}>All tested ✓</span>
            ) : none ? (
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>Not started</span>
            ) : (
              <span style={{ fontSize:10, fontWeight:700, color:'#fbbf24' }}>{c.total-c.tested} remaining</span>
            )}
          </div>

          {/* Attendance */}
          {c.attRate!==null && (
            <p style={{ fontSize:10, marginBottom:12 }}>
              <span style={{ color:'rgba(255,255,255,0.3)' }}>Att </span>
              <span style={{ fontWeight:800, color:c.attRate>=80?G:c.attRate>=60?'#fbbf24':'#f87171' }}>{c.attRate}%</span>
            </p>
          )}

          {/* Quick actions */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
            {[
              { href:`/hp/class/${c.id}?tab=attendance`, label:'Reg',  color:G },
              { href:`/hp/class/${c.id}?tab=testing`,    label:'Test', color:'#a78bfa' },
              { href:`/hp-print/class/${c.id}`,          label:'PDF',  color:'rgba(255,255,255,0.4)', external:true },
            ].map(btn => btn.external ? (
              <a key={btn.label} href={btn.href} target="_blank" onClick={e => e.stopPropagation()}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 4px', borderRadius:8, fontSize:9, fontWeight:800, color:btn.color, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)', textDecoration:'none' }}>
                {btn.label}
              </a>
            ) : (
              <Link key={btn.label} href={btn.href} onClick={e => e.stopPropagation()}
                style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 4px', borderRadius:8, fontSize:9, fontWeight:800, color:btn.color, background:`${btn.color}12`, border:`1px solid ${btn.color}25`, textDecoration:'none' }}>
                {btn.label}
              </Link>
            ))}
          </div>
        </div>
      </Link>
    </HoverCard>
  );
}
