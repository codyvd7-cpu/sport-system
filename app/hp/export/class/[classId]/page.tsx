'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ classId: string }> };

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

export default function ClassExport({ params }: PageProps) {
  const { classId } = React.use(params); // e.g. "8B" or "9E"
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const year = new Date().getFullYear();
  const grade = classId[0] === '8' ? 'Grade 8' : 'Grade 9';
  const cls = classId[1];

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('grade', grade).eq('class_group', cls).eq('is_active', true),
      supabase.from('hp_test_results').select('*').eq('year', year).order('term'),
    ]).then(([s, r]) => {
      const sorted = (s.data || []).sort((a:Row, b:Row) => {
        const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
        return sA.localeCompare(sB);
      });
      setStudents(sorted);
      setResults(r.data || []);
      setLoading(false);
    });
  }, [classId]);

  React.useEffect(() => {
    if (!loading && students.length > 0) setTimeout(() => window.print(), 500);
  }, [loading, students]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif'}}>Preparing report...</div>;

  const tests = grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;

  function latestResult(studentId: string) {
    const sr = results.filter(r => r.student_id === studentId).sort((a, b) => {
      const order = ['Term 1','Term 2','Term 3'];
      return order.indexOf(b.term) - order.indexOf(a.term);
    });
    return sr[0] || null;
  }

  // Class averages
  const classAvgs = tests.map(t => {
    const vals = students.map(s => { const r = latestResult(s.id); const v = r ? parseFloat(r[t.key]) : NaN; return isNaN(v) ? null : v; }).filter((v): v is number => v !== null);
    return { key: t.key, avg: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null, count: vals.length };
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:10px;}
        @page{size:A4 landscape;margin:12mm 10mm;}
        @media print{.no-print{display:none!important;}body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
        .page{max-width:100%;padding:16px;}
        .header{display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #0f172a;}
        .header img{width:40px;height:40px;object-fit:contain;}
        .header h1{font-size:16px;font-weight:900;}
        .header p{font-size:10px;color:#64748b;margin-top:1px;}
        .header-right{margin-left:auto;text-align:right;font-size:9px;color:#64748b;}
        table{width:100%;border-collapse:collapse;font-size:9px;}
        th{background:#f1f5f9;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#64748b;padding:6px 8px;border:1px solid #e2e8f0;text-align:center;}
        th.left{text-align:left;}
        td{padding:5px 8px;border:1px solid #e2e8f0;text-align:center;vertical-align:middle;}
        td.left{text-align:left;}
        tr:nth-child(even) td{background:#f8fafc;}
        .avg-row td{background:#f1f5f9!important;font-weight:700;}
        .tier{display:inline-block;padding:1px 6px;border-radius:20px;font-size:8px;font-weight:700;}
        .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:8px;color:#94a3b8;}
        .print-btn{position:fixed;bottom:20px;right:20px;background:#0f172a;color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;}
      `}</style>

      <div className="page">
        <div className="header">
          <img src="/st-benedicts-logo.png" alt="SBC"/>
          <div>
            <h1>St Benedict's College — High Performance</h1>
            <p>Class {classId} · {grade} · Performance Report · {year}</p>
          </div>
          <div className="header-right">
            <p>{students.length} athletes</p>
            <p>{new Date().toLocaleDateString('en-ZA')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th className="left" style={{width:130}}>Athlete</th>
              <th style={{width:40}}>Grp</th>
              {tests.map(t => <th key={t.key}>{t.label}</th>)}
              <th>Att %</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const r = latestResult(s.id);
              const surname = s.full_name.trim().split(' ').pop() || s.full_name;
              return (
                <tr key={s.id}>
                  <td className="left" style={{fontWeight:600}}>{surname}</td>
                  <td>{s.training_group ? `G${s.training_group}` : '—'}</td>
                  {tests.map(t => {
                    if (!r) return <td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                    const v = parseFloat(r[t.key]);
                    if (isNaN(v)) return <td key={t.key} style={{color:'#cbd5e1'}}>—</td>;
                    const tier = getTier(t.key, v, t.lower);
                    return (
                      <td key={t.key}>
                        <span style={{fontWeight:700, color:tier.color}}>{fmt(t.key,v)}{t.unit}</span>
                        <br/>
                        <span className="tier" style={{background:`${tier.color}18`,color:tier.color,border:`1px solid ${tier.color}33`}}>{tier.label}</span>
                      </td>
                    );
                  })}
                  <td style={{fontWeight:700}}>{'—'}</td>
                </tr>
              );
            })}
            {/* Average row */}
            <tr className="avg-row">
              <td className="left" style={{fontWeight:900}}>Class Average</td>
              <td>—</td>
              {classAvgs.map(a => {
                if (a.avg === null) return <td key={a.key} style={{color:'#94a3b8'}}>—</td>;
                const t = tests.find(x => x.key === a.key)!;
                const tier = getTier(a.key, a.avg, t.lower);
                return (
                  <td key={a.key}>
                    <span style={{fontWeight:900,color:tier.color}}>{fmt(a.key,a.avg)}{t.unit}</span>
                    <br/><span style={{fontSize:8,color:'#64748b'}}>{a.count} tested</span>
                  </td>
                );
              })}
              <td>—</td>
            </tr>
          </tbody>
        </table>

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
