'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ grade: string }> }; // "8" or "9"

const HP_CLASSES = ['B','E','F','J','M'];

const GRADE8_TESTS = [
  { key:'chin_up_hang', label:'Chin Up Hang', unit:'s',   lower:false },
  { key:'broad_jump',   label:'Broad Jump',   unit:'cm',  lower:false },
  { key:'sprint_10m',   label:'10m Sprint',   unit:'s',   lower:true  },
  { key:'sprint_30m',   label:'30m Sprint',   unit:'s',   lower:true  },
  { key:'run_500m',     label:'500m Run',     unit:'',    lower:true  },
];
const GRADE9_TESTS = [
  { key:'pushup_2min',       label:'2 Min Push Up',     unit:'reps', lower:false },
  { key:'triple_broad_jump', label:'Triple Broad Jump', unit:'cm',   lower:false },
  { key:'sprint_10m',        label:'10m Sprint',        unit:'s',    lower:true  },
  { key:'sprint_30m',        label:'30m Sprint',        unit:'s',    lower:true  },
  { key:'run_500m',          label:'500m Run',          unit:'',     lower:true  },
];

const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5],broad_jump:[185,165,148,130],
  pushup_2min:[22,18,14,10],triple_broad_jump:[680,600,530,460],
  sprint_10m:[1.85,1.97,2.10,2.25],sprint_30m:[4.25,4.52,4.80,5.10],
  run_500m:[100,115,130,150],
};

const TIERS = [
  { label:'Outstanding', color:'#059669' },
  { label:'Strong',      color:'#0284c7' },
  { label:'On Track',    color:'#7c3aed' },
  { label:'Developing',  color:'#d97706' },
  { label:'Needs Work',  color:'#64748b' },
];

function getTier(key:string,val:number,lower:boolean){
  const b=BENCH[key];if(!b)return TIERS[2];
  const[e,g,a,d]=b;
  if(lower){if(val<=e)return TIERS[0];if(val<=g)return TIERS[1];if(val<=a)return TIERS[2];if(val<=d)return TIERS[3];return TIERS[4];}
  else{if(val>=e)return TIERS[0];if(val>=g)return TIERS[1];if(val>=a)return TIERS[2];if(val>=d)return TIERS[3];return TIERS[4];}
}

function fmt(key:string,val:number):string{
  if(key==='run_500m'){const m=Math.floor(val/60),s=Math.round(val%60);return`${m}:${s.toString().padStart(2,'0')}`;}
  if(key==='chin_up_hang'){if(val>=60){const m=Math.floor(val/60),s=val%60;return s?`${m}m${s}s`:`${m}min`;}return`${Math.round(val)}s`;}
  return val%1===0?String(val):val.toFixed(2);
}

