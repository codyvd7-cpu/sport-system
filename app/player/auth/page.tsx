'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const C = '#38bdf8';

export default function PlayerAuthPage() {
  const router = useRouter();
  const [mode, setMode] = React.useState<'signin'|'signup'>('signin');
  const [email, setEmail]       = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm]   = React.useState('');
  const [error, setError]       = React.useState('');
  const [info, setInfo]         = React.useState('');
  const [loading, setLoading]   = React.useState(false);
  const [focusedField, setFocusedField] = React.useState('');

  // Redirect if already signed in
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/player/profile');
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setInfo('');
    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.'); return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    setLoading(true);
    if (mode === 'signup') {
      const { error: err } = await supabase.auth.signUp({ email: email.trim(), password });
      if (err) { setError(err.message); setLoading(false); return; }
      setInfo('Account created! Completing your profile...');
      setTimeout(() => router.push('/player/setup'), 800);
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (err) { setError('Incorrect email or password.'); setLoading(false); return; }
      // Check if profile exists
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('player_profiles').select('id').eq('user_id', user.id).single();
        router.push(profile ? '/player/profile' : '/player/setup');
      }
    }
    setLoading(false);
  }

  function inputStyle(field: string): React.CSSProperties {
    return {
      width:'100%', boxSizing:'border-box',
      background:'rgba(255,255,255,0.05)',
      border:`1px solid ${focusedField===field ? C+'80' : 'rgba(255,255,255,0.1)'}`,
      borderRadius:12, padding:'13px 14px 13px 42px',
      color:'white', fontSize:14, outline:'none',
      transition:'border-color 0.2s, box-shadow 0.2s',
      boxShadow: focusedField===field ? `0 0 0 3px ${C}18` : 'none',
    };
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family:'Inter',sans-serif; box-sizing:border-box; }
        .mode-btn:hover { background:rgba(255,255,255,0.07) !important; }
        .submit-btn:hover:not(:disabled) { filter:brightness(1.1); transform:translateY(-1px); }
        .submit-btn { transition:all 0.2s ease; }
      `}</style>
      <main style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px 16px',position:'relative',overflow:'hidden',background:'#040810'}}>

        {/* Background */}
        <div style={{position:'absolute',inset:0,zIndex:0}}>
          <Image src="/sbc-hockey-1.jpg" alt="" fill className="object-cover object-center"
            style={{filter:'brightness(0.18) saturate(0.4)'}} priority/>
        </div>
        <div style={{position:'absolute',inset:0,zIndex:1,background:'linear-gradient(to bottom,rgba(4,8,16,0.55),rgba(4,8,16,0.4) 50%,rgba(4,8,16,0.85))'}}/>
        <div style={{position:'absolute',inset:0,zIndex:2,background:`radial-gradient(ellipse 60% 50% at 50% 40%,${C}10,transparent)`}}/>

        {/* Card */}
        <div style={{
          position:'relative',zIndex:10,width:'100%',maxWidth:460,
          background:'rgba(4,10,28,0.78)',
          backdropFilter:'blur(28px) saturate(180%)',
          WebkitBackdropFilter:'blur(28px) saturate(180%)',
          border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:24,
          boxShadow:'0 40px 90px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.1)',
          overflow:'hidden',
        }}>
          {/* Top rim */}
          <div style={{height:1,background:`linear-gradient(90deg,transparent,${C}90,${C},${C}90,transparent)`}}/>
          {/* Specular */}
          <div style={{position:'absolute',inset:0,background:'linear-gradient(140deg,rgba(255,255,255,0.07) 0%,transparent 40%)',pointerEvents:'none'}}/>

          <div style={{position:'relative',padding:'36px 36px 32px'}}>
            {/* Logo */}
            <div style={{display:'flex',justifyContent:'center',marginBottom:16}}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={64} height={64}
                style={{objectFit:'contain',filter:'drop-shadow(0 4px 16px rgba(0,0,0,0.7))'}}/>
            </div>
            <p style={{fontSize:11,fontWeight:500,letterSpacing:'0.22em',color:'rgba(255,255,255,0.5)',textAlign:'center',marginBottom:8}}>
              ST BENEDICT&apos;S COLLEGE
            </p>
            <h1 style={{fontSize:26,fontWeight:900,textAlign:'center',marginBottom:4,letterSpacing:'-0.01em'}}>
              <span style={{color:'white'}}>Player </span>
              <span style={{color:C}}>Portal</span>
            </h1>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.38)',textAlign:'center',marginBottom:24}}>
              {mode==='signin' ? 'Sign in to access your profile' : 'Create your player account'}
            </p>

            {/* Mode toggle */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:24,background:'rgba(255,255,255,0.04)',borderRadius:12,padding:4}}>
              {(['signin','signup'] as const).map(m=>(
                <button key={m} className="mode-btn" onClick={()=>{setMode(m);setError('');setInfo('');}}
                  style={{
                    border:'none',borderRadius:9,padding:'9px',fontSize:13,fontWeight:700,cursor:'pointer',
                    transition:'all 0.2s',
                    background:mode===m?C:'transparent',
                    color:mode===m?'white':'rgba(255,255,255,0.45)',
                    boxShadow:mode===m?`0 4px 12px ${C}40`:'none',
                  }}>
                  {m==='signin'?'Sign In':'Sign Up'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{position:'relative',marginBottom:12}}>
                <div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8} style={{width:16,height:16}}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </div>
                <input type="email" required placeholder="School email address" value={email}
                  onChange={e=>setEmail(e.target.value)}
                  onFocus={()=>setFocusedField('email')} onBlur={()=>setFocusedField('')}
                  style={inputStyle('email')}/>
              </div>

              {/* Password */}
              <div style={{position:'relative',marginBottom:12}}>
                <div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8} style={{width:16,height:16}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
                <input type="password" required placeholder="Password" value={password}
                  onChange={e=>setPassword(e.target.value)}
                  onFocus={()=>setFocusedField('password')} onBlur={()=>setFocusedField('')}
                  style={inputStyle('password')}/>
              </div>

              {/* Confirm password */}
              {mode==='signup' && (
                <div style={{position:'relative',marginBottom:12}}>
                  <div style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.8} style={{width:16,height:16}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input type="password" required placeholder="Confirm password" value={confirm}
                    onChange={e=>setConfirm(e.target.value)}
                    onFocus={()=>setFocusedField('confirm')} onBlur={()=>setFocusedField('')}
                    style={inputStyle('confirm')}/>
                </div>
              )}

              {error&&<div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:10,padding:'10px 14px',fontSize:13,color:'#fca5a5',marginBottom:12,textAlign:'center'}}>{error}</div>}
              {info&&<div style={{background:`${C}10`,border:`1px solid ${C}30`,borderRadius:10,padding:'10px 14px',fontSize:13,color:C,marginBottom:12,textAlign:'center'}}>{info}</div>}

              <button type="submit" disabled={loading} className="submit-btn"
                style={{
                  width:'100%',border:'none',borderRadius:12,padding:'14px',
                  background:loading?'rgba(255,255,255,0.07)':`linear-gradient(135deg,${C}cc,${C})`,
                  boxShadow:loading?'none':`0 8px 28px ${C}40`,
                  color:'white',fontSize:15,fontWeight:700,cursor:loading?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                  opacity:loading?0.5:1,
                }}>
                {loading ? 'Please wait...' : mode==='signin' ? 'Sign In' : 'Create Account'}
                {!loading&&<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:14,height:14}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>
            </form>

            <div style={{marginTop:20,textAlign:'center'}}>
              <Link href="/portal?sport=hockey" style={{fontSize:12,color:'rgba(255,255,255,0.3)',textDecoration:'none'}}>
                ← Back to Portal
              </Link>
            </div>
          </div>
        </div>

        <div style={{position:'relative',zIndex:10,marginTop:24,textAlign:'center'}}>
          <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.4em',color:`${C}40`,textTransform:'uppercase',marginBottom:4}}>Veritas In Caritate</p>
          <p style={{fontSize:9,color:'rgba(255,255,255,0.15)'}}>KINETIQ Sport · Altus (Pty) Ltd</p>
        </div>
      </main>
    </>
  );
}
