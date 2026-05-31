'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const GRADE8_TESTS = [
  { key: 'chin_up_hang', label: 'Chin Up Hang', unit: 's',   lower: false },
  { key: 'broad_jump',   label: 'Broad Jump',   unit: 'cm',  lower: false },
  { key: 'sprint_10m',   label: '10m Sprint',   unit: 's',   lower: true  },
  { key: 'sprint_30m',   label: '30m Sprint',   unit: 's',   lower: true  },
  { key: 'run_500m',     label: '500m Run',     unit: '',    lower: true  },
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
  { label:'Outstanding', color:'#047857', bg:'#d1fae5' },
  { label:'Strong',      color:'#0369a1', bg:'#e0f2fe' },
  { label:'On Track',    color:'#5b21b6', bg:'#ede9fe' },
  { label:'Developing',  color:'#b45309', bg:'#fef3c7' },
  { label:'Needs Work',  color:'#475569', bg:'#f1f5f9' },
];
const TERMS = ['Term 1','Term 2','Term 3'];
type PageProps = { params: Promise<{ id: string }> };

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

export default function StudentExport({ params }: PageProps) {
  const { id } = React.use(params);
  const [student, setStudent] = React.useState<Row|null>(null);
  const [attendance, setAttendance] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const year = new Date().getFullYear();

  React.useEffect(() => {
    fetch(`/api/hp/data?type=student&id=${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setStudent(d.student || null);
        setAttendance(d.attendance || []);
        setResults((d.tests || []).filter((r: Row) => r.year === year));
        setLoading(false);
      });
  }, [id]);

  React.useEffect(() => {
    if (!loading && student) setTimeout(() => window.print(), 600);
  }, [loading, student]);

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'Georgia,serif',color:'#374151'}}>Preparing report…</div>;
  if (!student) return <div style={{padding:48,fontFamily:'Georgia,serif'}}>Student not found.</div>;

  const tests = student.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
  const present = attendance.filter(a=>['Present','Late'].includes(a.status)).length;
  const attRate = attendance.length>0?Math.round((present/attendance.length)*100):null;
  const latestResult = [...results].reverse().find(r => tests.some(t => !isNaN(parseFloat(r[t.key])))) || null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#111827;}
        @page{size:A4 portrait;margin:12mm 14mm;}
        @media print{
          .no-print{display:none!important;}
          body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
        }
        .page{max-width:760px;margin:0 auto;padding:32px 28px;}

        /* ── HEADER ── */
        .doc-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #111827;}
        .doc-header-left{display:flex;align-items:center;gap:14px;}
        .doc-header img{width:52px;height:52px;object-fit:contain;}
        .doc-school{font-size:20px;font-weight:800;color:#111827;line-height:1.1;}
        .doc-subtitle{font-size:11px;color:#6b7280;margin-top:3px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;}
        .doc-header-right{text-align:right;}
        .doc-header-right .report-type{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6b7280;}
        .doc-header-right .report-date{font-size:12px;color:#374151;margin-top:3px;font-weight:500;}

        /* ── ATHLETE BANNER ── */
        .athlete-banner{background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:18px 22px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;}
        .athlete-name{font-size:22px;font-weight:800;color:#111827;}
        .athlete-meta{display:flex;gap:20px;margin-top:6px;}
        .athlete-meta-item{font-size:11px;color:#6b7280;}
        .athlete-meta-item span{font-weight:600;color:#374151;}
        .att-ring-wrap{text-align:center;}
        .att-ring-pct{font-size:22px;font-weight:800;}
        .att-ring-lbl{font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-top:1px;}

        /* ── SECTION LABEL ── */
        .section-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9ca3af;margin-bottom:10px;margin-top:22px;}

        /* ── TEST CARDS ── */
        .test-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:4px;}
        .test-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 10px;text-align:center;}
        .test-card.no-data{background:#f9fafb;}
        .test-label{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;margin-bottom:6px;}
        .test-value{font-size:20px;font-weight:800;line-height:1;}
        .test-unit{font-size:9px;color:#9ca3af;margin-top:1px;}
        .tier-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:8px;font-weight:700;margin-top:5px;}
        .test-terms{display:flex;justify-content:center;gap:8px;margin-top:7px;padding-top:7px;border-top:1px solid #f3f4f6;}
        .term-val{text-align:center;}
        .term-val .tv{font-size:10px;font-weight:700;color:#374151;}
        .term-val .tl{font-size:8px;color:#9ca3af;}
        .delta{font-size:9px;font-weight:700;margin-top:4px;}
        .delta.up{color:#047857;}
        .delta.dn{color:#b91c1c;}

        /* ── ATTENDANCE ── */
        .att-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
        .att-bar-label{font-size:11px;font-weight:500;color:#374151;width:60px;}
        .att-bar-track{flex:1;height:8px;background:#f3f4f6;border-radius:4px;overflow:hidden;}
        .att-bar-fill{height:100%;border-radius:4px;}
        .att-bar-num{font-size:11px;font-weight:700;color:#111827;width:24px;text-align:right;}

        /* ── FOOTER ── */
        .doc-footer{margin-top:28px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;}
        .doc-footer-logo{font-size:10px;font-weight:700;color:#6b7280;}
        .doc-footer-conf{font-size:9px;color:#9ca3af;font-style:italic;}

        /* ── PRINT BUTTON ── */
        .print-btn{position:fixed;bottom:28px;right:28px;background:#111827;color:#fff;border:none;border-radius:10px;padding:13px 28px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 12px rgba(0,0,0,0.2);}
      `}</style>

      <div className="page">

        {/* Header */}
        <div className="doc-header">
          <div className="doc-header-left">
            <img src="/st-benedicts-logo.png" alt="SBC"/>
            <div>
              <div className="doc-school">St Benedict's College</div>
              <div className="doc-subtitle">High Performance Programme</div>
            </div>
          </div>
          <div className="doc-header-right">
            <div className="report-type">Athlete Report</div>
            <div className="report-date">{new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
        </div>

        {/* Athlete banner */}
        <div className="athlete-banner">
          <div>
            <div className="athlete-name">{student.full_name}</div>
            <div className="athlete-meta">
              <div className="athlete-meta-item">{student.grade} &nbsp;·&nbsp; <span>Class {student.class_group || '—'}</span></div>
              {student.training_group && <div className="athlete-meta-item">Training Group <span>{student.training_group}</span></div>}
              <div className="athlete-meta-item">Year <span>{year}</span></div>
            </div>
          </div>
          {attRate !== null && (
            <div className="att-ring-wrap">
              <div className="att-ring-pct" style={{color:attRate>=80?'#047857':attRate>=60?'#b45309':'#b91c1c'}}>{attRate}%</div>
              <div className="att-ring-lbl">Attendance</div>
            </div>
          )}
        </div>

        {/* Test results */}
        <div className="section-label">Physical Performance Testing — {year}</div>
        {results.length === 0 ? (
          <p style={{color:'#9ca3af',fontStyle:'italic',fontSize:12,marginBottom:20}}>No test results have been recorded for this athlete yet.</p>
        ) : (
          <div className="test-grid">
            {tests.map(t => {
              const termVals = TERMS.map(term => {
                const r = results.find(r => r.term === term);
                const v = r ? parseFloat(r[t.key]) : NaN;
                return isNaN(v) ? null : v;
              });
              const latestVal = [...termVals].reverse().find(v => v !== null) ?? null;
              const firstVal = termVals.find(v => v !== null) ?? null;
              const tier = latestVal !== null ? getTier(t.key, latestVal, t.lower) : null;
              const hasData = latestVal !== null;
              let delta: {improved:boolean;pct:string}|null = null;
              if (firstVal !== null && latestVal !== null && firstVal !== latestVal) {
                const improved = t.lower ? latestVal < firstVal : latestVal > firstVal;
                delta = { improved, pct: Math.abs(((latestVal-firstVal)/firstVal)*100).toFixed(1) };
              }
              return (
                <div key={t.key} className={`test-card${!hasData?' no-data':''}`} style={tier&&hasData?{borderColor:`${tier.color}44`,background:`${tier.bg}55`}:{}}>
                  <div className="test-label">{t.label}</div>
                  {hasData&&latestVal!==null ? (
                    <>
                      <div className="test-value" style={{color:tier?.color}}>{fmt(t.key,latestVal)}</div>
                      {t.unit&&<div className="test-unit">{t.unit}</div>}
                      {tier&&<div className="tier-badge" style={{background:tier.bg,color:tier.color}}>{tier.label}</div>}
                      <div className="test-terms">
                        {TERMS.map((term,i)=>(
                          <div key={term} className="term-val">
                            <div className="tl">{term.replace('Term ','T')}</div>
                            <div className="tv">{termVals[i]!==null?`${fmt(t.key,termVals[i]!)}${t.unit}`:'—'}</div>
                          </div>
                        ))}
                      </div>
                      {delta&&<div className={`delta ${delta.improved?'up':'dn'}`}>{delta.improved?'▲':'▼'} {delta.pct}%</div>}
                    </>
                  ) : (
                    <div style={{color:'#d1d5db',fontSize:18,marginTop:8}}>—</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Attendance */}
        {attendance.length > 0 && (
          <>
            <div className="section-label">Attendance Summary</div>
            <div style={{background:'#f8fafc',border:'1px solid #e5e7eb',borderRadius:10,padding:'16px 20px'}}>
              {[
                {label:'Present', val:attendance.filter(a=>a.status==='Present').length, color:'#047857'},
                {label:'Late',    val:attendance.filter(a=>a.status==='Late').length,    color:'#b45309'},
                {label:'Absent',  val:attendance.filter(a=>a.status==='Absent').length,  color:'#b91c1c'},
                {label:'Excused', val:attendance.filter(a=>a.status==='Excused').length, color:'#0369a1'},
              ].filter(x=>x.val>0).map(x=>(
                <div key={x.label} className="att-bar-row">
                  <div className="att-bar-label">{x.label}</div>
                  <div className="att-bar-track">
                    <div className="att-bar-fill" style={{width:`${Math.round((x.val/attendance.length)*100)}%`,background:x.color}}/>
                  </div>
                  <div className="att-bar-num">{x.val}</div>
                </div>
              ))}
              <div style={{marginTop:10,fontSize:11,color:'#6b7280'}}>
                {attendance.length} sessions recorded &nbsp;·&nbsp; {present} attended &nbsp;·&nbsp;
                <strong style={{color:attRate!==null&&attRate>=80?'#047857':attRate!==null&&attRate>=60?'#b45309':'#b91c1c'}}>{attRate}% rate</strong>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="doc-footer">
          <div className="doc-footer-logo">St Benedict's College · High Performance Programme</div>
          <div className="doc-footer-conf">Confidential · {new Date().getFullYear()}</div>
        </div>
      </div>

      <button className="print-btn no-print" onClick={()=>window.print()}>Save as PDF</button>
    </>
  );
}
