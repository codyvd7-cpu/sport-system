'use client';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup' | 'forgot';


type FieldProps = {
  label: string; type: string; value: string;
  onChange: (v: string) => void; icon: React.ReactNode; right?: React.ReactNode;
};

function Field({ label, type, value, onChange, icon, right }: FieldProps) {
  const [focused, setFocused] = React.useState(false);
  const C = '#3b82f6';
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', display: 'block', marginBottom: 8 }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>{icon}</div>
        <input
          type={type} value={value} required
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${focused ? C + '70' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 10, padding: right ? '13px 44px 13px 42px' : '13px 14px 13px 42px',
            color: 'white', fontSize: 14, outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
            boxShadow: focused ? `0 0 0 3px ${C}20` : 'none',
          }}
        />
        {right && <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)' }}>{right}</div>}
      </div>
    </div>
  );
}

export default function PlayerAuthPage() {
  const router = useRouter();
  const [mode, setMode]           = React.useState<Mode>('signin');
  const [email, setEmail]         = React.useState('');
  const [password, setPassword]   = React.useState('');
  const [confirm, setConfirm]     = React.useState('');
  const [showPw, setShowPw]       = React.useState(false);
  const [keepMe, setKeepMe]       = React.useState(true);
  const [error, setError]         = React.useState('');
  const [info, setInfo]           = React.useState('');
  const [loading, setLoading]     = React.useState(false);

  // Redirect if already signed in
  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/player/profile');
    });
  }, [router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : err.message.includes('Email not confirmed')
        ? 'Please confirm your email first — check your inbox.'
        : err.message);
      setLoading(false); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('player_profiles').select('id').eq('user_id', user.id).single();
      router.push(prof ? '/player/profile' : '/player/setup');
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    if (err) { setError(err.message); setLoading(false); return; }
    // If session returned immediately (email confirmation disabled) go straight to setup
    if (data.session) {
      router.push('/player/setup');
    } else {
      setInfo('Check your email to confirm your account, then sign in.');
      setMode('signin');
    }
    setLoading(false);
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/player/auth`,
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setInfo('Password reset link sent — check your email.');
    setMode('signin');
    setLoading(false);
  }

  const C = '#3b82f6';

  const iconProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1.8, style: { width: 16, height: 16 } };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family:'Inter',sans-serif; box-sizing:border-box; }
        .auth-btn-primary { transition:filter 0.2s,transform 0.2s; }
        .auth-btn-primary:hover:not(:disabled) { filter:brightness(1.12); transform:translateY(-1px); }
        .auth-btn-secondary:hover { background:rgba(59,130,246,0.1) !important; }
        .icon-btn:hover { opacity:0.8; }
        .back-link:hover { color:rgba(255,255,255,0.7) !important; }
      `}</style>

      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#080d1a', position: 'relative', overflow: 'hidden' }}>

        {/* Background glow orbs */}
        <div style={{ position: 'absolute', top: -120, left: -120, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.25) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle,rgba(99,102,241,0.15) 0%,transparent 70%)', pointerEvents: 'none' }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: 480,
          background: 'rgba(10,15,36,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05)',
          padding: '40px 40px 36px',
        }}>

          {/* Logo + school */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Image src="/st-benedicts-logo.png" alt="SBC" width={68} height={68}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))', marginBottom: 12 }} />
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', marginBottom: 10 }}>
              ST BENEDICT&apos;S COLLEGE
            </p>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 6, letterSpacing: '-0.01em' }}>
              {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
              {mode === 'signin' ? 'Sign in to access your profile' : mode === 'signup' ? 'Join the Altus Performance player platform' : 'Enter your email to reset your password'}
            </p>
          </div>

          {/* Error / Info */}
          {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16, textAlign: 'center' }}>{error}</div>}
          {info  && <div style={{ background: `${C}12`, border: `1px solid ${C}35`, borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#93c5fd', marginBottom: 16, textAlign: 'center' }}>{info}</div>}

          {/* ── SIGN IN ── */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Email Address" type="email" value={email} onChange={setEmail}
                icon={<svg {...iconProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              />
              <Field label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
                icon={<svg {...iconProps}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                right={
                  <button type="button" className="icon-btn" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5, transition: 'opacity 0.15s' }}>
                    {showPw
                      ? <svg {...iconProps}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg {...iconProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                }
              />

              {/* Keep me signed in + Forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <div onClick={() => setKeepMe(p => !p)}
                    style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${keepMe ? C : 'rgba(255,255,255,0.3)'}`, background: keepMe ? C : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s', cursor: 'pointer', flexShrink: 0 }}>
                    {keepMe && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} style={{ width: 11, height: 11 }}><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Keep me signed in</span>
                </label>
                <button type="button" onClick={() => { setMode('forgot'); setError(''); setInfo(''); }}
                  style={{ background: 'none', border: 'none', fontSize: 13, fontWeight: 600, color: C, cursor: 'pointer', padding: 0 }}>
                  Forgot password?
                </button>
              </div>

              <button type="submit" disabled={loading} className="auth-btn-primary"
                style={{ width: '100%', border: 'none', borderRadius: 10, padding: '14px', background: loading ? 'rgba(59,130,246,0.4)' : `linear-gradient(135deg,#2563eb,${C})`, boxShadow: loading ? 'none' : `0 8px 28px ${C}50`, color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Signing in...' : <>Sign In <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 15, height: 15 }}><path d="M5 12h14M12 5l7 7-7 7"/></svg></>}
              </button>

              {/* OR divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.08em' }}>OR</span>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              </div>

              <button type="button" className="auth-btn-secondary" onClick={() => { setMode('signup'); setError(''); setInfo(''); }}
                style={{ width: '100%', border: `1px solid ${C}50`, borderRadius: 10, padding: '13px', background: 'transparent', color: C, fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 16, height: 16 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                Create New Account
              </button>
            </form>
          )}

          {/* ── SIGN UP ── */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Email Address" type="email" value={email} onChange={setEmail}
                icon={<svg {...iconProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              />
              <Field label="Password" type={showPw ? 'text' : 'password'} value={password} onChange={setPassword}
                icon={<svg {...iconProps}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
                right={
                  <button type="button" className="icon-btn" onClick={() => setShowPw(p => !p)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, opacity: 0.5 }}>
                    <svg {...iconProps}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                }
              />
              <Field label="Confirm Password" type="password" value={confirm} onChange={setConfirm}
                icon={<svg {...iconProps}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>}
              />
              <button type="submit" disabled={loading} className="auth-btn-primary"
                style={{ width: '100%', border: 'none', borderRadius: 10, padding: '14px', background: loading ? 'rgba(59,130,246,0.4)' : `linear-gradient(135deg,#2563eb,${C})`, boxShadow: loading ? 'none' : `0 8px 28px ${C}50`, color: 'white', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <button type="button" className="back-link" onClick={() => { setMode('signin'); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
                ← Back to Sign In
              </button>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgot} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Email Address" type="email" value={email} onChange={setEmail}
                icon={<svg {...iconProps}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
              />
              <button type="submit" disabled={loading} className="auth-btn-primary"
                style={{ width: '100%', border: 'none', borderRadius: 10, padding: '14px', background: `linear-gradient(135deg,#2563eb,${C})`, boxShadow: `0 8px 28px ${C}50`, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <button type="button" className="back-link" onClick={() => { setMode('signin'); setError(''); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'color 0.2s' }}>
                ← Back to Sign In
              </button>
            </form>
          )}

        </div>

        {/* Bottom trust bar */}
        <div style={{ position: 'relative', zIndex: 10, marginTop: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:13,height:13}}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, text: 'Secure & private' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:13,height:13}}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, text: 'Your data is protected' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:13,height:13}}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, text: 'Need help?' },
          ].map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)' }} />}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
                {item.icon} {item.text}
              </div>
            </React.Fragment>
          ))}
        </div>

      </main>
    </>
  );
}
