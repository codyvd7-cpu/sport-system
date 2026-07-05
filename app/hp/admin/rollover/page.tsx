'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;
const CLASSES = ['B','E','F','J','M'];
const G = '#10b981';
const CONFIRM = 'YEAR END ROLLOVER';

export default function Rollover() {
  const router = useRouter();
  const [students, setStudents] = React.useState<Row[]>([]);
  const [loading,  setLoading]  = React.useState(true);
  const [step,     setStep]     = React.useState<1|2|3|4>(1);
  const [busy,     setBusy]     = React.useState(false);
  const [confirm,  setConfirm]  = React.useState('');
  const [done,     setDone]     = React.useState<string[]>([]);
  const [names,    setNames]    = React.useState('');
  const [cls,      setCls]      = React.useState('B');
  const [added,    setAdded]    = React.useState(0);
  const [toast,    setToast]    = React.useState('');
  const [backing,  setBacking]  = React.useState(false);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500); }

  async function downloadBackup() {
    setBacking(true);
    try {
      const res = await fetch('/api/hp/backup', { credentials:'include' });
      if (!res.ok) { showToast('Backup failed'); setBacking(false); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `HP_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click(); URL.revokeObjectURL(url);
      showToast('Backup downloaded ✓');
    } catch { showToast('Backup failed'); }
    setBacking(false);
  }

  async function load() {
    const { data } = await supabase.from('hp_students').select('*').eq('is_active', true);
    setStudents((data || []).sort((a: Row, b: Row) => {
      if (a.grade !== b.grade) return a.grade.localeCompare(b.grade);
      return (a.full_name.trim().split(' ').pop()||'').localeCompare(b.full_name.trim().split(' ').pop()||'');
    }));
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  const g8 = students.filter(s => s.grade === 'Grade 8');
  const g9 = students.filter(s => s.grade === 'Grade 9');
  const year = new Date().getFullYear();

  async function graduateG9() {
    setBusy(true);
    if (g9.length > 0) {
      const { error } = await supabase.from('hp_students').update({ is_active:false, notes:`Graduated ${year}` }).in('id', g9.map(s=>s.id));
      if (error) { showToast(`Error: ${error.message}`); setBusy(false); return; }
    }
    setDone(d=>[...d, `${g9.length} Grade 9 students graduated and archived`]);
    try {
      await fetch('/api/hp/audit', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          action: 'students_archived',
          actor: 'HP Admin',
          details: { count: g9.length, reason: `Graduated ${year}` }
        }),
      });
    } catch {}
    showToast(`${g9.length} Grade 9 students archived ✓`);
    await load(); setBusy(false); setStep(3);
  }

  async function promoteG8() {
    setBusy(true);
    if (g8.length > 0) {
      const { error } = await supabase.from('hp_students').update({ grade:'Grade 9', training_group:null }).in('id', g8.map(s=>s.id));
      if (error) { showToast(`Error: ${error.message}`); setBusy(false); return; }
    }
    setDone(d=>[...d, `${g8.length} Grade 8 students promoted to Grade 9`]);
    // Write audit log
    try {
      await fetch('/api/hp/audit', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          action: 'grade_promoted',
          actor: 'HP Admin',
          details: { count: g8.length, from: 'Grade 8', to: 'Grade 9', year: year }
        }),
      });
    } catch {}
    showToast(`${g8.length} students promoted to Grade 9 ✓`);
    await load(); setBusy(false); setStep(4);
  }

  async function addG8s() {
    const list = names.split('\n').map(n=>n.trim()).filter(Boolean);
    if (!list.length) { showToast('No names entered.'); return; }
    setBusy(true);
    const { error } = await supabase.from('hp_students').insert(list.map(full_name=>({ full_name, grade:'Grade 8', class_group:cls, is_active:true })));
    if (error) { showToast(`Error: ${error.message}`); setBusy(false); return; }
    setAdded(a=>a+list.length); setNames('');
    showToast(`${list.length} students added to Grade 8${cls} ✓`);
    await load(); setBusy(false);
  }

  if (loading) return (
    <main className="pt-[54px] lg:pt-0 lg:pb-10" style={{minHeight:'100vh',background:'#060c1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:24,height:24,borderRadius:'50%',border:'3px solid #10b981',borderTopColor:'transparent',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );

  const BD = 'rgba(255,255,255,0.08)';
  const card:React.CSSProperties = {borderRadius:16,border:`1px solid ${BD}`,background:'rgba(255,255,255,0.03)',padding:'20px'};
  const btn = (col:string):React.CSSProperties => ({width:'100%',padding:'13px',borderRadius:12,border:`1px solid ${col}35`,background:`${col}12`,color:col,fontWeight:800,fontSize:14,cursor:'pointer'});
  const STEPS=[{n:1,l:'Review'},{n:2,l:'Graduate'},{n:3,l:'Promote'},{n:4,l:'New 8s'}];

  return (
    <main className="pt-[54px] lg:pt-0 lg:pb-10" style={{minHeight:'100vh',background:'#060c1a',color:'white'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast&&<div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',zIndex:999,background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.35)',borderRadius:12,padding:'12px 20px',color:'#10b981',fontWeight:700,fontSize:13,backdropFilter:'blur(12px)',whiteSpace:'nowrap'}}>{toast}</div>}

      <div style={{maxWidth:580,margin:'0 auto',padding:'32px 20px'}}>
        <p style={{fontSize:10,fontWeight:800,color:'#fbbf24',textTransform:'uppercase',letterSpacing:'0.2em',marginBottom:6}}>HP Admin</p>
        <h1 style={{fontSize:28,fontWeight:900,letterSpacing:'-0.02em',marginBottom:4}}>Year End Rollover</h1>
        <p style={{fontSize:13,color:'rgba(255,255,255,0.4)',marginBottom:24}}>{year} → {year+1} transition</p>

        {/* Steps */}
        <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:24}}>
          {STEPS.map((s,i)=><React.Fragment key={s.n}>
            <div style={{fontSize:11,fontWeight:800,padding:'6px 12px',borderRadius:20,
              background:step===s.n?'rgba(251,191,36,0.12)':step>s.n?'rgba(16,185,129,0.08)':'rgba(255,255,255,0.04)',
              color:step===s.n?'#fbbf24':step>s.n?G:'rgba(255,255,255,0.3)',
              border:`1px solid ${step===s.n?'rgba(251,191,36,0.25)':step>s.n?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.06)'}`,
            }}>{step>s.n?'✓ ':''}{s.l}</div>
            {i<3&&<span style={{color:'rgba(255,255,255,0.15)',fontSize:12}}>→</span>}
          </React.Fragment>)}
        </div>

        {/* Step 1 */}
        {step===1&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          <div style={{...card,border:'1px solid rgba(251,191,36,0.22)',background:'rgba(251,191,36,0.05)'}}>
            <p style={{fontSize:13,fontWeight:800,color:'#fbbf24',marginBottom:10}}>Read before proceeding</p>
            {['All test results and attendance history is preserved — nothing is deleted',
              'Grade 9 students will be archived (no longer in active lists)',
              'Grade 8 students will be promoted to Grade 9 — training groups reset',
              `You will then add new Grade 8 students for ${year+1}`,
              'This cannot be undone — only do this at the end of the school year',
            ].map((t,i)=><p key={i} style={{fontSize:12,color:'rgba(251,191,36,0.65)',display:'flex',gap:8,marginTop:5}}><span>•</span>{t}</p>)}
          </div>
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <p style={{fontSize:13,fontWeight:800}}>Grade 9 — will be archived</p>
              <span style={{fontSize:11,fontWeight:700,color:'#f87171',background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.2)',borderRadius:20,padding:'3px 10px'}}>{g9.length} students</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {g9.map(s=><span key={s.id} style={{fontSize:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BD}`,borderRadius:8,padding:'3px 8px',color:'rgba(255,255,255,0.45)'}}>{s.full_name.trim().split(' ').pop()} ({s.class_group})</span>)}
              {g9.length===0&&<p style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No Grade 9 students</p>}
            </div>
          </div>
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <p style={{fontSize:13,fontWeight:800}}>Grade 8 — will become Grade 9</p>
              <span style={{fontSize:11,fontWeight:700,color:'#38bdf8',background:'rgba(56,189,248,0.08)',border:'1px solid rgba(56,189,248,0.2)',borderRadius:20,padding:'3px 10px'}}>{g8.length} students</span>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
              {g8.map(s=><span key={s.id} style={{fontSize:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BD}`,borderRadius:8,padding:'3px 8px',color:'rgba(255,255,255,0.45)'}}>{s.full_name.trim().split(' ').pop()} 8{s.class_group}→9{s.class_group}</span>)}
              {g8.length===0&&<p style={{fontSize:12,color:'rgba(255,255,255,0.25)',fontStyle:'italic'}}>No Grade 8 students</p>}
            </div>
          </div>
          <div style={{...card,background:'rgba(0,0,0,0.25)'}}>
            {/* Backup button */}
            <div style={{marginBottom:16,padding:'12px 14px',borderRadius:12,border:'1px solid rgba(251,191,36,0.2)',background:'rgba(251,191,36,0.05)',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
              <div>
                <p style={{fontSize:12,fontWeight:800,color:'#fbbf24'}}>Step 0 — Backup first</p>
                <p style={{fontSize:11,color:'rgba(251,191,36,0.6)',marginTop:2}}>Download all HP data before proceeding</p>
              </div>
              <button onClick={downloadBackup} disabled={backing}
                style={{padding:'8px 16px',borderRadius:10,border:'1px solid rgba(251,191,36,0.35)',background:'rgba(251,191,36,0.12)',color:'#fbbf24',fontWeight:800,fontSize:12,cursor:'pointer',opacity:backing?0.6:1}}>
                {backing ? 'Backing up…' : '⬇ Download Backup'}
              </button>
            </div>

            {/* Simulation preview */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:4}}>
              {[
                {label:'Will be archived',  val:g9.length, col:'#f87171', sub:'Grade 9 graduates'},
                {label:'Will be promoted',  val:g8.length, col:'#38bdf8', sub:'Grade 8 → Grade 9'},
                {label:'New intake needed', val:0,         col:'#10b981', sub:'Add via Import'},
              ].map(s=>(
                <div key={s.label} style={{borderRadius:12,border:`1px solid rgba(255,255,255,0.06)`,background:'rgba(255,255,255,0.03)',padding:'12px',textAlign:'center'}}>
                  <p style={{fontSize:22,fontWeight:900,color:s.col,lineHeight:1,marginBottom:4}}>{s.val}</p>
                  <p style={{fontSize:9,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:2}}>{s.label}</p>
                  <p style={{fontSize:9,color:'rgba(255,255,255,0.25)'}}>{s.sub}</p>
                </div>
              ))}
            </div>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:8}}>Type <strong style={{color:'white'}}>{CONFIRM}</strong> to confirm</p>
            <input value={confirm} onChange={e=>setConfirm(e.target.value.toUpperCase())} placeholder="Type here…"
              style={{width:'100%',borderRadius:10,border:`1px solid ${BD}`,background:'rgba(255,255,255,0.05)',padding:'10px 14px',color:'white',fontSize:13,outline:'none',fontFamily:'monospace'}}/>
          </div>
          <button onClick={()=>setStep(2)} disabled={confirm!==CONFIRM} style={{...btn('#fbbf24'),opacity:confirm!==CONFIRM?0.3:1}}>I understand — Begin Rollover →</button>
        </div>}

        {/* Step 2 */}
        {step===2&&<div style={{...card,textAlign:'center',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
          <div style={{width:56,height:56,borderRadius:16,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth={1.8} style={{width:24,height:24}}><path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <h2 style={{fontSize:20,fontWeight:900}}>Graduate Grade 9s</h2>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}><strong style={{color:'white'}}>{g9.length} students</strong> will be archived. All results and attendance are permanently preserved.</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:5,width:'100%'}}>
            {g9.map(s=><span key={s.id} style={{fontSize:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BD}`,borderRadius:8,padding:'3px 8px',color:'rgba(255,255,255,0.4)'}}>{s.full_name.trim().split(' ').pop()}</span>)}
          </div>
          {g9.length>0
            ?<button onClick={graduateG9} disabled={busy} style={{...btn('#f87171'),width:'100%'}}>{busy?'Archiving…':`Archive ${g9.length} Grade 9 Students`}</button>
            :<button onClick={()=>setStep(3)} style={{...btn(G),width:'100%'}}>No Grade 9s — Skip →</button>}
        </div>}

        {/* Step 3 */}
        {step===3&&<div style={{...card,textAlign:'center',display:'flex',flexDirection:'column',gap:16,alignItems:'center'}}>
          <div style={{width:56,height:56,borderRadius:16,background:'rgba(56,189,248,0.1)',border:'1px solid rgba(56,189,248,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth={1.8} style={{width:24,height:24}}><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
          <h2 style={{fontSize:20,fontWeight:900}}>Promote to Grade 9</h2>
          <p style={{fontSize:13,color:'rgba(255,255,255,0.5)'}}><strong style={{color:'white'}}>{g8.length} students</strong> will move to Grade 9. Training groups will reset — re-assign after new testing.</p>
          <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:5,width:'100%'}}>
            {g8.map(s=><span key={s.id} style={{fontSize:10,background:'rgba(255,255,255,0.05)',border:`1px solid ${BD}`,borderRadius:8,padding:'3px 8px',color:'rgba(255,255,255,0.4)'}}>{s.full_name.trim().split(' ').pop()} 8{s.class_group}→9{s.class_group}</span>)}
          </div>
          {g8.length>0
            ?<button onClick={promoteG8} disabled={busy} style={{...btn('#38bdf8'),width:'100%'}}>{busy?'Promoting…':`Promote ${g8.length} Students to Grade 9`}</button>
            :<button onClick={()=>setStep(4)} style={{...btn(G),width:'100%'}}>No Grade 8s — Skip →</button>}
        </div>}

        {/* Step 4 */}
        {step===4&&<div style={{display:'flex',flexDirection:'column',gap:14}}>
          {done.length>0&&<div style={{...card,border:'1px solid rgba(16,185,129,0.22)',background:'rgba(16,185,129,0.05)'}}>
            <p style={{fontSize:11,fontWeight:800,color:G,marginBottom:6}}>✓ Completed</p>
            {done.map((d,i)=><p key={i} style={{fontSize:13,color:'rgba(16,185,129,0.75)'}}>{d}</p>)}
          </div>}
          <div style={card}>
            <p style={{fontSize:15,fontWeight:800,marginBottom:4}}>Add New Grade 8 Students</p>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginBottom:16}}>Paste one full name per line. Select class. Repeat for each class.</p>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>Class</p>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
              {CLASSES.map(c=><button key={c} onClick={()=>setCls(c)} style={{padding:'8px 16px',borderRadius:10,border:`1px solid ${cls===c?G+'45':BD}`,background:cls===c?`${G}12`:'rgba(255,255,255,0.04)',color:cls===c?G:'rgba(255,255,255,0.5)',fontWeight:800,fontSize:13,cursor:'pointer'}}>8{c}</button>)}
            </div>
            <p style={{fontSize:10,fontWeight:800,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8}}>Names — one per line</p>
            <textarea value={names} onChange={e=>setNames(e.target.value)} rows={8}
              placeholder={'Lorenzo Carrozzo\nJoshua Cowan\nAaryan Doorasamy'}
              style={{width:'100%',borderRadius:10,border:`1px solid ${BD}`,background:'rgba(0,0,0,0.25)',padding:'12px 14px',color:'white',fontSize:13,outline:'none',fontFamily:'monospace',resize:'vertical',marginBottom:6}}/>
            <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:14}}>{names.split('\n').filter(n=>n.trim()).length} names entered</p>
            <button onClick={addG8s} disabled={busy||!names.trim()} style={{...btn(G),opacity:!names.trim()?0.3:1}}>{busy?'Adding…':`Add to Grade 8${cls}`}</button>
            {added>0&&<p style={{textAlign:'center',fontSize:12,fontWeight:800,color:G,marginTop:10}}>{added} new students added ✓</p>}
          </div>
          <button onClick={()=>router.push('/hp')} style={btn(G)}>Done — Back to HP Dashboard →</button>
        </div>}
      </div>
    </main>
  );
}
