'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const GRADE8_TESTS = [
  { key: 'chin_up_hang',  label: 'Chin Up Hang',  unit: 's',   lower: false },
  { key: 'broad_jump',    label: 'Broad Jump',     unit: 'cm',  lower: false },
  { key: 'sprint_10m',    label: '10m Sprint',     unit: 's',   lower: true  },
  { key: 'sprint_30m',    label: '30m Sprint',     unit: 's',   lower: true  },
  { key: 'run_500m',      label: '500m Run',       unit: '',    lower: true  },
];
const GRADE9_TESTS = [
  { key: 'pushup_2min',       label: '2 Min Push Up',     unit: 'reps', lower: false },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm',   lower: false },
  { key: 'sprint_10m',        label: '10m Sprint',        unit: 's',    lower: true  },
  { key: 'sprint_30m',        label: '30m Sprint',        unit: 's',    lower: true  },
  { key: 'run_500m',          label: '500m Run',          unit: '',     lower: true  },
];

const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5], broad_jump:[185,165,148,130],
  pushup_2min:[22,18,14,10], triple_broad_jump:[680,600,530,460],
  sprint_10m:[1.85,1.97,2.10,2.25], sprint_30m:[4.25,4.52,4.80,5.10],
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

const TERMS = ['Term 1','Term 2','Term 3'];
type PageProps = { params: Promise<{ id: string }> };

