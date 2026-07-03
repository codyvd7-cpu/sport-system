'use client';
import * as React from 'react';
import { GRADE8_TESTS, GRADE9_TESTS, BENCHMARKS as BENCH, TIERS, getTier, fmtValue, parseTestValue, getTests } from '@/lib/hpTests';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ classId: string }> };

function fmt(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'){if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}return`${Math.round(val)}s`;}
  return val%1===0?String(val):val.toFixed(2);
}
const TERM_ORDER=['Term 1','Term 2','Term 3','Term 4'];

export default function ClassExport({ params }: PageProps) {
  const { classId } = React.use(params);
  const grade = classId[0]==='8'?'Grade 8':'Grade 9';
  const gradeNum = classId[0];

  const [students, setStudents] = React.useState<Row[]>([]);
  const [results,  setResults]  = React.useState<Row[]>([]);
  const [att,      setAtt]      = React.useState<Row[]>([]);
  const [aiReport, setAiReport] = React.useState('');
  const [aiLoading,setAiLoading]= React.useState(true);
  const [loading,  setLoading]  = React.useState(true);
  const year = new Date().getFullYear();
  const now  = new Date().toLocaleString('en-ZA',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'});

  React.useEffect(() => {
    fetch(`/api/hp/data?type=class&id=${classId}&year=${year}`, { credentials:'include' })
      .then(r=>r.json())
      .then(d=>{
        const sorted=(d.students||[]).sort((a:Row,b:Row)=>{
          const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
          const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
          return sA.localeCompare(sB);
        });
        setStudents(sorted);
        setResults(d.tests||[]);
        setAtt(d.attendance||[]);
        setLoading(false);
      });
  },[classId, year]);

  // Generate AI report once data loaded
  React.useEffect(()=>{
    if(loading||students.length===0) return;
    const tests=grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;

    function latest(sid:string){
      const sr=results.filter(r=>r.student_id===sid)
        .sort((a,b)=>TERM_ORDER.indexOf(b.term)-TERM_ORDER.indexOf(a.term));
      return sr[0]||null;
    }

    const avgsData=tests.map(t=>{
      const vals=students.map(s=>{const r=latest(s.id);const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
      const avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
      const tier=avg!==null?getTier(t.key,avg,t.lower).label:'';
      return{key:t.key,avg,count:vals.length,tier};
    });

    const studentsData=students.map(s=>{
      const r=latest(s.id);
      return{
        surname:s.full_name.trim().split(' ').pop()||s.full_name,
        training_group:s.training_group,
        result:r||null,
      };
    });

    fetch('/api/hp/ai-report',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({classId,grade,tests,students:studentsData,avgs:avgsData}),
    }).then(r=>r.json())
      .then(d=>{
        if(d.report) setAiReport(d.report);
        else setAiReport(d.error||'Report unavailable.');
        setAiLoading(false);
      })
      .catch((err)=>{ setAiReport(`Connection error: ${err.message}`); setAiLoading(false); });
  },[loading,students,results,classId,grade]);

  // Print once both data and AI report ready
  React.useEffect(()=>{
    if(!loading&&!aiLoading&&students.length>0) setTimeout(()=>window.print(),800);
  },[loading,aiLoading,students]);

  if(loading||aiLoading) return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Inter,sans-serif',gap:12}}>
      <div style={{width:28,height:28,borderRadius:'50%',border:'3px solid #0284c7',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <p style={{color:'#64748b',fontSize:13}}>{loading?'Loading class data…':'Generating AI report…'}</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const tests=grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;
  function latest(sid:string){
    const sr=results.filter(r=>r.student_id===sid)
      .sort((a,b)=>TERM_ORDER.indexOf(b.term)-TERM_ORDER.indexOf(a.term));
    return sr[0]||null;
  }
  const tested=students.filter(s=>latest(s.id)).length;
  const avgs=tests.map(t=>{
    const vals=students.map(s=>{const r=latest(s.id);const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
    return{key:t.key,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,count:vals.length};
  });
  const attRate=(()=>{
    if(!att.length)return null;
    const ids=new Set(students.map(s=>s.id));
    const ga=att.filter(a=>ids.has(a.student_id));
    if(!ga.length)return null;
    return Math.round((ga.filter(a=>a.status==='Present'||a.status==='Late').length/ga.length)*100);
  })();

  // Format AI report into sections
  const aiSections=aiReport.split('\n').reduce((acc:string[][],line:string)=>{
    const trimmed=line.trim();
    if(!trimmed)return acc;
    if(trimmed===trimmed.toUpperCase()&&trimmed.length>3&&!trimmed.match(/^\d/)){
      acc.push([trimmed]);
    } else if(acc.length>0){
      acc[acc.length-1].push(trimmed);
    }
    return acc;
  },[]);

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:9.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        @page{size:A4 portrait;margin:12mm;}
        @media print{.no-print{display:none!important;}}
        .hdr{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px;}
        .hdr-brand{display:flex;align-items:center;gap:11px;}
        .hdr-brand img{width:42px;height:42px;object-fit:contain;}
        .hdr-name{font-size:13px;font-weight:900;color:#0f172a;letter-spacing:0.01em;}
        .hdr-dept{font-size:8.5px;font-weight:600;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;margin-top:2px;}
        .hdr-right{text-align:right;}
        .hdr-cls{font-size:22px;font-weight:900;color:#0f172a;letter-spacing:-0.02em;line-height:1;}
        .hdr-term{font-size:9px;color:#64748b;margin-top:2px;}
        .title-block{padding-bottom:10px;border-bottom:1.5px solid #e2e8f0;margin-bottom:12px;}
        .title-main{font-size:18px;font-weight:900;color:#0f172a;letter-spacing:-0.01em;}
        .title-sub{font-size:11px;font-weight:700;color:#0284c7;margin-top:3px;}
        .title-row{display:flex;align-items:flex-end;justify-content:space-between;}
        .gen{font-size:8px;color:#94a3b8;text-align:right;}
        .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:14px;}
        .sc{border:1.5px solid #e2e8f0;border-radius:8px;padding:9px 8px;text-align:center;}
        .sc-val{font-size:18px;font-weight:900;line-height:1;}
        .sc-lbl{font-size:7px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-top:3px;}
        .ai-box{background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:12px 14px;margin-bottom:14px;}
        .ai-header{display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #bae6fd;}
        .ai-logo{width:20px;height:20px;background:#0284c7;border-radius:5px;display:flex;align-items:center;justify-content:center;}
        .ai-title{font-size:9px;font-weight:900;color:#0284c7;text-transform:uppercase;letter-spacing:0.12em;}
        .ai-badge{font-size:7px;font-weight:700;color:#0369a1;background:#e0f2fe;border:1px solid #bae6fd;border-radius:20px;padding:1px 6px;margin-left:auto;}
        .ai-sections{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;}
        .ai-section-title{font-size:8px;font-weight:900;color:#0369a1;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;}
        .ai-section-body{font-size:8.5px;color:#1e3a5f;line-height:1.55;}
        table{width:100%;border-collapse:collapse;}
        thead tr{background:#0d1424;}
        thead th{color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;padding:6px 8px;text-align:center;font-size:7.5px;}
        thead th.left{text-align:left;}
        tbody td{padding:5px 8px;border-bottom:1px solid #f1f5f9;text-align:center;vertical-align:middle;}
        tbody td.left{text-align:left;font-weight:700;}
        tbody td.grp{color:#64748b;font-weight:600;}
        .avg-row td{background:#eff6ff!important;font-weight:800;border-top:1.5px solid #bfdbfe;}
        .badge{font-size:7px;font-weight:800;padding:2px 5px;border-radius:20px;display:inline-block;letter-spacing:0.04em;}
        .val-t{font-weight:700;}
        .perf-key{display:flex;align-items:center;gap:14px;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;}
        .pk-title{font-size:7.5px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#64748b;}
        .pk-item{display:flex;align-items:center;gap:3px;font-size:8px;font-weight:600;color:#0f172a;}
        .footer{display:flex;justify-content:space-between;margin-top:10px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:7.5px;color:#94a3b8;}
        .print-btn{position:fixed;bottom:20px;right:20px;background:#0d1424;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 16px rgba(0,0,0,0.2);}
        .section-title-only{font-size:8.5px;color:#1e3a5f;line-height:1.55;font-style:italic;}
      `}</style>

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
          <div className="hdr-cls">{classId}</div>
          <div className="hdr-term">{grade} · {year}</div>
        </div>
      </div>

      {/* ── TITLE ── */}
      <div className="title-block">
        <div className="title-row">
          <div>
            <div className="title-main">CLASS PERFORMANCE REPORT</div>
            <div className="title-sub">{grade} · Class {classId} · {year}</div>
          </div>
          <div className="gen">Generated:<br/>{now}</div>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="stats">
        {[
          {val:students.length, lbl:'Athletes',  color:'#0284c7',
           icon:<svg viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth={1.8} style={{width:14,height:14}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>},
          {val:tested,          lbl:'Tested',    color:'#059669',
           icon:<svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={1.8} style={{width:14,height:14}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>},
          {val:students.length-tested, lbl:'Untested', color:'#f97316',
           icon:<svg viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth={1.8} style={{width:14,height:14}}><circle cx="12" cy="8" r="4"/><path d="M16 16H8a4 4 0 0 0-4 4"/></svg>},
          {val:attRate!==null?`${attRate}%`:'—', lbl:'Attendance', color:attRate!==null&&attRate>=80?'#059669':'#f97316',
           icon:<svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth={1.8} style={{width:14,height:14}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/></svg>},
        ].map(s=>(
          <div key={s.lbl} className="sc">
            <div style={{width:22,height:22,margin:'0 auto 5px',display:'flex',alignItems:'center',justifyContent:'center'}}>{s.icon}</div>
            <div className="sc-val" style={{color:s.color}}>{s.val}</div>
            <div className="sc-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── AI REPORT ── */}
      <div className="ai-box">
        <div className="ai-header">
          <div className="ai-logo">
            <svg viewBox="0 0 24 24" fill="white" style={{width:12,height:12}}>
              <path d="M12 2a5 5 0 0 1 5 5v1h1a3 3 0 0 1 0 6h-1v1a5 5 0 0 1-10 0v-1H6a3 3 0 0 1 0-6h1V7a5 5 0 0 1 5-5z"/>
            </svg>
          </div>
          <div className="ai-title">AI Coaching Analysis</div>
          <div className="ai-badge">Powered by Claude AI · Altus Performance</div>
        </div>
        {aiSections.length>0?(
          <div className="ai-sections">
            {aiSections.map((section,i)=>(
              <div key={i}>
                <div className="ai-section-title">{section[0]}</div>
                <div className="ai-section-body">{section.slice(1).join(' ')}</div>
              </div>
            ))}
          </div>
        ):(
          <div className="section-title-only">{aiReport}</div>
        )}
      </div>

      {/* ── TABLE ── */}
      <table>
        <thead>
          <tr>
            <th className="left" style={{width:100}}>Athlete</th>
            <th style={{width:35}}>GRP</th>
            {tests.map(t=><th key={t.key}>{t.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {students.map(s=>{
            const r=latest(s.id);
            const surname=s.full_name.trim().split(' ').pop()||s.full_name;
            return(
              <tr key={s.id}>
                <td className="left">{surname}</td>
                <td className="grp">{s.training_group?`G${s.training_group}`:'—'}</td>
                {tests.map(t=>{
                  if(!r)return<td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                  const v=parseFloat(r[t.key]);
                  if(isNaN(v))return<td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                  const tier=getTier(t.key,v,t.lower);
                  return(
                    <td key={t.key}>
                      <span className="val-t" style={{color:tier.text}}>{fmt(t.key,v)}{t.unit}</span>
                      {' '}
                      <span className="badge" style={{background:tier.bg,color:tier.color,border:`1px solid ${tier.border}`}}>{tier.abbr}</span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr className="avg-row">
            <td className="left" style={{color:'#1e40af'}}>Class Avg</td>
            <td style={{color:'#94a3b8'}}>—</td>
            {avgs.map(a=>{
              if(!a.avg)return<td key={a.key} style={{color:'#94a3b8'}}>—</td>;
              const t=tests.find(x=>x.key===a.key)!;
              const tier=getTier(a.key,a.avg,t.lower);
              return(
                <td key={a.key} style={{color:tier.text}}>
                  {fmt(a.key,a.avg)}{t.unit}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      {/* ── PERFORMANCE KEY ── */}
      <div className="perf-key">
        <div className="pk-title">Performance Key</div>
        {TIERS.map(t=>(
          <div key={t.abbr} className="pk-item">
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

      <button className="print-btn no-print" onClick={()=>window.print()}>↓ Download PDF</button>
    </>
  );
}
