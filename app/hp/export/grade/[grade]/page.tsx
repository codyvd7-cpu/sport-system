'use client';
import * as React from 'react';
import { GRADE8_TESTS, GRADE9_TESTS, BENCHMARKS as BENCH, TIERS, getTier, fmtValue, HP_CLASSES, getCurrentTerm, getTests, TERM_ORDER } from '@/lib/hpTests';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ grade: string }> };






function fmt(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'||key==='pushup_hold'){
    if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}
    return`${Math.round(val)}s`;
  }
  return val%1===0?String(val):val.toFixed(2);
}

const TERM_ORDER = ['Term 1','Term 2','Term 3','Term 4'];

export default function GradeExport({ params }: PageProps) {
  const { grade: gradeNum } = React.use(params);
  const grade = gradeNum === '8' ? 'Grade 8' : 'Grade 9';
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results,  setResults]  = React.useState<Row[]>([]);
  const [att,      setAtt]      = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [term,     setTerm]     = React.useState('');
  const year = new Date().getFullYear();
  const now  = new Date().toLocaleString('en-ZA',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

  React.useEffect(() => {
    fetch(`/api/hp/data?type=trends&year=${year}`, { credentials:'include' })
      .then(r => r.json())
      .then(d => {
        const gs = (d.students||[]).filter((s:Row)=>s.grade===grade)
          .sort((a:Row,b:Row)=>{
            const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
            const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
            if(sA!==sB)return sA.localeCompare(sB);
            return(a.class_group||'').localeCompare(b.class_group||'');
          });
        const yearResults=(d.tests||[]).filter((r:Row)=>r.year===year);
        const allTerms=[...new Set(yearResults.map((r:Row)=>r.term as string))] as string[];
        const latestTerm=allTerms.sort((a,b)=>TERM_ORDER.indexOf(b)-TERM_ORDER.indexOf(a))[0]||'';
        setStudents(gs);
        setResults(yearResults);
        setAtt(d.attendance||[]);
        setTerm(latestTerm);
        setLoading(false);
      });
  }, [grade, year]);

  React.useEffect(() => {
    if(!loading && students.length>0) setTimeout(()=>window.print(),600);
  },[loading,students]);

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,sans-serif',color:'#64748b',fontSize:14}}>
      Preparing report…
    </div>
  );

  const tests = grade==='Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  function latestResult(studentId:string){
    const sr=results.filter(r=>r.student_id===studentId)
      .sort((a,b)=>TERM_ORDER.indexOf(b.term)-TERM_ORDER.indexOf(a.term));
    return sr[0]||null;
  }

  const classes = HP_CLASSES.filter(c=>students.some(s=>s.class_group===c));
  const tested  = students.filter(s=>latestResult(s.id)).length;

  // Attendance rate
  const attRate = (() => {
    if(!att.length) return null;
    const gradeIds = new Set(students.map(s=>s.id));
    const gradeAtt = att.filter(a=>gradeIds.has(a.student_id));
    if(!gradeAtt.length) return null;
    const present = gradeAtt.filter(a=>a.status==='Present'||a.status==='Late').length;
    return Math.round((present/gradeAtt.length)*100);
  })();

  // Class averages
  const classAvgs = (cls:string) => {
    const cs = students.filter(s=>s.class_group===cls);
    return tests.map(t=>{
      const vals = cs.map(s=>{const r=latestResult(s.id);const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
      return{key:t.key,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,count:vals.length};
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:9.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        @page{size:A4 portrait;margin:12mm 12mm 12mm 12mm;}
        @media print{.no-print{display:none!important;} .page-break{page-break-before:always;}}
        .page{padding:0;}

        /* Header */
        .hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:14px;}
        .hdr-brand{display:flex;align-items:center;gap:12px;}
        .hdr-brand img{width:44px;height:44px;object-fit:contain;}
        .hdr-name{font-size:13px;font-weight:900;color:#0f172a;letter-spacing:0.02em;}
        .hdr-dept{font-size:9px;font-weight:600;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;}
        .hdr-right{text-align:right;}
        .hdr-term{font-size:11px;font-weight:800;color:#0f172a;}
        .hdr-att{font-size:9px;color:#059669;font-weight:700;margin-top:2px;}
        .title-block{margin-bottom:14px;padding-bottom:12px;border-bottom:1.5px solid #e2e8f0;}
        .title-main{font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;line-height:1;}
        .title-sub{font-size:12px;font-weight:700;color:#0284c7;margin-top:4px;}
        .title-gen{font-size:8px;color:#94a3b8;margin-top:6px;text-align:right;}

        /* Summary */
        .summary-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;}
        .sc{border:1.5px solid #e2e8f0;border-radius:8px;padding:10px 8px;text-align:center;}
        .sc-icon{width:28px;height:28px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;border-radius:6px;}
        .sc-val{font-size:20px;font-weight:900;line-height:1;}
        .sc-lbl{font-size:7.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-top:3px;}

        /* Section */
        .section{margin-bottom:18px;}
        .section-hdr{margin-bottom:8px;}
        .section-title{font-size:13px;font-weight:900;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;}
        .section-meta{font-size:8.5px;color:#64748b;margin-top:2px;}

        /* Table */
        table{width:100%;border-collapse:collapse;font-size:8.5px;}
        thead tr{background:#0d1424;}
        thead th{color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:7px 8px;text-align:center;font-size:7.5px;}
        thead th.left{text-align:left;}
        tbody td{padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle;color:#0f172a;}
        tbody td.left{text-align:left;font-weight:700;}
        tbody td.grp{color:#64748b;font-weight:600;}
        tbody tr:hover td{background:#f8fafc;}
        .avg-row td{background:#eff6ff!important;font-weight:800;border-top:1.5px solid #bfdbfe;border-bottom:1.5px solid #bfdbfe;}
        .badge{font-size:7px;font-weight:800;padding:2px 5px;border-radius:20px;display:inline-block;letter-spacing:0.04em;}
        .val-text{font-weight:700;}

        /* Perf key */
        .perf-key{display:flex;align-items:center;gap:16px;margin-top:14px;padding-top:10px;border-top:1px solid #e2e8f0;}
        .perf-key-title{font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;margin-right:4px;}
        .perf-key-item{display:flex;align-items:center;gap:4px;font-size:8px;color:#0f172a;font-weight:600;}

        /* Footer */
        .footer{display:flex;justify-content:space-between;margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:7.5px;color:#94a3b8;}
        .print-btn{position:fixed;bottom:20px;right:20px;background:#0d1424;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);}
      `}</style>

      <div className="page">

        {/* ── HEADER ── */}
        <div className="hdr">
          <div className="hdr-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/st-benedicts-logo.png" alt="SBC"/>
            <div>
              <div className="hdr-name">ST BENEDICT&apos;S COLLEGE</div>
              <div className="hdr-dept">High Performance Department</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="hdr-term">{term||`Year ${year}`} · {year}</div>
            {attRate!==null && <div className="hdr-att">{attRate}% average attendance</div>}
          </div>
        </div>

        {/* ── TITLE ── */}
        <div className="title-block">
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between'}}>
            <div>
              <div className="title-main">HIGH PERFORMANCE REPORT</div>
              <div className="title-sub">{grade} Testing Summary</div>
            </div>
            <div className="title-gen">Generated:<br/>{now}</div>
          </div>
        </div>

        {/* ── SUMMARY ── */}
        <div style={{marginBottom:6,fontSize:9,fontWeight:900,textTransform:'uppercase',letterSpacing:'0.1em',color:'#64748b'}}>Summary</div>
        <div className="summary-grid">
          {[
            { val:students.length, lbl:'Athletes',  color:'#0284c7', bg:'#eff6ff',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth={1.8} style={{width:16,height:16}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
            { val:tested,           lbl:'Tested',    color:'#059669', bg:'#ecfdf5',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={1.8} style={{width:16,height:16}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
            { val:students.length-tested, lbl:'Untested', color:'#f97316', bg:'#fff7ed',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={1.8} style={{width:16,height:16}}><circle cx="12" cy="8" r="4"/><path d="M16 16H8a4 4 0 0 0-4 4"/></svg> },
            { val:classes.length,   lbl:'Classes',   color:'#7c3aed', bg:'#f5f3ff',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth={1.8} style={{width:16,height:16}}><path d="M3 22V7l9-5 9 5v15"/><path d="M9 22V12h6v10"/></svg> },
            { val:year,             lbl:'Year',      color:'#0f172a', bg:'#f8fafc',
              icon:<svg viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth={1.8} style={{width:16,height:16}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg> },
          ].map(s=>(
            <div key={s.lbl} className="sc">
              <div className="sc-icon" style={{background:s.bg}}>{s.icon}</div>
              <div className="sc-val" style={{color:s.color}}>{s.val}</div>
              <div className="sc-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* ── PER CLASS TABLES ── */}
        {classes.map((cls, clsIdx) => {
          const classStudents = students.filter(s=>s.class_group===cls);
          const avgs = classAvgs(cls);
          const classTested = classStudents.filter(s=>latestResult(s.id)).length;

          return (
            <div key={cls} className={`section ${clsIdx>0?'page-break':''}`}>
              <div className="section-hdr">
                <div className="section-title">{grade} — Class {gradeNum}{cls}</div>
                <div className="section-meta">{classStudents.length} athletes · {classTested} tested</div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th className="left" style={{width:100}}>Athlete</th>
                    <th style={{width:35}}>GRP</th>
                    {tests.map(t=><th key={t.key}>{t.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(s=>{
                    const r = latestResult(s.id);
                    const surname = s.full_name.trim().split(' ').pop()||s.full_name;
                    return (
                      <tr key={s.id}>
                        <td className="left">{surname}</td>
                        <td className="grp">{s.training_group?`G${s.training_group}`:'—'}</td>
                        {tests.map(t=>{
                          if(!r) return <td key={t.key} style={{color:'#cbd5e1',fontWeight:500}}>—</td>;
                          const v = parseFloat(r[t.key]);
                          if(isNaN(v)) return <td key={t.key} style={{color:'#cbd5e1',fontWeight:500}}>—</td>;
                          const tier = getTier(t.key,v,t.lower);
                          return (
                            <td key={t.key}>
                              <span className="val-text" style={{color:tier.bg==='#ccfbf1'?'#0f766e':tier.bg}}>
                                {fmt(t.key,v)}{t.unit}
                              </span>
                              {' '}
                              <span className="badge" style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>
                                {tier.abbr}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {/* Class average row */}
                  <tr className="avg-row">
                    <td className="left" style={{color:'#1e40af'}}>Class Avg</td>
                    <td style={{color:'#94a3b8'}}>—</td>
                    {avgs.map(a=>{
                      if(!a.avg) return <td key={a.key} style={{color:'#94a3b8'}}>—</td>;
                      const t = tests.find(x=>x.key===a.key)!;
                      const tier = getTier(a.key,a.avg,t.lower);
                      return (
                        <td key={a.key} style={{color:tier.bg==='#ccfbf1'?'#0f766e':tier.bg}}>
                          {fmt(a.key,a.avg)}{t.unit}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        {/* ── PERFORMANCE KEY ── */}
        <div className="perf-key">
          <div className="perf-key-title">Performance Key</div>
          {TIERS.map(t=>(
            <div key={t.abbr} className="perf-key-item">
              <span className="badge" style={{background:t.bg,color:t.color,border:`1px solid ${t.border}`}}>{t.abbr}</span>
              {t.label}
            </div>
          ))}
        </div>

        {/* ── FOOTER ── */}
        <div className="footer">
          <span>Generated by Altus Performance</span>
          <span>St Benedict&apos;s College — Confidential · Coach Use Only</span>
          <span>{new Date().toLocaleDateString('en-ZA')}</span>
        </div>
      </div>

      <button className="print-btn no-print" onClick={()=>window.print()}>
        ↓ Download PDF
      </button>
    </>
  );
}
