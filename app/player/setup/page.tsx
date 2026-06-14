'use client';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const C = '#38bdf8';
const SPORTS = ['Hockey','Rugby','Cricket','Swimming','Rowing','Athletics'];
const GRADES = ['Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

export default function PlayerSetupPage() {
  const router = useRouter();
  const [userId, setUserId]     = React.useState<string|null>(null);
  const [step, setStep]         = React.useState<'form'|'matching'|'matched'|'nomatch'>('form');
  const [fullName, setFullName] = React.useState('');
  const [grade, setGrade]       = React.useState('');
  const [sports, setSports]     = React.useState<string[]>([]);
  const [matches, setMatches]   = React.useState<any[]>([]);
  const [error, setError]       = React.useState('');

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/player/auth'); return; }
      setUserId(user.id);
      // Check if already set up
      supabase.from('player_profiles').select('id').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) router.replace('/player/profile'); });
    });
  }, [router]);

  function toggleSport(s: string) {
    setSports(prev => prev.includes(s) ? prev.filter(x=>x!==s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !grade || sports.length===0) {
      setError('Please fill in all fields and select at least one sport.'); return;
    }
    setError(''); setStep('matching');

    // Try to match to athletes table
    const nameParts = fullName.trim().split(' ');
    const { data: athleteMatches } = await supabase
      .from('athletes')
      .select('id,full_name,team,sport')
      .ilike('full_name', `%${fullName.trim()}%`)
      .limit(5);

    setMatches(athleteMatches || []);
    setStep(athleteMatches && athleteMatches.length > 0 ? 'matched' : 'nomatch');
  }

  async function saveProfile(athleteId: string|null) {
    if (!userId) return;
    await supabase.from('player_profiles').upsert({
      user_id: userId,
      full_name: fullName.trim(),
      grade,
      sports,
      athlete_id: athleteId,
    });
    router.push('/player/profile');
  }

  const pillStyle = (active: boolean, color=C): React.CSSProperties => ({
    padding:'8px 16px',borderRadius:20,border:`1px solid ${active?color+'60':'rgba(255,255,255,0.1)'}`,
    background:active?`${color}18`:'rgba(255,255,255,0.04)',
    color:active?color:'rgba(255,255,255,0.55)',
    fontSize:13,fontWeight:600,cursor:'pointer',transition:'all 0.15s',
  });

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');*{font-family:'Inter',sans-serif;box-sizing:border-box}`}</style>
      <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',background:'#040810',position:'relative',overflow:'hidden'}}>

        <div style={{position:'absolute',inset:0,background:`radial-gradient(ellipse 60% 50% at 50% 30%,${C}08,transparent)`,zIndex:0}}/>

        <div style={{position:'relative',zIndex:10,width:'100%',maxWidth:520,background:'rgba(4,10,28,0.9)',backdropFilter:'blur(28px)',WebkitBackdropFilter:'blur(28px)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:24,boxShadow:'0 40px 80px rgba(0,0,0,0.6)',overflow:'hidden'}}>
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${C}90,${C},${C}90,transparent)`}}/>
          <div style={{padding:'36px'}}>

            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:28}}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={48} height={48} style={{objectFit:'contain'}}/>
              <div>
                <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.18em',color:C,textTransform:'uppercase'}}>Player Setup</p>
                <p style={{fontSize:18,fontWeight:800,color:'white'}}>Complete your profile</p>
              </div>
            </div>

            {/* STEP: Form */}
            {step==='form' && (
              <form onSubmit={handleSubmit}>
                <div style={{display:'flex',flexDirection:'column',gap:16}}>
                  {/* Full name */}
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:`${C}90`,textTransform:'uppercase',display:'block',marginBottom:6}}>Full Name</label>
                    <input value={fullName} onChange={e=>setFullName(e.target.value)}
                      placeholder="e.g. James van der Berg" required
                      style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'12px 14px',color:'white',fontSize:14,outline:'none'}}/>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginTop:4}}>Enter your name exactly as it appears in school records</p>
                  </div>

                  {/* Grade */}
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:`${C}90`,textTransform:'uppercase',display:'block',marginBottom:8}}>Grade</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      {GRADES.map(g=>(
                        <button key={g} type="button" onClick={()=>setGrade(g)} style={pillStyle(grade===g)}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sports */}
                  <div>
                    <label style={{fontSize:10,fontWeight:700,letterSpacing:'0.15em',color:`${C}90`,textTransform:'uppercase',display:'block',marginBottom:8}}>Sports I Play</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                      {SPORTS.map(s=>(
                        <button key={s} type="button" onClick={()=>toggleSport(s)} style={pillStyle(sports.includes(s))}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {error&&<p style={{fontSize:13,color:'#f87171',textAlign:'center'}}>{error}</p>}

                  <button type="submit"
                    style={{width:'100%',border:'none',borderRadius:12,padding:'14px',background:`linear-gradient(135deg,${C}cc,${C})`,boxShadow:`0 8px 28px ${C}40`,color:'white',fontSize:15,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                    Continue
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:14,height:14}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
              </form>
            )}

            {/* STEP: Matching */}
            {step==='matching' && (
              <div style={{textAlign:'center',padding:'32px 0'}}>
                <div style={{width:40,height:40,borderRadius:'50%',border:`3px solid ${C}`,borderTopColor:'transparent',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}}/>
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                <p style={{fontSize:14,color:'rgba(255,255,255,0.6)'}}>Searching for your athlete record...</p>
              </div>
            )}

            {/* STEP: Matched - pick record */}
            {step==='matched' && (
              <div>
                <div style={{background:`${C}10`,border:`1px solid ${C}25`,borderRadius:12,padding:'12px 14px',marginBottom:20,display:'flex',gap:10,alignItems:'center'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={2} style={{width:18,height:18,flexShrink:0}}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <p style={{fontSize:13,color:C,fontWeight:600}}>We found {matches.length === 1 ? 'a match' : 'possible matches'} — is this you?</p>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                  {matches.map(m=>(
                    <button key={m.id} onClick={()=>saveProfile(m.id)}
                      style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:12,border:`1px solid rgba(255,255,255,0.1)`,background:'rgba(255,255,255,0.04)',cursor:'pointer',textAlign:'left',transition:'background 0.15s'}}
                      onMouseOver={e=>(e.currentTarget.style.background='rgba(255,255,255,0.08)')}
                      onMouseOut={e=>(e.currentTarget.style.background='rgba(255,255,255,0.04)')}>
                      <div>
                        <p style={{fontSize:14,fontWeight:700,color:'white'}}>{m.full_name}</p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:2}}>{m.team} · {m.sport}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={2.5} style={{width:16,height:16}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </button>
                  ))}
                </div>
                <button onClick={()=>saveProfile(null)}
                  style={{width:'100%',border:'1px solid rgba(255,255,255,0.1)',borderRadius:12,padding:'11px',background:'transparent',color:'rgba(255,255,255,0.4)',fontSize:13,cursor:'pointer'}}>
                  None of these — continue without matching
                </button>
              </div>
            )}

            {/* STEP: No match */}
            {step==='nomatch' && (
              <div>
                <div style={{background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.25)',borderRadius:12,padding:'14px',marginBottom:20}}>
                  <p style={{fontSize:13,fontWeight:700,color:'#fbbf24',marginBottom:4}}>No athlete record found</p>
                  <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
                    Your profile will be created. Once your coach adds you to the system your stats will appear automatically.
                  </p>
                </div>
                <button onClick={()=>saveProfile(null)}
                  style={{width:'100%',border:'none',borderRadius:12,padding:'14px',background:`linear-gradient(135deg,${C}cc,${C})`,boxShadow:`0 8px 28px ${C}40`,color:'white',fontSize:15,fontWeight:700,cursor:'pointer'}}>
                  Continue to my profile
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
