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
  { key:'pushup_reps',       label:'Push Up\nReps',       unit:'reps', lower:false },
  { key:'triple_broad_jump', label:'Triple\nJump',          unit:'cm',   lower:false },
  { key:'sprint_10m',        label:'10m\nSprint',           unit:'s',    lower:true  },
  { key:'sprint_30m',        label:'30m\nSprint',           unit:'s',    lower:true  },
  { key:'run_500m',          label:'500m\nRun',             unit:'',     lower:true  },
];
const BENCH: Record<string,[number,number,number,number]> = {
  chin_up_hang:[45,25,12,5],broad_jump:[185,165,148,130],
  pushup_reps:[22,18,14,10],pushup_hold:[90,70,50,30],triple_broad_jump:[680,600,530,460],
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
    fetch(`/api/hp/data?type=class&id=${classId}&year=${year}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const sorted = (d.students || []).sort((a: Row, b: Row) => {
          const sA = a.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          const sB = b.full_name.trim().split(' ').pop()?.toLowerCase() || '';
          return sA.localeCompare(sB);
        });
        setStudents(sorted);
        setResults(d.tests || []);
        setLoading(false);
      });
  }, [classId]);

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;background:#fff;color:#0f172a;font-size:10px;-webkit-font-smoothing:antialiased;}
        @page{size:A4 landscape;margin:10mm 12mm;}
        @media print{
          .no-print{display:none!important;}
          body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}
        }
        .page{max-width:100%;padding:14px 18px;}

        /* HEADER */
        .doc-header{display:flex;align-items:center;gap:14px;margin-bottom:16px;padding:12px 16px;background:#0f172a;border-radius:10px;position:relative;overflow:hidden;}
        .doc-header::after{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#38bdf8,#6366f1,#a78bfa);}
        .doc-header img{width:36px;height:36px;object-fit:contain;}
        .doc-school{font-size:14px;font-weight:800;color:#fff;letter-spacing:-0.02em;}
        .doc-sub{font-size:8px;color:rgba(56,189,248,0.75);margin-top:2px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;}
        .doc-right{margin-left:auto;text-align:right;}
        .cls-badge{font-size:26px;font-weight:900;color:#38bdf8;line-height:1;letter-spacing:-0.03em;}
        .cls-meta{font-size:8.5px;color:rgba(255,255,255,0.35);margin-top:2px;}
        .conf-badge{display:inline-block;padding:2px 7px;border-radius:4px;font-size:7px;font-weight:700;background:rgba(248,113,113,0.2);color:#fca5a5;border:1px solid rgba(248,113,113,0.3);text-transform:uppercase;letter-spacing:0.08em;margin-top:3px;}

        /* STATS */
        .stats-strip{display:flex;gap:8px;margin-bottom:12px;}
        .stat{flex:1;text-align:center;padding:9px 8px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:8px;}
        .stat .sv{font-size:18px;font-weight:800;line-height:1;}
        .stat .sl{font-size:7px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;font-weight:700;}

        /* LEGEND */
        .legend{display:flex;gap:10px;margin-bottom:10px;flex-wrap:wrap;align-items:center;}
        .legend-label{font-size:7.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-right:4px;}
        .legend-item{display:flex;align-items:center;gap:4px;font-size:8px;font-weight:700;}

        /* TABLE */
        table{width:100%;border-collapse:collapse;}
        thead tr{background:#1e293b;}
        thead th{color:rgba(255,255,255,0.65);font-size:7.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;padding:7px 9px;text-align:center;white-space:pre-line;}
        thead th.left{text-align:left;}
        tbody tr:nth-child(odd) td{background:#f8fafc;}
        tbody tr:nth-child(even) td{background:#fff;}
        tbody tr{border-bottom:1px solid #f1f5f9;}
        .avg-row td{background:#eff6ff!important;border-top:2px solid #93c5fd!important;border-bottom:2px solid #93c5fd!important;}
        td{padding:6px 9px;text-align:center;vertical-align:middle;}
        td.left{text-align:left;}
        .name{font-size:11px;font-weight:700;color:#0f172a;}
        .firstname{font-size:8px;color:#94a3b8;margin-top:1px;}
        .grp-badge{display:inline-flex;width:20px;height:20px;border-radius:6px;font-size:8.5px;font-weight:800;align-items:center;justify-content:center;margin:0 auto;}
        .val-cell{font-size:12px;font-weight:800;letter-spacing:-0.02em;}
        .tier-pill{display:inline-block;padding:1px 5px;border-radius:3px;font-size:7px;font-weight:700;margin-top:2px;}
        .no-data{color:#cbd5e1;font-size:11px;}

        /* FOOTER */
        .doc-footer{margin-top:12px;padding-top:8px;border-top:2px solid #f1f5f9;display:flex;justify-content:space-between;font-size:7.5px;color:#94a3b8;}

        /* BUTTON */
        .print-btn{position:fixed;bottom:20px;right:20px;background:#0f172a;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.2);}
      `}</style>

      <div className="page">
        {/* Header */}
        <div className="doc-header">
          // eslint-disable-next-line @next/next/no-img-element
              <img src="/sbc-logo.svg" alt="SBC"/>
          <div>
            <div className="doc-school">St Benedict&apos;s College</div>
            <div className="doc-sub">High Performance Programme · Class Report</div>
          </div>
          <div className="doc-right">
            <div className="cls-badge">{classId}</div>
            <div className="cls-meta">{grade} · {year} · {new Date().toLocaleDateString('en-ZA',{day:'numeric',month:'short'})}</div>
            <div className="conf-badge">Confidential</div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="stats-strip">
          <div className="stat">
            <div className="sv" style={{color:'#0f172a'}}>{students.length}</div>
            <div className="sl">Athletes</div>
          </div>
          <div className="stat">
            <div className="sv" style={{color:'#059669'}}>{students.filter(s=>latest(s.id)).length}</div>
            <div className="sl">Tested</div>
          </div>
          <div className="stat">
            <div className="sv" style={{color:students.filter(s=>!latest(s.id)).length>0?'#d97706':'#94a3b8'}}>
              {students.filter(s=>!latest(s.id)).length}
            </div>
            <div className="sl">Untested</div>
          </div>
        </div>

        {/* Legend */}
        <div className="legend">
          <span className="legend-label">Tiers:</span>
          {TIERS.map(t=>(
            <div key={t.label} className="legend-item" style={{color:t.color}}>
              <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:t.color}}/>
              {t.label}
            </div>
          ))}
        </div>

        <table>
          <thead>
            <tr>
              <th className="left" style={{width:120}}>Athlete</th>
              <th style={{width:36}}>Grp</th>
              {tests.map(t=><th key={t.key}>{t.label}<br/><span style={{fontWeight:400,opacity:0.4}}>{t.unit}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {students.map(s=>{
              const r=latest(s.id);
              const surname=s.full_name.trim().split(' ').pop()||s.full_name;
              const firstName=s.full_name.trim().split(' ')[0]||'';
              const grpColors: Record<number,{bg:string;color:string}> = {
                1:{bg:'#dbeafe',color:'#1d4ed8'},
                2:{bg:'#ede9fe',color:'#6d28d9'},
                3:{bg:'#fef3c7',color:'#b45309'},
                4:{bg:'#d1fae5',color:'#047857'},
              };
              const grp=grpColors[s.training_group]||{bg:'#f1f5f9',color:'#64748b'};
              return(
                <tr key={s.id}>
                  <td className="left">
                    <div className="name">{surname}</div>
                    <div className="firstname">{firstName}</div>
                  </td>
                  <td>
                    {s.training_group?(
                      <div className="grp-badge" style={{background:grp.bg,color:grp.color}}>
                        {s.training_group}
                      </div>
                    ):<span className="no-data">—</span>}
                  </td>
                  {tests.map(t=>{
                    if(!r) return <td key={t.key}><span className="no-data">—</span></td>;
                    const v=parseFloat(r[t.key]);
                    if(isNaN(v)) return <td key={t.key}><span className="no-data">—</span></td>;
                    const tier=getTier(t.key,v,t.lower);
                    return(
                      <td key={t.key}>
                        <div className="val-cell" style={{color:tier.color}}>{fmt(t.key,v)}</div>
                        <div className="tier-pill" style={{background:`${tier.color}20`,color:tier.color}}>{tier.label}</div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="avg-row">
              <td className="left" style={{fontWeight:800,fontSize:11,color:'#1d4ed8'}}>Class Average</td>
              <td><span className="no-data">—</span></td>
              {avgs.map(a=>{
                if(!a.avg) return <td key={a.key}><span className="no-data">—</span></td>;
                const t=tests.find(x=>x.key===a.key)!;
                const tier=getTier(a.key,a.avg,t.lower);
                return(
                  <td key={a.key}>
                    <div className="val-cell" style={{color:tier.color}}>{fmt(a.key,a.avg)}</div>
                    <div style={{fontSize:7.5,color:'#94a3b8',marginTop:2}}>{a.count} tested</div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>

        <div className="doc-footer">
          <span>St Benedict&apos;s College · High Performance Programme</span>
          <span>Confidential · Coach and Administration Use Only</span>
          <span>Generated {new Date().toLocaleDateString('en-ZA')}</span>
        </div>
      </div>

      <button className="print-btn no-print" onClick={()=>window.print()}>⬇ Save as PDF</button>
    </>
  );
}