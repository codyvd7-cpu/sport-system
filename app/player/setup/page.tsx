'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// Player self-registration: identity -> physical -> sport -> medical. Creates
// the athletes record the player owns; a coach selects them into a team later.
// Medical goes to the separate access-controlled athlete_medical table.

const SPORTS = ['Hockey','Rugby','Cricket','Swimming','Rowing','Athletics','Tennis','Basketball','Water Polo','Football'];
const GRADES = ['Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

type Step = 'identity'|'physical'|'sport'|'medical'|'saving'|'done';
type School = { id:string; name:string; slug:string; primary_color:string };

// Hoisted out of render — defining a component inside render recreates it each
// pass and can remount its subtree.
function Btn({ onClick, children, primary, disabled, c }: { onClick?: ()=>void; children: React.ReactNode; primary?: boolean; disabled?: boolean; c: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ flex:1,padding:'14px',borderRadius:11,fontSize:14,fontWeight:700,cursor:'pointer',
        border: primary?'none':'1px solid rgba(255,255,255,0.12)',
        background: primary?c:'transparent', color: primary?'#03060c':'rgba(255,255,255,0.7)',
        opacity: disabled?0.4:1 }}>{children}</button>
  );
}

export default function PlayerSetupPage() {
  const { branding } = useBranding();
  const router = useRouter();
  const C = branding.primaryColor || '#3b82f6';

  const [ready,setReady] = React.useState(false);
  const [step,setStep] = React.useState<Step>('identity');
  const [error,setError] = React.useState('');
  const [schools,setSchools] = React.useState<School[]>([]);

  const [fullName,setFullName] = React.useState('');
  const [dob,setDob] = React.useState('');
  const [grade,setGrade] = React.useState('');
  const [schoolId,setSchoolId] = React.useState('');
  const [sport,setSport] = React.useState('');
  const [position,setPosition] = React.useState('');
  const [heightCm,setHeightCm] = React.useState('');
  const [weightKg,setWeightKg] = React.useState('');
  const [med,setMed] = React.useState({ conditions:'',allergies:'',medications:'',injuryHistory:'',emergencyContactName:'',emergencyContactPhone:'',medicalAidName:'',medicalAidNumber:'' });

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data:{ user } }) => {
      if (!user) { router.replace('/player/auth'); return; }
      setReady(true);
    });
    fetch('/api/school/list').then(r=>r.json()).then(d=>{
      setSchools(d.schools||[]);
      if (branding.slug && branding.slug!=='default') {
        const m=(d.schools||[]).find((s:School)=>s.slug===branding.slug);
        if (m) setSchoolId(m.id);
      }
    });
  }, [router, branding.slug]);

  async function submit() {
    setError(''); setStep('saving');
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      const res = await fetch('/api/player/register', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', ...(session?{Authorization:`Bearer ${session.access_token}`}:{}) },
        body: JSON.stringify({ fullName, dob, grade, schoolId, sport, position, heightCm, weightKg, ...med }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error||'Something went wrong.'); setStep('medical'); return; }
      setStep('done');
    } catch { setError('Something went wrong.'); setStep('medical'); }
  }

  if (!ready) return null;

  const L: React.CSSProperties = { fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6,display:'block' };
  const I: React.CSSProperties = { width:'100%',borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.03)',padding:'12px 14px',fontSize:14,color:'white',outline:'none' };
  const steps: Step[] = ['identity','physical','sport','medical'];
  const stepIdx = steps.indexOf(step);

  return (
    <main style={{ minHeight:'100vh',background:'#05070d',color:'white',padding:'40px 20px' }}>
      <div style={{ maxWidth:460,margin:'0 auto' }}>
        <header style={{ marginBottom:28 }}>
          <p style={{ fontFamily:'var(--font-ui)', fontSize:13,fontWeight:600,letterSpacing:'0.06em',fontVariantCaps:'all-small-caps',color:'var(--h-text-3)',marginBottom:10 }}>
            {branding.name!=='Altus Performance'?branding.name:'Altus Performance'}
          </p>
          <h1 style={{ fontFamily:'var(--font-display)', fontOpticalSizing:'auto', fontWeight:600, fontSize:'clamp(1.8rem,4vw,2.3rem)', lineHeight:1.05, letterSpacing:'-0.01em', color:'var(--h-text)' }}>Create your athlete profile</h1>
          <p style={{ fontSize:13,color:'rgba(255,255,255,0.4)',marginTop:8,lineHeight:1.5 }}>
            This is yours &mdash; you own it and keep it up to date. Your coach selects you into a team once it&apos;s done.
          </p>
        </header>

        {step!=='done' && step!=='saving' && (
          <div style={{ display:'flex',gap:6,marginBottom:26 }}>
            {steps.map((s,i)=>(<div key={s} style={{ flex:1,height:3,borderRadius:2,background:i<=stepIdx?C:'rgba(255,255,255,0.1)',transition:'background .3s' }}/>))}
          </div>
        )}

        {error && <div style={{ marginBottom:16,padding:'11px 14px',borderRadius:10,background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.25)',fontSize:13,color:'#fca5a5' }}>{error}</div>}

        {step==='identity' && (
          <div>
            <div style={{ marginBottom:16 }}><label style={L}>Full name</label>
              <input style={I} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Your full name"/></div>
            <div style={{ marginBottom:16 }}><label style={L}>Date of birth</label>
              <input style={I} type="date" value={dob} onChange={e=>setDob(e.target.value)}/>
              <p style={{ fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:5 }}>Used to work out your age group (U14, U16&hellip;).</p></div>
            <div style={{ marginBottom:16 }}><label style={L}>Grade</label>
              <select style={I} value={grade} onChange={e=>setGrade(e.target.value)}>
                <option value="">Select grade</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
            <div style={{ marginBottom:24 }}><label style={L}>School</label>
              <select style={I} value={schoolId} onChange={e=>setSchoolId(e.target.value)}>
                <option value="">Select your school</option>{schools.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <Btn c={C} primary disabled={!fullName||!dob||!schoolId} onClick={()=>setStep('physical')}>Continue</Btn>
          </div>
        )}

        {step==='physical' && (
          <div>
            <p style={{ fontSize:13,color:'rgba(255,255,255,0.45)',marginBottom:18,lineHeight:1.5 }}>
              Your height and weight help your coach track your development. You can skip these and add them later.</p>
            <div style={{ display:'flex',gap:12,marginBottom:24 }}>
              <div style={{ flex:1 }}><label style={L}>Height (cm)</label>
                <input style={I} type="number" value={heightCm} onChange={e=>setHeightCm(e.target.value)} placeholder="e.g. 172"/></div>
              <div style={{ flex:1 }}><label style={L}>Weight (kg)</label>
                <input style={I} type="number" value={weightKg} onChange={e=>setWeightKg(e.target.value)} placeholder="e.g. 65"/></div></div>
            <div style={{ display:'flex',gap:10 }}>
              <Btn c={C} onClick={()=>setStep('identity')}>Back</Btn>
              <Btn c={C} primary onClick={()=>setStep('sport')}>Continue</Btn></div>
          </div>
        )}

        {step==='sport' && (
          <div>
            <label style={L}>Your main sport</label>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:20 }}>
              {SPORTS.map(s=>(<button key={s} onClick={()=>setSport(s.toLowerCase())}
                style={{ padding:'13px',borderRadius:10,fontSize:13,fontWeight:600,cursor:'pointer',
                  border: sport===s.toLowerCase()?`1px solid ${C}`:'1px solid rgba(255,255,255,0.1)',
                  background: sport===s.toLowerCase()?`${C}1f`:'rgba(255,255,255,0.02)',
                  color: sport===s.toLowerCase()?'white':'rgba(255,255,255,0.55)' }}>{s}</button>))}</div>
            <div style={{ marginBottom:24 }}><label style={L}>Position <span style={{ color:'rgba(255,255,255,0.25)' }}>(optional)</span></label>
              <input style={I} value={position} onChange={e=>setPosition(e.target.value)} placeholder="e.g. Midfield, Fly-half"/></div>
            <div style={{ display:'flex',gap:10 }}>
              <Btn c={C} onClick={()=>setStep('physical')}>Back</Btn>
              <Btn c={C} primary disabled={!sport} onClick={()=>setStep('medical')}>Continue</Btn></div>
          </div>
        )}

        {step==='medical' && (
          <div>
            <div style={{ padding:'13px 15px',borderRadius:11,background:`${C}12`,border:`1px solid ${C}30`,marginBottom:18 }}>
              <p style={{ fontSize:13,fontWeight:700,color:'white',marginBottom:4 }}>Medical &amp; emergency info</p>
              <p style={{ fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.55 }}>
                Private and optional, but important for your safety. Only the head of your sport and the head of sport can see the detail &mdash; your regular coach only sees that you have a note, not what it says.</p></div>
            {([['conditions','Medical conditions','Asthma, diabetes, epilepsy\u2026'],['allergies','Allergies','e.g. penicillin, bee stings'],['medications','Medications','Anything you take regularly'],['injuryHistory','Injury history','Past injuries a coach should know about']] as const).map(([k,label,ph])=>(
              <div key={k} style={{ marginBottom:13 }}><label style={L}>{label}</label>
                <input style={I} value={(med as any)[k]} onChange={e=>setMed(m=>({ ...m,[k]:e.target.value }))} placeholder={ph}/></div>))}
            <div style={{ display:'flex',gap:12,marginBottom:13 }}>
              <div style={{ flex:1 }}><label style={L}>Emergency contact</label>
                <input style={I} value={med.emergencyContactName} onChange={e=>setMed(m=>({ ...m,emergencyContactName:e.target.value }))} placeholder="Name"/></div>
              <div style={{ flex:1 }}><label style={L}>&nbsp;</label>
                <input style={I} value={med.emergencyContactPhone} onChange={e=>setMed(m=>({ ...m,emergencyContactPhone:e.target.value }))} placeholder="Phone"/></div></div>
            <div style={{ display:'flex',gap:10,marginTop:14 }}>
              <Btn c={C} onClick={()=>setStep('sport')}>Back</Btn>
              <Btn c={C} primary onClick={submit}>Finish</Btn></div>
          </div>
        )}

        {step==='saving' && <p style={{ textAlign:'center',padding:'40px 0',color:'rgba(255,255,255,0.4)',fontSize:14 }}>Creating your profile&hellip;</p>}

        {step==='done' && (
          <div style={{ textAlign:'center',padding:'20px 0' }}>
            <div style={{ width:60,height:60,borderRadius:'50%',background:`${C}1f`,border:`2px solid ${C}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px' }}>
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke={C} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg></div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:'1.6rem', marginBottom:10, color:'var(--h-text)' }}>You&apos;re all set</h2>
            <p style={{ fontSize:13.5,color:'rgba(255,255,255,0.5)',lineHeight:1.6,maxWidth:360,margin:'0 auto 24px' }}>
              Your profile is created. Your coach will select you into a team &mdash; once they do, your fixtures, results and stats appear automatically. You can start using the app now.</p>
            <button onClick={()=>router.push('/player/profile')}
              style={{ width:'100%',border:'none',borderRadius:11,padding:'14px',background:C,color:'#03060c',fontSize:15,fontWeight:700,cursor:'pointer' }}>Go to my profile</button>
          </div>
        )}
      </div>
    </main>
  );
}
