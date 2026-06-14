'use client';
import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const C = '#3b82f6';
const SPORTS = ['Hockey','Rugby','Cricket','Swimming','Rowing','Athletics'];
const GRADES = ['Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

export default function PlayerSetupPage() {
  const router = useRouter();
  const [userId, setUserId]         = React.useState<string|null>(null);
  const [existingProfile, setExisting] = React.useState<any>(null);
  const [step, setStep]             = React.useState<'form'|'matching'|'matched'|'nomatch'>('form');
  const [fullName, setFullName]     = React.useState('');
  const [grade, setGrade]           = React.useState('');
  const [sports, setSports]         = React.useState<string[]>([]);
  const [matches, setMatches]       = React.useState<any[]>([]);
  const [error, setError]           = React.useState('');
  const [isEdit, setIsEdit]         = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/player/auth'); return; }
      setUserId(user.id);
      supabase.from('player_profiles').select('*').eq('user_id', user.id).single()
        .then(({ data }) => {
          if (data) {
            // Existing profile - pre-fill form for editing
            setExisting(data);
            setFullName(data.full_name || '');
            setGrade(data.grade || '');
            setSports(data.sports || []);
            setIsEdit(true);
          }
        });
    });
  }, [router]);

  function toggleSport(s: string) {
    setSports(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !grade || sports.length === 0) {
      setError('Please fill in all fields and select at least one sport.'); return;
    }
    setError('');

    // If editing and name hasn't changed, skip matching and just save
    if (isEdit && existingProfile?.athlete_id) {
      await saveProfile(existingProfile.athlete_id);
      return;
    }

    setStep('matching');
    const { data: athleteMatches } = await supabase
      .from('athletes').select('id,full_name,team,sport')
      .ilike('full_name', `%${fullName.trim()}%`).limit(5);

    setMatches(athleteMatches || []);
    setStep(athleteMatches && athleteMatches.length > 0 ? 'matched' : 'nomatch');
  }

  async function saveProfile(athleteId: string | null) {
    if (!userId) return;
    await supabase.from('player_profiles').upsert({
      user_id: userId,
      full_name: fullName.trim(),
      grade,
      sports,
      athlete_id: athleteId,
    }, { onConflict: 'user_id' });
    router.push('/player/profile');
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: 20,
    border: `1px solid ${active ? C + '60' : 'rgba(255,255,255,0.1)'}`,
    background: active ? `${C}18` : 'rgba(255,255,255,0.04)',
    color: active ? C : 'rgba(255,255,255,0.55)',
    fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family:'Inter',sans-serif; box-sizing:border-box; }
        input:focus { outline:none; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: '#080d1a', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(59,130,246,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 520, background: 'rgba(10,15,36,0.92)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', overflow: 'hidden' }}>
          <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C}90,${C},${C}90,transparent)` }} />
          <div style={{ padding: '36px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={46} height={46} style={{ objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.18em', color: `${C}cc`, textTransform: 'uppercase', marginBottom: 2 }}>
                  {isEdit ? 'Edit Profile' : 'Player Setup'}
                </p>
                <p style={{ fontSize: 18, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                  {isEdit ? 'Update your profile' : 'Complete your profile'}
                </p>
              </div>
            </div>

            {/* Form */}
            {step === 'form' && (
              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Full name */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>Full Name</label>
                    <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. James van der Berg" required
                      style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '12px 14px', color: 'white', fontSize: 14, outline: 'none' }} />
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>Enter your name exactly as it appears in school records</p>
                  </div>

                  {/* Grade */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>Grade</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {GRADES.map(g => (
                        <button key={g} type="button" onClick={() => setGrade(g)} style={pillStyle(grade === g)}>{g}</button>
                      ))}
                    </div>
                  </div>

                  {/* Sports */}
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 8 }}>Sports I Play</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {SPORTS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSport(s)} style={pillStyle(sports.includes(s))}>{s}</button>
                      ))}
                    </div>
                  </div>

                  {error && <p style={{ fontSize: 13, color: '#f87171', textAlign: 'center', margin: 0 }}>{error}</p>}

                  <button type="submit" style={{ width: '100%', border: 'none', borderRadius: 10, padding: '14px', background: `linear-gradient(135deg,#2563eb,${C})`, boxShadow: `0 8px 28px ${C}40`, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    {isEdit ? 'Save Changes' : 'Continue'}
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{ width: 14, height: 14 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                  </button>

                  {isEdit && (
                    <button type="button" onClick={() => router.push('/player/profile')} style={{ background: 'none', border: 'none', fontSize: 13, color: 'rgba(255,255,255,0.35)', cursor: 'pointer' }}>
                      ← Back to profile
                    </button>
                  )}
                </div>
              </form>
            )}

            {/* Matching */}
            {step === 'matching' && (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', border: `3px solid ${C}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto 14px' }} />
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)' }}>Searching for your athlete record...</p>
              </div>
            )}

            {/* Matched */}
            {step === 'matched' && (
              <div>
                <div style={{ background: `${C}10`, border: `1px solid ${C}25`, borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={2} style={{ width: 16, height: 16, flexShrink: 0 }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                  <p style={{ fontSize: 13, color: C, fontWeight: 600 }}>
                    {matches.length === 1 ? 'We found a match — is this you?' : `We found ${matches.length} possible matches`}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {matches.map(m => (
                    <button key={m.id} onClick={() => saveProfile(m.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', textAlign: 'left' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{m.full_name}</p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{m.team} · {m.sport}</p>
                      </div>
                      <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={2.5} style={{ width: 15, height: 15 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
                <button onClick={() => saveProfile(null)} style={{ width: '100%', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '11px', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer' }}>
                  None of these — continue without linking
                </button>
              </div>
            )}

            {/* No match */}
            {step === 'nomatch' && (
              <div>
                <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>No athlete record found yet</p>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                    No problem — your profile is ready. Once your coach adds you to the system your personal stats will appear automatically.
                  </p>
                </div>
                <button onClick={() => saveProfile(null)} style={{ width: '100%', border: 'none', borderRadius: 10, padding: '14px', background: `linear-gradient(135deg,#2563eb,${C})`, boxShadow: `0 8px 28px ${C}40`, color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  Go to my profile
                </button>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