export default function StudentExport({ params }: PageProps) {
  const { id } = React.use(params);
  const [student, setStudent] = React.useState<Row|null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const year = new Date().getFullYear();

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('id', id).single(),
      supabase.from('hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
      supabase.from('hp_test_results').select('*').eq('student_id', id).eq('year', year).order('term'),
    ]).then(([s, a, r]) => {
      setStudent(s.data);
      setAttendance(a.data || []);
      setResults(r.data || []);
      setLoading(false);
    });
  }, [id]);

  React.useEffect(() => {
    if (!loading && student) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, student]);

  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'sans-serif' }}>Preparing report...</div>;
  if (!student) return <div style={{ padding:40, fontFamily:'sans-serif' }}>Student not found.</div>;

  const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const present = attendance.filter(a => ['Present','Late'].includes(a.status)).length;
  const attRate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

  const tierCounts: Record<string,number> = {};
  const latestResult = results[results.length - 1];
  if (latestResult) {
    tests.forEach(t => {
      const v = parseFloat(latestResult[t.key]);
      if (!isNaN(v)) { const tier = getTier(t.key, v, t.lower); tierCounts[tier.label] = (tierCounts[tier.label]||0)+1; }
    });
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
        * { margin:0; padding:0; box-sizing:border-box; }
        body { font-family:'Inter',sans-serif; background:#fff; color:#0f172a; font-size:11px; }
        @page { size:A4; margin:16mm 14mm; }
        @media print {
          .no-print { display:none !important; }
          body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
        }
        .page { max-width:794px; margin:0 auto; padding:24px; }
        .header { display:flex; align-items:center; gap:16px; margin-bottom:20px; padding-bottom:16px; border-bottom:2px solid #0f172a; }
        .header-logo { width:48px; height:48px; object-fit:contain; }
        .header-text h1 { font-size:18px; font-weight:900; }
        .header-text p { font-size:11px; color:#64748b; margin-top:2px; }
        .header-right { margin-left:auto; text-align:right; }
        .header-right p { font-size:10px; color:#64748b; }
        .section { margin-bottom:20px; }
        .section-title { font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.1em; color:#64748b; margin-bottom:8px; }
        .info-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
        .info-card { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 12px; }
        .info-card .val { font-size:20px; font-weight:900; }
        .info-card .lbl { font-size:9px; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.08em; }
        .results-table { width:100%; border-collapse:collapse; }
        .results-table th { background:#f1f5f9; font-size:9px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#64748b; padding:7px 10px; text-align:left; border:1px solid #e2e8f0; }
        .results-table td { padding:7px 10px; border:1px solid #e2e8f0; font-size:11px; vertical-align:middle; }
        .results-table tr:nth-child(even) td { background:#f8fafc; }
        .tier-badge { display:inline-block; padding:2px 8px; border-radius:20px; font-size:9px; font-weight:700; }
        .att-row { display:flex; gap:12px; }
        .att-item { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 12px; flex:1; }
        .att-item .val { font-size:16px; font-weight:900; }
        .att-item .lbl { font-size:9px; color:#64748b; text-transform:uppercase; letter-spacing:0.08em; }
        .footer { margin-top:24px; padding-top:12px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:9px; color:#94a3b8; }
        .print-btn { position:fixed; bottom:24px; right:24px; background:#0f172a; color:#fff; border:none; border-radius:12px; padding:12px 24px; font-size:13px; font-weight:700; cursor:pointer; font-family:'Inter',sans-serif; }
        .print-btn:hover { background:#1e293b; }
        .delta-up { color:#059669; font-weight:700; }
        .delta-dn { color:#dc2626; font-weight:700; }
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="header">
          <img src="/st-benedicts-logo.png" alt="SBC" className="header-logo"/>
          <div className="header-text">
            <h1>St Benedict's College</h1>
            <p>High Performance Programme — Athlete Report</p>
          </div>
          <div className="header-right">
            <p>{new Date().toLocaleDateString('en-ZA', { day:'numeric', month:'long', year:'numeric' })}</p>
            <p>Year {year}</p>
          </div>
        </div>

        {/* Student info */}
        <div className="section">
          <div className="section-title">Athlete</div>
          <div className="info-grid">
            <div className="info-card">
              <div className="val" style={{fontSize:14}}>{student.full_name}</div>
              <div className="lbl">Full Name</div>
            </div>
            <div className="info-card">
              <div className="val" style={{fontSize:14}}>{student.grade}</div>
              <div className="lbl">Grade</div>
            </div>
            <div className="info-card">
              <div className="val">{student.class_group || '—'}</div>
              <div className="lbl">Class</div>
            </div>
            <div className="info-card">
              <div className="val">{student.training_group ? `Group ${student.training_group}` : '—'}</div>
              <div className="lbl">Training Group</div>
            </div>
          </div>
        </div>

        {/* Tier summary */}
        {Object.keys(tierCounts).length > 0 && (
          <div className="section">
            <div className="section-title">Performance Summary — Latest Term</div>
            <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
              {TIERS.map(t => {
                const n = tierCounts[t.label] || 0;
                return n > 0 ? (
                  <div key={t.label} className="tier-badge" style={{background:`${t.color}18`, color:t.color, border:`1px solid ${t.color}44`}}>
                    {n} {t.label}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}

        {/* Test results */}
        <div className="section">
          <div className="section-title">Test Results by Term</div>
          {results.length === 0 ? (
            <p style={{color:'#94a3b8', fontStyle:'italic'}}>No test results recorded.</p>
          ) : (
            <table className="results-table">
              <thead>
                <tr>
                  <th>Test</th>
                  {TERMS.map(t => <th key={t} style={{textAlign:'center'}}>{t}</th>)}
                  <th style={{textAlign:'center'}}>Change</th>
                  <th style={{textAlign:'center'}}>Latest Tier</th>
                </tr>
              </thead>
              <tbody>
                {tests.map(t => {
                  const termVals = TERMS.map(term => {
                    const r = results.find(r => r.term === term);
                    const v = r ? parseFloat(r[t.key]) : NaN;
                    return isNaN(v) ? null : v;
                  });
                  const hasAny = termVals.some(v => v !== null);
                  if (!hasAny) return null;
                  const latestVal = [...termVals].reverse().find(v => v !== null);
                  const firstVal = termVals.find(v => v !== null);
                  const tier = latestVal !== undefined && latestVal !== null ? getTier(t.key, latestVal, t.lower) : null;
                  let delta = null;
                  if (firstVal !== null && firstVal !== undefined && latestVal !== null && latestVal !== undefined && firstVal !== latestVal) {
                    const improved = t.lower ? latestVal < firstVal : latestVal > firstVal;
                    const pct = Math.abs(((latestVal - firstVal) / firstVal) * 100).toFixed(1);
                    delta = { improved, pct };
                  }
                  return (
                    <tr key={t.key}>
                      <td style={{fontWeight:600}}>{t.label}</td>
                      {termVals.map((v, i) => (
                        <td key={i} style={{textAlign:'center', fontWeight:v!==null?700:400, color:v!==null?'#0f172a':'#cbd5e1'}}>
                          {v !== null ? `${fmt(t.key, v)}${t.unit}` : '—'}
                        </td>
                      ))}
                      <td style={{textAlign:'center'}}>
                        {delta ? <span className={delta.improved ? 'delta-up' : 'delta-dn'}>{delta.improved ? '▲' : '▼'} {delta.pct}%</span> : <span style={{color:'#cbd5e1'}}>—</span>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        {tier && latestVal !== null && latestVal !== undefined ? (
                          <span className="tier-badge" style={{background:`${tier.color}18`, color:tier.color, border:`1px solid ${tier.color}44`}}>{tier.label}</span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Attendance */}
        <div className="section">
          <div className="section-title">Attendance</div>
          <div className="att-row">
            {[
              { label:'Rate', val: attRate !== null ? `${attRate}%` : '—', color: attRate !== null ? (attRate>=80?'#059669':attRate>=60?'#d97706':'#dc2626') : '#94a3b8' },
              { label:'Sessions', val: attendance.length, color:'#0f172a' },
              { label:'Present', val: attendance.filter(a=>a.status==='Present').length, color:'#059669' },
              { label:'Late', val: attendance.filter(a=>a.status==='Late').length, color:'#d97706' },
              { label:'Absent', val: attendance.filter(a=>a.status==='Absent').length, color:'#dc2626' },
              { label:'Excused', val: attendance.filter(a=>a.status==='Excused').length, color:'#0284c7' },
            ].map(x => (
              <div key={x.label} className="att-item">
                <div className="val" style={{color:x.color}}>{x.val}</div>
                <div className="lbl">{x.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="footer">
          <span>St Benedict's College — High Performance Programme</span>
          <span>Confidential — Coach Use Only</span>
          <span>Generated {new Date().toLocaleDateString('en-ZA')}</span>
        </div>
      </div>

      <button className="print-btn no-print" onClick={() => window.print()}>
        Download PDF
      </button>
    </>
  );
}