export default function GradeExport({ params }: PageProps) {
  const { grade: gradeNum } = React.use(params);
  const grade = gradeNum === '8' ? 'Grade 8' : 'Grade 9';
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const year = new Date().getFullYear();

  React.useEffect(() => {
    fetch(`/api/hp/data?type=trends`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const gradeStudents = (d.students || []).filter((s: Row) => s.grade === grade);
        const sorted = gradeStudents.sort((a: Row, b: Row) => {
          if (a.class_group !== b.class_group) return a.class_group.localeCompare(b.class_group);
          const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          return sA.localeCompare(sB);
        });
        setStudents(sorted);
        setResults((d.tests || []).filter((r: Row) => r.year === year));
        setLoading(false);
      });
  }, [grade]);

  React.useEffect(() => {
    if (!loading && students.length > 0) setTimeout(() => window.print(), 500);
  }, [loading, students]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif'}}>Preparing report...</div>;

  const tests = grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  function latestResult(studentId: string) {
    const sr = results.filter(r => r.student_id === studentId)
      .sort((a,b) => ['Term 1','Term 2','Term 3'].indexOf(b.term) - ['Term 1','Term 2','Term 3'].indexOf(a.term));
    return sr[0] || null;
  }

  const classes = HP_CLASSES.filter(c => students.some(s => s.class_group === c));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:10px;}
        @page{size:A4 landscape;margin:10mm;}
        @media print{.no-print{display:none!important;}body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}.class-section{page-break-before:auto;}}
        .page{padding:12px;}
        .main-header{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #0f172a;}
        .main-header img{width:36px;height:36px;object-fit:contain;}
        .main-header h1{font-size:15px;font-weight:900;}
        .main-header p{font-size:9px;color:#64748b;}
        .main-header-right{margin-left:auto;text-align:right;font-size:9px;color:#64748b;}
        .class-section{margin-bottom:20px;}
        .class-header{background:#f1f5f9;border-radius:6px 6px 0 0;padding:8px 12px;border:1px solid #e2e8f0;border-bottom:none;display:flex;align-items:center;justify-content:space-between;}
        .class-header h2{font-size:13px;font-weight:900;}
        .class-header p{font-size:9px;color:#64748b;}
        table{width:100%;border-collapse:collapse;font-size:9px;}
        th{background:#f8fafc;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;padding:5px 7px;border:1px solid #e2e8f0;text-align:center;}
        th.left{text-align:left;}
        td{padding:4px 7px;border:1px solid #e2e8f0;text-align:center;vertical-align:middle;}
        td.left{text-align:left;font-weight:600;}
        tr:nth-child(even) td{background:#f8fafc;}
        .avg-row td{background:#eff6ff!important;font-weight:700;}
        .tier{font-size:8px;font-weight:700;padding:1px 5px;border-radius:20px;display:inline-block;}
        .footer{margin-top:12px;padding-top:8px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;}
        .print-btn{position:fixed;bottom:20px;right:20px;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;}
        .grade-summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px;}
        .summary-card{border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;text-align:center;}
        .summary-card .val{font-size:18px;font-weight:900;}
        .summary-card .lbl{font-size:8px;color:#64748b;text-transform:uppercase;letter-spacing:0.08em;margin-top:2px;}
      `}</style>

      <div className="page">
        <div className="main-header">
          <img src="/st-benedicts-logo.png" alt="SBC"/>
          <div>
            <h1>St Benedict's College — High Performance Programme</h1>
            <p>{grade} · Full Grade Performance Report · {year}</p>
          </div>
          <div className="main-header-right">
            <p>{students.length} athletes across {classes.length} classes</p>
            <p>{new Date().toLocaleDateString('en-ZA')}</p>
          </div>
        </div>

        {/* Grade summary stats */}
        <div className="grade-summary">
          <div className="summary-card">
            <div className="val">{students.length}</div>
            <div className="lbl">Athletes</div>
          </div>
          <div className="summary-card">
            <div className="val" style={{color:'#059669'}}>{students.filter(s => latestResult(s.id)).length}</div>
            <div className="lbl">Tested</div>
          </div>
          <div className="summary-card">
            <div className="val" style={{color:'#d97706'}}>{students.filter(s => !latestResult(s.id)).length}</div>
            <div className="lbl">Untested</div>
          </div>
          <div className="summary-card">
            <div className="val">{classes.length}</div>
            <div className="lbl">Classes</div>
          </div>
          <div className="summary-card">
            <div className="val">{year}</div>
            <div className="lbl">Year</div>
          </div>
        </div>

        {/* Per class tables */}
        {classes.map(cls => {
          const classStudents = students.filter(s => s.class_group === cls);
          const classAvgs = tests.map(t => {
            const vals = classStudents.map(s => { const r = latestResult(s.id); const v = r ? parseFloat(r[t.key]) : NaN; return isNaN(v) ? null : v; }).filter((v): v is number => v !== null);
            return { key: t.key, avg: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, count: vals.length };
          });
          return (
            <div key={cls} className="class-section">
              <div className="class-header">
                <div>
                  <h2>{gradeNum}{cls}</h2>
                  <p>{classStudents.length} athletes · {classStudents.filter(s => latestResult(s.id)).length} tested</p>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th className="left" style={{width:110}}>Athlete</th>
                    <th style={{width:32}}>Grp</th>
                    {tests.map(t => <th key={t.key}>{t.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map(s => {
                    const r = latestResult(s.id);
                    const surname = s.full_name.trim().split(' ').pop() || s.full_name;
                    return (
                      <tr key={s.id}>
                        <td className="left">{surname}</td>
                        <td>{s.training_group ? `G${s.training_group}` : '—'}</td>
                        {tests.map(t => {
                          if (!r) return <td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                          const v = parseFloat(r[t.key]);
                          if (isNaN(v)) return <td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                          const tier = getTier(t.key, v, t.lower);
                          return (
                            <td key={t.key}>
                              <span style={{fontWeight:700,color:tier.color}}>{fmt(t.key,v)}{t.unit}</span>
                              {' '}
                              <span className="tier" style={{background:`${tier.color}18`,color:tier.color,border:`1px solid ${tier.color}33`}}>{tier.label.slice(0,3)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  <tr className="avg-row">
                    <td className="left" style={{fontWeight:900}}>Class Avg</td>
                    <td>—</td>
                    {classAvgs.map(a => {
                      if (!a.avg) return <td key={a.key} style={{color:'#94a3b8'}}>—</td>;
                      const t = tests.find(x => x.key === a.key)!;
                      const tier = getTier(a.key, a.avg, t.lower);
                      return <td key={a.key} style={{fontWeight:900,color:tier.color}}>{fmt(a.key,a.avg)}{t.unit}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="footer">
          <span>St Benedict's College — High Performance Programme</span>
          <span>Confidential — Coach Use Only</span>
          <span>Generated {new Date().toLocaleDateString('en-ZA')}</span>
        </div>
      </div>

      <button className="print-btn no-print" onClick={() => window.print()}>Download PDF</button>
    </>
  );
}