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
  { key: 'pushup_2min',       label: 'Push Up (2 min)',     unit: 'reps', lower: false },
  { key: 'triple_broad_jump', label: 'Triple Broad Jump', unit: 'cm',   lower: false },
  { key: 'sprint_10m',        label: '10m Sprint',        unit: 's',    lower: true  },
  { key: 'sprint_30m',        label: '30m Sprint',        unit: 's',    lower: true  },
  { key: 'run_500m',          label: '500m Run',          unit: '',     lower: true  },
];
const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5], broad_jump:[185,165,148,130],
  pushup_2min:[22,18,14,10],pushup_hold:[90,70,50,30], triple_broad_jump:[680,600,530,460],
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
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;-webkit-font-smoothing:antialiased;}
        @page{size:A4 portrait;margin:10mm 12mm;}
        @media print{
          .no-print{display:none!important;}
          body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
        }
        .page{max-width:760px;margin:0 auto;padding:24px 20px;}

        /* ── HEADER ── */
        .doc-header{
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:20px;padding:14px 18px;
          background:#0f172a;border-radius:10px;position:relative;overflow:hidden;
        }
        .doc-header::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#38bdf8,#6366f1,#a78bfa);}
        .doc-header-left{display:flex;align-items:center;gap:14px;}
        .doc-header img{width:44px;height:44px;object-fit:contain;}
        .doc-school{font-size:16px;font-weight:800;color:#fff;letter-spacing:-0.02em;}
        .doc-subtitle{font-size:9px;color:rgba(16,185,129,0.7);margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;}
        .doc-header-right{text-align:right;}
        .report-type{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:rgba(255,255,255,0.3);}
        .report-date{font-size:11px;color:rgba(255,255,255,0.5);margin-top:3px;font-weight:500;}

        /* ── ATHLETE BANNER ── */
        .athlete-banner{
          background:#f8fafc;border:1.5px solid #e2e8f0;
          border-radius:12px;padding:16px 20px;margin-bottom:20px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .athlete-name{font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.03em;}
        .athlete-meta{display:flex;gap:16px;margin-top:6px;flex-wrap:wrap;}
        .athlete-meta-item{font-size:10px;color:rgba(255,255,255,0.4);}
        .athlete-meta-item span{font-weight:700;color:rgba(255,255,255,0.7);}
        .att-ring-wrap{text-align:center;min-width:60px;}
        .att-ring-pct{font-size:24px;font-weight:800;line-height:1;}
        .att-ring-lbl{font-size:8px;text-transform:uppercase;letter-spacing:0.1em;color:rgba(255,255,255,0.3);margin-top:3px;}

        /* ── SECTION LABEL ── */
        .section-label{
          font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.15em;
          color:#94a3b8;margin-bottom:10px;margin-top:20px;
        }

        /* ── TEST CARDS ── */
        .test-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:4px;}
        .test-card{
          border:1px solid rgba(255,255,255,0.07);border-radius:10px;
          padding:12px 8px;text-align:center;background:rgba(255,255,255,0.02);
        }
        .test-label{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.3);margin-bottom:6px;}
        .test-value{font-size:20px;font-weight:800;line-height:1;letter-spacing:-0.02em;}
        .test-unit{font-size:8.5px;color:#94a3b8;margin-top:2px;}
        .tier-badge{
          display:inline-block;padding:2px 7px;border-radius:20px;
          font-size:7.5px;font-weight:700;margin-top:5px;letter-spacing:0.03em;
        }
        .test-terms{
          display:flex;justify-content:center;gap:6px;margin-top:8px;padding-top:8px;
          border-top:1px solid rgba(255,255,255,0.06);
        }
        .term-val{text-align:center;}
        .tv{font-size:9px;font-weight:700;color:#fff;}
        .tl{font-size:7.5px;color:rgba(255,255,255,0.3);}
        .delta{font-size:8.5px;font-weight:700;margin-top:4px;}
        .delta.up{color:#10b981;}
        .delta.dn{color:#f87171;}

        /* ── ATTENDANCE ── */
        .att-bar-row{display:flex;align-items:center;gap:10px;margin-bottom:8px;}
        .att-bar-label{font-size:10px;font-weight:500;color:rgba(255,255,255,0.5);width:56px;}
        .att-bar-track{flex:1;height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;}
        .att-bar-fill{height:100%;border-radius:3px;}
        .att-bar-num{font-size:10px;font-weight:700;color:#fff;width:20px;text-align:right;}

        /* ── FOOTER ── */
        .doc-footer{
          margin-top:24px;padding-top:12px;border-top:2px solid #f1f5f9;
          display:flex;justify-content:space-between;align-items:center;
        }
        .doc-footer-logo{font-size:9px;font-weight:600;color:rgba(255,255,255,0.2);}
        .doc-footer-conf{font-size:8px;color:rgba(255,255,255,0.15);font-style:italic;}

        /* ── PRINT BUTTON ── */
        .print-btn{
          position:fixed;bottom:24px;right:24px;
          background:linear-gradient(135deg,#10b981,#38bdf8);
          color:#fff;border:none;border-radius:12px;padding:12px 24px;
          font-size:13px;font-weight:700;cursor:pointer;
          font-family:'Inter',sans-serif;
          box-shadow:0 8px 24px rgba(16,185,129,0.3);
        }
      `}</style>

      <div className="page">

        {/* Header */}
        <div className="doc-header">
          <div className="doc-header-left">
            {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/st-benedicts-logo.png" alt="SBC"/>
            <div>
              <div className="doc-school">St Benedict&apos;s College</div>
              <div className="doc-subtitle">High Performance Programme</div>
            </div>
          </div>
          <div className="doc-header-right">
            <div className="report-type">Athlete Performance Report</div>
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
              <div className="att-ring-pct" style={{color:attRate>=80?'#10b981':attRate>=60?'#fbbf24':'#f87171'}}>{attRate}%</div>
              <div className="att-ring-lbl">Attendance</div>
            </div>
          )}
        </div>

        {/* Test results */}
        <div className="section-label">Physical Performance Testing — {year}</div>
        {results.length === 0 ? (
          <p style={{color:'rgba(255,255,255,0.2)',fontStyle:'italic',fontSize:12,marginBottom:20}}>No test results recorded yet.</p>
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
                <div key={t.key} className="test-card" style={tier&&hasData?{borderColor:`${tier.color}30`,background:`${tier.color}08`}:{}}>
                  <div className="test-label">{t.label}</div>
                  {hasData&&latestVal!==null ? (
                    <>
                      <div className="test-value" style={{color:tier?.color}}>{fmt(t.key,latestVal)}</div>
                      {t.unit&&<div className="test-unit">{t.unit}</div>}
                      {tier&&<div className="tier-badge" style={{background:`${tier.color}18`,color:tier.color}}>{tier.label}</div>}
                      <div className="test-terms">
                        {TERMS.map((term,i)=>(
                          <div key={term} className="term-val">
                            <div className="tl">{term.replace('Term ','T')}</div>
                            <div className="tv">{termVals[i]!==null?fmt(t.key,termVals[i]!):'—'}</div>
                          </div>
                        ))}
                      </div>
                      {delta&&<div className={`delta ${delta.improved?'up':'dn'}`}>{delta.improved?'▲':'▼'} {delta.pct}%</div>}
                    </>
                  ) : (
                    <div style={{color:'rgba(255,255,255,0.15)',fontSize:18,marginTop:8}}>—</div>
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
            <div style={{background:'#0d1424',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,padding:'14px 18px'}}>
              {[
                {label:'Present', val:attendance.filter(a=>a.status==='Present').length, color:'#10b981'},
                {label:'Late',    val:attendance.filter(a=>a.status==='Late').length,    color:'#fbbf24'},
                {label:'Absent',  val:attendance.filter(a=>a.status==='Absent').length,  color:'#f87171'},
                {label:'Excused', val:attendance.filter(a=>a.status==='Excused').length, color:'#38bdf8'},
              ].filter(x=>x.val>0).map(x=>(
                <div key={x.label} className="att-bar-row">
                  <div className="att-bar-label">{x.label}</div>
                  <div className="att-bar-track">
                    <div className="att-bar-fill" style={{width:`${Math.round((x.val/attendance.length)*100)}%`,background:x.color}}/>
                  </div>
                  <div className="att-bar-num" style={{color:x.color}}>{x.val}</div>
                </div>
              ))}
              <div style={{marginTop:10,fontSize:10,color:'rgba(255,255,255,0.3)'}}>
                {attendance.length} sessions recorded &nbsp;·&nbsp; {present} attended &nbsp;·&nbsp;
                <strong style={{color:attRate!==null&&attRate>=80?'#10b981':attRate!==null&&attRate>=60?'#fbbf24':'#f87171'}}>{attRate}% attendance rate</strong>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="doc-footer">
          <div className="doc-footer-logo">St Benedict&apos;s College · High Performance Programme</div>
          <div className="doc-footer-conf">Confidential · Coach and Administration Use Only · {new Date().getFullYear()}</div>
        </div>
      </div>

      <button className="print-btn no-print" onClick={()=>window.print()}>⬇ Save as PDF</button>
    </>
  );
}
