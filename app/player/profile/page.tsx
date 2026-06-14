'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const SPORT_CFG: Record<string, { color: string; icon: string }> = {
  hockey:    { color: '#38bdf8', icon: '🏑' },
  rugby:     { color: '#f87171', icon: '🏉' },
  cricket:   { color: '#fbbf24', icon: '🏏' },
  swimming:  { color: '#818cf8', icon: '🏊' },
  rowing:    { color: '#34d399', icon: '🚣' },
  athletics: { color: '#fb923c', icon: '🏃' },
};

const BG     = '#080e1f';
const CARD   = 'rgba(255,255,255,0.03)';
const BORDER = 'rgba(255,255,255,0.07)';
const NAV_W  = 220;

function outcomeOf(s: string) {
  const p = s?.split(/[-–]/); if (!p || p.length !== 2) return null;
  const a = parseInt(p[0]), b = parseInt(p[1]);
  return a > b ? 'WIN' : a < b ? 'LOSS' : 'DRAW';
}
function oc(o: string | null) {
  return o === 'WIN' ? '#22c55e' : o === 'LOSS' ? '#f87171' : o === 'DRAW' ? '#fbbf24' : '#888';
}

const NAV_ITEMS = [
  { key: 'overview',    label: 'Overview',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { key: 'schedule',    label: 'Schedule',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
  { key: 'sports',      label: 'My Sports',   icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/><path d="M4.93 19.07l14.14-14.14"/></svg> },
  { key: 'performance', label: 'Performance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> },
  { key: 'results',     label: 'Results',     icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
  { key: 'settings',    label: 'Settings',    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:16,height:16}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
];

export default function PlayerProfilePage() {
  const router = useRouter();
  const [profile, setProfile]         = React.useState<Row | null>(null);
  const [loading, setLoading]         = React.useState(true);
  const [activeNav, setActiveNav]     = React.useState('overview');
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Data
  const [fixtures,  setFixtures]  = React.useState<Row[]>([]);
  const [results,   setResults]   = React.useState<Row[]>([]);
  const [reminders, setReminders] = React.useState<Row[]>([]);
  const [weekItems, setWeekItems] = React.useState<Row[]>([]);
  const [athlete,   setAthlete]   = React.useState<Row | null>(null);
  const [attendance, setAttendance] = React.useState<number | null>(null);
  const [dataLoading, setDataLoading] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/player/auth'); return; }
      const { data: prof } = await supabase.from('player_profiles').select('*').eq('user_id', session.user.id).maybeSingle();
      if (!prof) { router.replace('/player/setup'); return; }
      setProfile(prof);
      setLoading(false);
    });
  }, [router]);

  React.useEffect(() => {
    if (!profile) return;
    const sports = (profile.sports || []).map((s: string) => s.toLowerCase());
    if (sports.length === 0) return;
    const primary = sports[0];
    const today = new Date().toISOString().split('T')[0];
    setDataLoading(true);

    Promise.all([
      supabase.from('portal_fixtures').select('*').eq('sport', primary).eq('is_published', true).gte('fixture_date', today).order('fixture_date').limit(5),
      supabase.from('portal_results').select('*').eq('sport', primary).eq('is_published', true).order('result_date', { ascending: false }).limit(5),
      supabase.from('portal_reminders').select('*').eq('sport', primary).eq('is_published', true).order('created_at', { ascending: false }).limit(5),
      // Week plan
      supabase.from('portal_week_plans').select('id').eq('sport', primary).eq('published', true).order('created_at', { ascending: false }).limit(1),
    ]).then(async ([fx, res, rem, plans]) => {
      setFixtures(fx.data || []);
      setResults(res.data || []);
      setReminders(rem.data || []);

      if (plans.data?.length) {
        const { data: items } = await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id', plans.data[0].id).order('sort_order');
        setWeekItems(items || []);
      }

      if (profile.athlete_id) {
        const { data: ath } = await supabase.from('athletes').select('*').eq('id', profile.athlete_id).maybeSingle();
        setAthlete(ath);
        const { data: att } = await supabase.from('attendance').select('status').eq('athlete_id', profile.athlete_id);
        if (att?.length) {
          const present = att.filter((a: Row) => ['present', 'late'].includes((a.status || '').toLowerCase())).length;
          setAttendance(Math.round((present / att.length) * 100));
        }
      }
      setDataLoading(false);
    });
  }, [profile]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/portal?sport=hockey');
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '3px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
  if (!profile) return null;

  const firstName = (profile.full_name || '').split(' ')[0];
  const initials  = (profile.full_name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const sports    = (profile.sports || []).map((s: string) => s.toLowerCase());
  const primarySport = sports[0] || 'hockey';
  const primaryCfg   = SPORT_CFG[primarySport] || SPORT_CFG.hockey;

  const DAY_NAMES: Record<number, string> = { 0:'SUN', 1:'MON', 2:'TUE', 3:'WED', 4:'THU', 5:'FRI', 6:'SAT' };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{font-family:'Inter',system-ui,sans-serif;box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .nav-item:hover{background:rgba(255,255,255,0.06)!important;color:white!important;}
        .card-hover:hover{background:rgba(255,255,255,0.05)!important;}
        .stat-chip:hover{background:rgba(255,255,255,0.07)!important;}
        @media(max-width:900px){
          .sidebar{display:none!important;}
          .main-content{margin-left:0!important;}
          .three-col{grid-template-columns:1fr!important;}
          .two-col{grid-template-columns:1fr!important;}
          .profile-hero{flex-direction:column!important;gap:16px!important;}
        }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: BG, color: 'white' }}>

        {/* ── SIDEBAR ── */}
        <div className="sidebar" style={{ width: NAV_W, flexShrink: 0, background: 'rgba(5,10,24,0.98)', borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 40, overflowY: 'auto' }}>
          {/* Logo */}
          <div style={{ padding: '20px 20px 16px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={36} height={36} style={{ objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1.2 }}>ST BENEDICT&apos;S COLLEGE</p>
                <p style={{ fontSize: 9, fontWeight: 600, color: primaryCfg.color, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>{primarySport} department</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '12px 10px' }}>
            {NAV_ITEMS.map(item => {
              const isActive = activeNav === item.key;
              return (
                <button key={item.key} onClick={() => setActiveNav(item.key)} className="nav-item"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', textAlign: 'left', marginBottom: 2, transition: 'all 0.15s', background: isActive ? `${primaryCfg.color}18` : 'transparent', color: isActive ? primaryCfg.color : 'rgba(255,255,255,0.45)', fontWeight: isActive ? 700 : 500, fontSize: 13 }}>
                  {item.icon}
                  {item.label}
                  {isActive && <div style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: primaryCfg.color }} />}
                </button>
              );
            })}
          </nav>

          {/* Help */}
          <div style={{ padding: '16px', borderTop: `1px solid ${BORDER}`, margin: '0 10px 16px', borderRadius: 12, background: CARD }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${primaryCfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={primaryCfg.color} strokeWidth={2} style={{ width: 14, height: 14 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
              </div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Need Help?</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>Contact the {primarySport} Department</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN ── */}
        <div className="main-content" style={{ flex: 1, marginLeft: NAV_W, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

          {/* Top bar */}
          <header style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(5,10,24,0.95)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 24px', gap: 16 }}>
            {/* Notifications */}
            <button style={{ position: 'relative', background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`, borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={2} style={{ width: 16, height: 16 }}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              {reminders.length > 0 && <div style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, borderRadius: '50%', background: primaryCfg.color, fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{Math.min(reminders.length, 9)}</div>}
            </button>
            {/* User */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, borderRadius: 24, padding: '4px 14px 4px 4px' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg,#1d4ed8,${primaryCfg.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white' }}>{initials}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'white' }}>{profile.full_name}</span>
              <button onClick={handleSignOut} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>Sign out</button>
            </div>
          </header>

          {/* Page content */}
          <div style={{ padding: '24px', flex: 1, maxWidth: 1200 }}>

            {/* ── PROFILE HERO ── */}
            <div className="profile-hero" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
              {/* Main profile card */}
              <div style={{ flex: 1, borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, padding: '24px', display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Avatar */}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg,#1d4ed8,${primaryCfg.color})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'white', boxShadow: `0 8px 24px ${primaryCfg.color}30` }}>
                    {initials}
                  </div>
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>
                    Welcome back, <span style={{ color: primaryCfg.color, fontWeight: 700 }}>{firstName}</span>
                  </p>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 4, letterSpacing: '-0.02em' }}>{profile.full_name}</h1>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>Here&apos;s what&apos;s happening with your sports.</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
                    {[
                      { label: 'Grade', value: profile.grade || '—' },
                      { label: 'Primary Sport', value: primarySport.charAt(0).toUpperCase() + primarySport.slice(1) },
                      { label: 'Team', value: athlete?.team || '—' },
                    ].map(item => (
                      <div key={item.label}>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{item.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Link href="/player/setup" style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,0.04)', alignSelf: 'flex-start' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: 13, height: 13 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  Edit Profile
                </Link>
              </div>

              {/* My Sports card */}
              <div style={{ width: 260, borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, padding: '20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>My Sports</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sports.slice(0, 4).map((sport, i) => {
                    const cfg = SPORT_CFG[sport] || SPORT_CFG.hockey;
                    return (
                      <div key={sport} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: i === 0 ? `${cfg.color}12` : 'rgba(255,255,255,0.03)', border: `1px solid ${i === 0 ? cfg.color + '30' : BORDER}` }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${cfg.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                          {cfg.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'white', textTransform: 'capitalize' }}>{sport}</p>
                          {athlete?.team && i === 0 && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{athlete.team}</p>}
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 20, background: i === 0 ? `${cfg.color}22` : 'rgba(255,255,255,0.07)', color: i === 0 ? cfg.color : 'rgba(255,255,255,0.4)', border: `1px solid ${i === 0 ? cfg.color + '35' : 'transparent'}` }}>
                          {i === 0 ? 'PRIMARY' : 'SECONDARY'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── 3-COL MIDDLE ── */}
            <div className="three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

              {/* Upcoming Schedule */}
              <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: primaryCfg.color, textTransform: 'uppercase' }}>Upcoming Schedule</p>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {dataLoading ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px' }}>Loading...</p>
                    : weekItems.length === 0 && fixtures.length === 0 ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px', fontStyle: 'italic' }}>No schedule published yet.</p>
                    : [...weekItems.slice(0, 3).map(w => ({ type: 'session', ...w })), ...fixtures.slice(0, 2).map(f => ({ type: 'fixture', ...f }))].slice(0, 5).map((item, i) => {
                      const isMatch = item.type === 'fixture';
                      const C = isMatch ? '#fbbf24' : primaryCfg.color;
                      return (
                        <div key={i} className="card-hover" style={{ display: 'flex', gap: 12, padding: '10px 18px', borderBottom: i < 4 ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s' }}>
                          <div style={{ minWidth: 34, textAlign: 'center' }}>
                            {isMatch ? (
                              <>
                                <p style={{ fontSize: 16, fontWeight: 900, color: 'white', lineHeight: 1 }}>{new Date(item.fixture_date).getDate()}</p>
                                <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{new Date(item.fixture_date).toLocaleDateString('en-ZA', { month: 'short' })}</p>
                              </>
                            ) : (
                              <>
                                <p style={{ fontSize: 10, fontWeight: 700, color: C }}>{item.day_label?.substring(0, 3)?.toUpperCase() || '—'}</p>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: C, margin: '4px auto 0', opacity: 0.6 }} />
                              </>
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 1 }}>{isMatch ? `vs ${item.opponent}` : item.title}</p>
                            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{isMatch ? `${item.fixture_time || 'TBC'} · ${item.venue || ''}` : ''}</p>
                          </div>
                          {isMatch && <span style={{ fontSize: 8, fontWeight: 800, padding: '2px 6px', borderRadius: 20, background: '#fbbf2422', color: '#fbbf24', border: '1px solid #fbbf2435', alignSelf: 'center', whiteSpace: 'nowrap' }}>MATCH</span>}
                          {!isMatch && item.team && <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 20, background: `${primaryCfg.color}15`, color: primaryCfg.color, alignSelf: 'center', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{item.team?.substring(0, 8)}</span>}
                        </div>
                      );
                    })}
                  <div style={{ padding: '10px 18px' }}>
                    <button onClick={() => setActiveNav('schedule')} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: primaryCfg.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      View full schedule <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Latest Updates */}
              <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: primaryCfg.color, textTransform: 'uppercase' }}>Latest Updates</p>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {dataLoading ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px' }}>Loading...</p>
                    : reminders.length === 0 ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px', fontStyle: 'italic' }}>No updates yet.</p>
                    : reminders.slice(0, 4).map((r, i) => (
                      <div key={r.id} className="card-hover" style={{ display: 'flex', gap: 12, padding: '11px 18px', borderBottom: i < Math.min(reminders.length - 1, 3) ? `1px solid ${BORDER}` : 'none', transition: 'background 0.15s', cursor: 'pointer' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: primaryCfg.color, flexShrink: 0, marginTop: 4, opacity: 0.7 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 3 }}>{r.title}</p>
                          {(r.details || r.body) && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{r.details || r.body}</p>}
                          {r.date && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 3 }}>{r.date}</p>}
                        </div>
                      </div>
                    ))}
                  <div style={{ padding: '10px 18px' }}>
                    <button onClick={() => {}} style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, color: primaryCfg.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                      View all announcements <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Upcoming Games */}
              <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: primaryCfg.color, textTransform: 'uppercase' }}>Upcoming Games</p>
                </div>
                <div style={{ padding: '8px 0' }}>
                  {dataLoading ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px' }}>Loading...</p>
                    : fixtures.length === 0 ? <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', padding: '16px 18px', fontStyle: 'italic' }}>No upcoming games.</p>
                    : fixtures.slice(0, 4).map((f, i) => (
                      <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${primarySport}`} className="card-hover"
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: i < Math.min(fixtures.length - 1, 3) ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', color: 'inherit', transition: 'background 0.15s' }}>
                        <div style={{ minWidth: 40, textAlign: 'center' }}>
                          <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{new Date(f.fixture_date).toLocaleDateString('en-ZA', { month: 'short' }).toUpperCase()}</p>
                          <p style={{ fontSize: 20, fontWeight: 900, color: 'white', lineHeight: 1 }}>{new Date(f.fixture_date).getDate()}</p>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: 'white', marginBottom: 2 }}>{f.opponent}</p>
                          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{f.team} · {f.fixture_time || 'TBC'}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: f.home_away === 'home' ? primaryCfg.color : 'rgba(255,255,255,0.4)' }}>{(f.home_away || '').toUpperCase() || '—'}</p>
                        </div>
                      </Link>
                    ))}
                  <div style={{ padding: '10px 18px' }}>
                    <Link href={`/portal/fixtures/season?sport=${primarySport}`} style={{ fontSize: 12, fontWeight: 600, color: primaryCfg.color, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                      View all games <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{ width: 12, height: 12 }}><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* ── BOTTOM ROW ── */}
            <div className="two-col" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>

              {/* Performance Overview */}
              <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: primaryCfg.color, textTransform: 'uppercase' }}>Performance Overview</p>
                  <Link href={`/portal/fixtures/season?sport=${primarySport}&tab=results`} style={{ fontSize: 11, color: primaryCfg.color, textDecoration: 'none', fontWeight: 600 }}>View full stats</Link>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Training Attendance', value: attendance !== null ? `${attendance}%` : '—', sub: attendance !== null ? 'from recorded sessions' : 'Link athlete to see stats', up: true },
                    { label: 'Results', value: `${results.filter(r => outcomeOf(r.final_score || '') === 'WIN').length}W ${results.filter(r => outcomeOf(r.final_score || '') === 'DRAW').length}D ${results.filter(r => outcomeOf(r.final_score || '') === 'LOSS').length}L`, sub: `${results.length} games recorded`, up: null },
                    { label: 'Upcoming Fixtures', value: String(fixtures.length), sub: 'this season', up: null },
                  ].map(stat => (
                    <div key={stat.label} style={{ flex: 1, minWidth: 140, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px' }}>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>{stat.label}</p>
                      <p style={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1, marginBottom: 4 }}>{stat.value}</p>
                      <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{stat.sub}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Access */}
              <div style={{ borderRadius: 16, background: CARD, border: `1px solid ${BORDER}`, padding: '20px', minWidth: 260 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', color: primaryCfg.color, textTransform: 'uppercase', marginBottom: 14 }}>Quick Access</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Portal', href: `/portal?sport=${primarySport}`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:20,height:20}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg> },
                    { label: 'Fixtures', href: `/portal/fixtures/season?sport=${primarySport}`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:20,height:20}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
                    { label: 'Results', href: `/portal/fixtures/season?sport=${primarySport}&tab=results`, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:20,height:20}}><path d="M18 20V10M12 20V4M6 20v-6"/></svg> },
                    { label: 'Edit Profile', href: '/player/setup', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:20,height:20}}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
                  ].map(item => (
                    <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BORDER}`, textDecoration: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, transition: 'all 0.15s' }}
                      onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.color = 'white'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
