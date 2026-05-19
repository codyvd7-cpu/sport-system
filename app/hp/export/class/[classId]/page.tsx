'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ classId: string }> };

const GRADE8_TESTS = [
  { key:'chin_up_hang', label:'Chin Up\nHang', unit:'s',   lower:false },
  { key:'broad_jump',   label:'Broad\nJump',   unit:'cm',  lower:false },
  { key:'sprint_10m',   label:'10m\nSprint',   unit:'s',   lower:true  },
  { key:'sprint_30m',   label:'30m\nSprint',   unit:'s',   lower:true  },
  { key:'run_500m',     label:'500m\nRun',     unit:'',    lower:true  },
];
const GRADE9_TESTS = [
  { key:'pushup_2min',       label:'Push Up\n2 Min',       unit:'reps', lower:false },
  { key:'triple_broad_jump', label:'Triple\nJump',          unit:'cm',   lower:false },
  { key:'sprint_10m',        label:'10m\nSprint',           unit:'s',    lower:true  },
  { key:'sprint_30m',        label:'30m\nSprint',           unit:'s',    lower:true  },
  { key:'run_500m',          label:'500m\nRun',             unit:'',     lower:true  },
];
const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5],broad_jump:[185,165,148,130],
  pushup_2min:[22,18,14,10],triple_broad_jump:[680,600,530,460],
  sprint_10m:[1.85,1.97,2.10,2.25],sprint_30m:[4.25,4.52,4.80,5.10],
  run_500m:[100,115,130,150],
};
const TIERS = [
  { label:'Outstanding', color:'#047857', bg:'#d1fae5' },
  { label:'Strong',      color:'#0369a1', bg:'#e0f2fe' },
  { label:'On Track',    color:'#5b21b6', bg:'#ede9fe' },
  { label:'Developing',  color:'#b45309', bg:'#fef3c7' },
  { label:'Needs Work',  color:'#475569', bg:'#f1f5f9' },
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
  const { classId } = React.use(params);
  const [students, setStudents] = React.useState<Row[]>([]);
  const [results, setResults] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const year = new Date().getFullYear();
  const grade = classId[0]==='8'?'Grade 8':'Grade 9';
  const cls = classId[1];

  React.useEffect(() => {
    Promise.all([
      supabase.from('hp_students').select('*').eq('grade',grade).eq('class_group',cls).eq('is_active',true),
      supabase.from('hp_test_results').select('*').eq('year',year).order('term'),
    ]).then(([s,r])=>{
      const sorted=(s.data||[]).sort((a:Row,b:Row)=>{
        const sA=a.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        const sB=b.full_name.trim().split(' ').pop()?.toLowerCase()||'';
        return sA.localeCompare(sB);
      });
      setStudents(sorted); setResults(r.data||[]); setLoading(false);
    });
  },[classId]);

  React.useEffect(()=>{ if(!loading&&students.length>0) setTimeout(()=>window.print(),600); },[loading,students]);

  if(loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',fontFamily:'sans-serif',color:'#374151'}}>Preparing report…</div>;

  const tests = grade==='Grade 9'?GRADE9_TESTS:GRADE8_TESTS;

  function latest(studentId:string){
    const sr=results.filter(r=>r.student_id===studentId).sort((a,b)=>['Term 1','Term 2','Term 3'].indexOf(b.term)-['Term 1','Term 2','Term 3'].indexOf(a.term));
    return sr[0]||null;
  }

  const avgs = tests.map(t=>{
    const vals=students.map(s=>{const r=latest(s.id);const v=r?parseFloat(r[t.key]):NaN;return isNaN(v)?null:v;}).filter((v):v is number=>v!==null);
    return{key:t.key,avg:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null,count:vals.length};
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#111827;font-size:10px;}
        @page{size:A4 landscape;margin:10mm 12mm;}
        @media print{.no-print{display:none!important;}body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
        .page{max-width:100%;padding:20px 16px;}
        .doc-header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:14px;border-bottom:2.5px solid #111827;}
        .doc-header img{width:44px;height:44px;object-fit:contain;}
        .doc-school{font-size:17px;font-weight:800;}
        .doc-sub{font-size:10px;color:#6b7280;margin-top:2px;font-weight:500;text-transform:uppercase;letter-spacing:0.06em;}
        .doc-header-right{margin-left:auto;text-align:right;}
        .doc-header-right .cls-badge{font-size:28px;font-weight:900;color:#111827;line-height:1;}
        .doc-header-right .cls-sub{font-size:10px;color:#6b7280;margin-top:2px;}
        table{width:100%;border-collapse:collapse;}
        thead th{background:#111827;color:#fff;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;padding:8px 10px;text-align:center;white-space:pre-line;}
        thead th.left{text-align:left;}
        tbody tr:nth-child(odd) td{background:#f9fafb;}
        tbody tr:nth-child(even) td{background:#fff;}
        .avg-row td{background:#f0f9ff!important;font-weight:700;border-top:2px solid #bae6fd;}
        td{padding:7px 10px;border-bottom:1px solid #f3f4f6;text-align:center;vertical-align:middle;}
        td.left{text-align:left;}
        .name{font-size:11px;font-weight:600;color:#111827;}
        .grp-badge{display:inline-block;width:22px;height:22px;border-radius:50%;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;}
        .val-cell{font-size:12px;font-weight:700;}
        .tier-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:4px;}
        .tier-lbl{font-size:8px;font-weight:600;}
        .no-data{color:#d1d5db;}
        .doc-footer{margin-top:16px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:9px;color:#9ca3af;}
        .print-btn{position:fixed;bottom:24px;right:24px;background:#111827;color:#fff;border:none;border-radius:10px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;}
        .legend{display:flex;gap:16px;margin-bottom:14px;flex-wrap:wrap;}
        .legend-item{display:flex;align-items:center;gap:5px;font-size:9px;font-weight:500;color:#6b7280;}
        .stats-strip{display:flex;gap:24px;margin-bottom:18px;}
        .stat{text-align:center;}
        .stat .sv{font-size:20px;font-weight:800;}
        .stat .sl{font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;}
      `}</style>

      <div className="page">
        <div className="doc-header">
          <img src="/st-benedicts-logo.png" alt="SBC"/>
          <div>
            <div className="doc-school">St Benedict's College</div>
            <div className="doc-sub">High Performance Programme · Class Performance Report</div>
          </div>
          <div className="doc-header-right">
            <div className="cls-badge">{classId}</div>
            <div className="cls-sub">{grade} · {year} · {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stat"><div className="sv">{students.length}</div><div className="sl">Athletes</div></div>
          <div className="stat"><div className="sv" style={{color:'#047857'}}>{students.filter(s=>latest(s.id)).length}</div><div className="sl">Tested</div></div>
          <div className="stat"><div className="sv" style={{color:'#b45309'}}>{students.filter(s=>!latest(s.id)).length}</div><div className="sl">Untested</div></div>
        </div>

        {/* Legend */}
        <div className="legend">
          {TIERS.map(t=>(
            <div key={t.label} className="legend-item">
              <span className="tier-dot" style={{background:t.color}}/>
              {t.label}
            </div>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th className="left" style={{width:130}}>Athlete</th>
              <th style={{width:38}}>Grp</th>
              {tests.map(t=><th key={t.key}>{t.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {students.map(s=>{
              const r=latest(s.id);
              const surname=s.full_name.trim().split(' ').pop()||s.full_name;
              const firstName=s.full_name.trim().split(' ')[0]||'';
              const grpColors=['','#0369a1','#5b21b6','#b45309','#047857'];
              return(
                <tr key={s.id}>
                  <td className="left">
                    <div className="name">{surname}</div>
                    <div style={{fontSize:9,color:'#9ca3af'}}>{firstName}</div>
                  </td>
                  <td>
                    {s.training_group?(
                      <div className="grp-badge" style={{background:`${grpColors[s.training_group]||'#374151'}22`,color:grpColors[s.training_group]||'#374151',margin:'0 auto'}}>
                        {s.training_group}
                      </div>
                    ):<span className="no-data">—</span>}
                  </td>
                  {tests.map(t=>{
                    if(!r) return <td key={t.key} className="no-data">—</td>;
                    const v=parseFloat(r[t.key]);
                    if(isNaN(v)) return <td key={t.key} className="no-data">—</td>;
                    const tier=getTier(t.key,v,t.lower);
                    return(
                      <td key={t.key}>
                        <div className="val-cell" style={{color:tier.color}}>{fmt(t.key,v)}{t.unit}</div>
                        <div style={{marginTop:2}}>
                          <span className="tier-dot" style={{background:tier.color}}/>
                          <span className="tier-lbl" style={{color:tier.color}}>{tier.label}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {/* Average row */}
            <tr className="avg-row">
              <td className="left" style={{fontWeight:800,fontSize:11}}>Class Average</td>
              <td className="no-data">—</td>
              {avgs.map(a=>{
                if(!a.avg) return <td key={a.key} className="no-data">—</td>;
                const t=tests.find(x=>x.key===a.key)!;
                const tier=getTier(a.key,a.avg,t.lower);
                return(
                  <td key={a.key}>
                    <div className="val-cell" style={{color:tier.color}}>{fmt(a.key,a.avg)}{t.unit}</div>
                    <div style={{fontSize:9,color:'#6b7280',marginTop:1}}>{a.count} tested</div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="doc-footer">
          <span>St Benedict's College · High Performance Programme</span>
          <span>Confidential · Coach and Administration Use Only</span>
          <span>Generated {new Date().toLocaleDateString('en-ZA')}</span>
        </div>
      </div>

      <button className="print-btn no-print" onClick={()=>window.print()}>Save as PDF</button>
    </>
  );
}
