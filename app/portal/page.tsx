'use client';
import Link from 'next/link';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';
import { SPORTS, type SportKey } from '@/lib/sports';

type Row = Record<string, any>;

// Sport config for portal branding
const SPORT_CONFIG: Record<string, {
  label: string; color: string; accent: string;
  colorDim: string; accentBorder: string; gradient: string; spinner: string;
}> = {
  hockey:    { label: 'Hockey',     color: '#38bdf8', accent: 'rgba(56,189,248,0.15)',  colorDim: 'rgba(56,189,248,0.1)',  accentBorder: 'rgba(56,189,248,0.3)',  gradient: 'from-sky-400 via-sky-300 to-sky-500',   spinner: 'border-sky-500' },
  rugby:     { label: 'Rugby',      color: '#f87171', accent: 'rgba(248,113,113,0.15)', colorDim: 'rgba(248,113,113,0.1)', accentBorder: 'rgba(248,113,113,0.3)', gradient: 'from-red-400 via-red-300 to-red-500',   spinner: 'border-red-500' },
  cricket:   { label: 'Cricket',    color: '#fbbf24', accent: 'rgba(251,191,36,0.15)',  colorDim: 'rgba(251,191,36,0.1)',  accentBorder: 'rgba(251,191,36,0.3)',  gradient: 'from-amber-400 via-amber-300 to-amber-500', spinner: 'border-amber-500' },
  rowing:    { label: 'Rowing',     color: '#34d399', accent: 'rgba(52,211,153,0.15)',  colorDim: 'rgba(52,211,153,0.1)',  accentBorder: 'rgba(52,211,153,0.3)',  gradient: 'from-emerald-400 via-emerald-300 to-emerald-500', spinner: 'border-emerald-500' },
  swimming:  { label: 'Swimming',   color: '#818cf8', accent: 'rgba(129,140,248,0.15)', colorDim: 'rgba(129,140,248,0.1)', accentBorder: 'rgba(129,140,248,0.3)', gradient: 'from-violet-400 via-violet-300 to-violet-500', spinner: 'border-violet-500' },
  waterpolo: { label: 'Water Polo', color: '#06b6d4', accent: 'rgba(6,182,212,0.15)',   colorDim: 'rgba(6,182,212,0.1)',   accentBorder: 'rgba(6,182,212,0.3)',   gradient: 'from-cyan-400 via-cyan-300 to-cyan-500', spinner: 'border-cyan-500' },
};

function dateLabel(value?: string | null) {
  if (!value) return 'TBC';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'TBC';
  return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysSince(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

async function safeQuery<T>(
  query: PromiseLike<{ data: T | null; error: any }>,
  fallback: T
): Promise<T> {
  try {
    const res = await Promise.race([
      query,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 7000)),
    ]);
    if (!res || typeof res !== 'object') return fallback;
    if ('error' in res && res.error) return fallback;
    return 'data' in res && res.data ? res.data : fallback;
  } catch {
    return fallback;
  }
}

function PortalInner() {
  const searchParams = useSearchParams();
  const sport = (searchParams.get('sport') ||
    (typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('portal_sport='))?.split('=')[1]
      : null) || 'hockey') as SportKey;
  const sportCfg = SPORT_CONFIG[sport] || SPORT_CONFIG.hockey;

  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [activeSponsorIndex, setActiveSponsorIndex] = useState(0);
  const [weekItems, setWeekItems] = useState<Row[]>([]);
  const [reminders, setReminders] = useState<Row[]>([]);
  const [fixtures, setFixtures] = useState<Row[]>([]);
  const [expandedFixtureDate, setExpandedFixtureDate] = useState<string | null>(null);
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);
  const [results, setResults] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);
  const [gymLeaderboard, setGymLeaderboard] = useState<Row[]>([]);
  const [performanceLeaderboard, setPerformanceLeaderboard] = useState<Row[]>([]);
  const [openWeekItemId, setOpenWeekItemId] = useState<string | null>(null);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingLeaderboards, setLoadingLeaderboards] = useState(true);

  useEffect(() => {
    async function loadAll() {
      const sponsorsData = await safeQuery<Row[]>(
        supabase.from('portal_sponsors').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      const activePlanData = await safeQuery<Row[]>(
        supabase.from('portal_week_plans').select('id').eq('published', true).eq('sport', sport).order('created_at', { ascending: false }).limit(1), []
      );
      const activePlanId = activePlanData[0]?.id ?? null;
      const weekData = activePlanId
        ? await safeQuery<Row[]>(supabase.from('portal_week_plan_items').select('*').eq('week_plan_id', activePlanId).order('sort_order', { ascending: true }), [])
        : [];
      const remindersData = await safeQuery<Row[]>(
        supabase.from('portal_reminders').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      const fixturesData = await safeQuery<Row[]>(
        supabase.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport).order('fixture_date', { ascending: true }), []
      );
      const resultsData = await safeQuery<Row[]>(
        supabase.from('portal_results').select('*').eq('is_published', true).eq('sport', sport).order('result_date', { ascending: false }), []
      );
      const programsData = await safeQuery<Row[]>(
        supabase.from('portal_programs').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );
      // Fetch leaderboard data via API route (bypasses RLS)
      const lbRes = await fetch(`/api/portal/leaderboard?sport=${sport}`);
      const lbData = lbRes.ok ? await lbRes.json() : { athletes: [], attendance: [], performance: [] };
      const athletes: Row[] = lbData.athletes || [];
      const attendance: Row[] = lbData.attendance || [];
      const performance: Row[] = lbData.performance || [];

      const gym = athletes.map((athlete) => {
        const records = attendance.filter((r) => r.athlete_id === athlete.id);
        const total = records.length;
        const positive = records.filter((r) => ['present', 'late'].includes(String(r.status).toLowerCase())).length;
        const gymSessions = records.filter((r) => String(r.session_type).toLowerCase() === 'gym').length;
        const attendanceRate = total ? Math.round((positive / total) * 100) : 0;
        const score = Math.round(attendanceRate * 0.7 + Math.min(gymSessions * 6, 30));
        return { ...athlete, name: athlete.firstName || 'Athlete', attendanceRate, gymSessions, score };
      }).filter((a) => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      const perf = athletes.map((athlete) => {
        const records = performance.filter((r) => r.athlete_id === athlete.id);
        const latest = [...records].sort((a, b) => new Date(b.test_date).getTime() - new Date(a.test_date).getTime())[0];
        const days = latest ? daysSince(latest.test_date) : null;
        const recency = days === null ? 0 : days <= 7 ? 40 : days <= 14 ? 30 : days <= 30 ? 20 : 5;
        return { ...athlete, name: athlete.firstName || 'Athlete', testCount: records.length, days, score: records.length * 10 + recency };
      }).filter((a) => a.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

      setSponsors(sponsorsData);
      setWeekItems(weekData);
      setReminders(remindersData);
      setFixtures(fixturesData);
      setResults(resultsData);
      setPrograms(programsData.slice(0, 4));
      setGymLeaderboard(gym);
      setPerformanceLeaderboard(perf);
      setLoadingSponsors(false);
      setLoadingWeek(false);
      setLoadingReminders(false);
      setLoadingFixtures(false);
      setLoadingResults(false);
      setLoadingPrograms(false);
      setLoadingLeaderboards(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (sponsors.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSponsorIndex((i) => (i + 1) % sponsors.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [sponsors]);

  const activeSponsor = sponsors[activeSponsorIndex];
  const MEDALS = ['1st', '2nd', '3rd', '4th', '5th'];

  // ── derived ──────────────────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const nextFixture = fixtures.find(f => f.fixture_date >= today) || fixtures[0] || null;
  const upcomingFixtures = expandedFixtureDate==='all' ? fixtures.filter(f => f.fixture_date >= today) : fixtures.filter(f => f.fixture_date >= today).slice(0, 3);
  const latestResults = expandedResultId==='all' ? results : results.slice(0, 3);
  const [activeTab, setActiveTab] = React.useState<string>('week');

  // ── week days ─────────────────────────────────────────────────────────────
  const DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const todayDate = new Date();
  const todayDowRaw = todayDate.getDay(); // 0=Sun
  const todayDow = todayDowRaw === 0 ? 6 : todayDowRaw - 1; // 0=Mon..6=Sun
  const monday = new Date(todayDate);
  monday.setDate(todayDate.getDate() - todayDow);
  const weekDates = Array.from({length:7}, (_,i) => {
    const d = new Date(monday); d.setDate(monday.getDate()+i); return d;
  });
  // Map items to days by sort_order (0=Mon..6=Sun)
  const itemsByDay: Record<number, Row[]> = {};
  weekItems.forEach((item, idx) => {
    const dayIdx = typeof item.sort_order === 'number' ? item.sort_order : idx;
    if (!itemsByDay[dayIdx]) itemsByDay[dayIdx] = [];
    itemsByDay[dayIdx].push(item);
  });
  const [selectedDay, setSelectedDay] = React.useState<number>(todayDow);

  function outcomeOf(score: string) {
    if (!score) return null;
    const parts = score.split(/[-–]/);
    if (parts.length !== 2) return null;
    const a = parseInt(parts[0]), b = parseInt(parts[1]);
    if (a > b) return 'WIN';
    if (a < b) return 'LOSS';
    return 'DRAW';
  }
  function outcomeColor(o: string | null) {
    if (o === 'WIN') return '#22c55e';
    if (o === 'DRAW') return '#fbbf24';
    if (o === 'LOSS') return '#f87171';
    return 'rgba(255,255,255,0.3)';
  }

  const C = sportCfg.color;
  const BG = '#0a0f1e';
  const CARD = 'rgba(255,255,255,0.03)';
  const BORDER = 'rgba(255,255,255,0.07)';

  function Section({ children, style, id }: { children: React.ReactNode; style?: React.CSSProperties; id?: string }) {
    return (
      <div id={id} style={{
        position:'relative', borderRadius:18, overflow:'hidden',
        background:'rgba(255,255,255,0.035)',
        backdropFilter:'blur(20px) saturate(180%)',
        WebkitBackdropFilter:'blur(20px) saturate(180%)',
        border:'1px solid rgba(255,255,255,0.08)',
        boxShadow:'0 4px 24px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
        ...style,
      }}>
        {/* Glass specular */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.2) 30%,rgba(255,255,255,0.35) 50%,rgba(255,255,255,0.2) 70%,transparent)',pointerEvents:'none',zIndex:2}}/>
        <div style={{position:'relative',zIndex:1}}>{children}</div>
      </div>
    );
  }
  function SectionHeader({ title, sub, link, linkLabel }: { title: string; sub?: string; link?: string; linkLabel?: string }) {
    return (
      <div style={{padding:'20px 22px 14px',borderBottom:`1px solid ${BORDER}`}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <p style={{fontSize:11,fontWeight:700,letterSpacing:'0.18em',color:C,textTransform:'uppercase'}}>{title}</p>
          {link && <a href={link} style={{fontSize:11,color:C,textDecoration:'none',display:'flex',alignItems:'center',gap:4,opacity:0.8}}>
            {linkLabel||'View all'} <span>›</span>
          </a>}
        </div>
        {sub && <p style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginTop:3}}>{sub}</p>}
      </div>
    );
  }

  function DateBlock({ dateStr }: { dateStr: string }) {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2,'0');
    const mon = d.toLocaleDateString('en-ZA',{month:'short'}).toUpperCase();
    return (
      <div style={{minWidth:44,textAlign:'center'}}>
        <p style={{fontSize:24,fontWeight:800,lineHeight:1,color:'white'}}>{day}</p>
        <p style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.4)',letterSpacing:'0.05em'}}>{mon}</p>
      </div>
    );
  }
  function TeamInitial({ name }: { name: string }) {
    const initials = name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    return (
      <div style={{width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:`1px solid rgba(255,255,255,0.12)`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)',flexShrink:0}}>
        {initials}
      </div>
    );
  }

  const TABS = ['week','fixtures','results','programs','reminders'];
  const TAB_LABELS: Record<string,string> = {week:'This Week',fixtures:'Fixtures',results:'Results',programs:'Programs',reminders:'Reminders'};

  return (
    <main style={{minHeight:'100vh',background:BG,color:'white',fontFamily:'Inter,system-ui,sans-serif'}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Inter', system-ui, sans-serif; box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .portal-link:hover { color: rgba(255,255,255,0.8) !important; }
        .tab-btn:hover { background: rgba(255,255,255,0.06) !important; }
        .fixture-row:hover { background: rgba(255,255,255,0.04) !important; }
        .prog-row:hover { background: rgba(255,255,255,0.04) !important; }
        input[type=password] { -webkit-text-security: disc; }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{borderBottom:`1px solid ${BORDER}`,background:'rgba(10,15,30,0.95)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1120,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/st-benedicts-logo.png" alt="SBC" style={{width:36,height:36,objectFit:'contain'}}/>
            <div>
              <p style={{fontSize:14,fontWeight:700,color:'white',lineHeight:1}}>ST BENEDICT&apos;S COLLEGE</p>
              <p style={{fontSize:10,fontWeight:500,color:C,letterSpacing:'0.05em',marginTop:2,textTransform:'uppercase'}}>{sportCfg.label} Department</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Link href="/" className="portal-link" style={{fontSize:13,color:'rgba(255,255,255,0.5)',textDecoration:'none',padding:'6px 12px',display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:14,height:14}}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              Home
            </Link>
            <Link href={`/login?sport=${sport}`} className="portal-link" style={{fontSize:13,color:'rgba(255,255,255,0.5)',textDecoration:'none',padding:'6px 12px',display:'flex',alignItems:'center',gap:6}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:14,height:14}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Coach Login
            </Link>
            <Link href="/player" style={{background:`linear-gradient(135deg,${C}cc,${C})`,color:'white',fontSize:13,fontWeight:600,textDecoration:'none',padding:'7px 14px',borderRadius:8,display:'flex',alignItems:'center',gap:6,boxShadow:`0 4px 14px ${C}40`}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:14,height:14}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Player Login
            </Link>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1120,margin:'0 auto',padding:'32px 24px 64px'}}>

        {/* ── HERO ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 420px',gap:24,marginBottom:28,alignItems:'start'}}>
          {/* Left */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:C,display:'inline-block',boxShadow:`0 0 8px ${C}`}}/>
              <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:C,textTransform:'uppercase'}}>Live Platform</span>
            </div>
            <h1 style={{fontSize:52,fontWeight:800,lineHeight:1.05,marginBottom:16,letterSpacing:'-0.02em'}}>
              <span style={{color:'white'}}>Player &amp; Parent<br/></span>
              <span style={{color:C}}>Portal.</span>
            </h1>
            <p style={{fontSize:14,color:'rgba(255,255,255,0.45)',lineHeight:1.7,marginBottom:28,maxWidth:420}}>
              Fixtures, results, weekly programs and department updates for {sportCfg.label} players and parents.
            </p>
            <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
              {TABS.map(t=>(
                <a key={t} href={`#section-${t}`}
                  className="tab-btn"
                  style={{
                    border:'1px solid rgba(255,255,255,0.08)',
                    borderRadius:20,padding:'8px 18px',fontSize:13,fontWeight:600,cursor:'pointer',
                    transition:'all 0.15s',letterSpacing:'0.01em',textDecoration:'none',display:'inline-block',
                    background: t==='week' ? C : 'rgba(255,255,255,0.04)',
                    color: t==='week' ? 'white' : 'rgba(255,255,255,0.55)',
                  }}>
                  {TAB_LABELS[t]}
                </a>
              ))}
            </div>
          </div>
          {/* Right: next fixture */}
          {nextFixture ? (
            <div style={{borderRadius:16,border:`1px solid ${C}30`,background:`rgba(255,255,255,0.03)`,overflow:'hidden'}}>
              <div style={{padding:'14px 18px',borderBottom:`1px solid rgba(255,255,255,0.06)`}}>
                <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.2em',color:C,textTransform:'uppercase'}}>Next Fixture</p>
              </div>
              <div style={{padding:'20px 18px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:20,marginBottom:20}}>
                  {/* Home team */}
                  <div style={{textAlign:'center'}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/st-benedicts-logo.png" alt="SBC" style={{width:52,height:52,objectFit:'contain',marginBottom:6}}/>
                    <p style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.6)',letterSpacing:'0.05em',maxWidth:70,lineHeight:1.3}}>ST BENEDICT&apos;S COLLEGE</p>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.4)'}}>VS</span>
                  {/* Away team */}
                  <div style={{textAlign:'center'}}>
                    <div style={{width:52,height:52,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:'rgba(255,255,255,0.6)',marginBottom:6,margin:'0 auto 6px'}}>
                      {(nextFixture.opponent||'?').split(' ').slice(0,2).map((w:string)=>w[0]).join('').toUpperCase()}
                    </div>
                    <p style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.6)',letterSpacing:'0.05em',maxWidth:70,lineHeight:1.3}}>{(nextFixture.opponent||'TBC').toUpperCase()}</p>
                  </div>
                </div>
                <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:14,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <p style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.1em'}}>{new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{weekday:'long'})}</p>
                    <p style={{fontSize:22,fontWeight:800,color:'white',lineHeight:1.1}}>{new Date(nextFixture.fixture_date).toLocaleDateString('en-ZA',{day:'2-digit',month:'long'}).toUpperCase()}</p>
                    <p style={{fontSize:14,fontWeight:600,color:C,marginTop:2}}>{nextFixture.fixture_time||'TBC'}</p>
                    {nextFixture.venue&&<p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>📍 {nextFixture.venue}</p>}
                  </div>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',padding:'4px 10px',borderRadius:20,background:nextFixture.venue?.toLowerCase().includes('home')||nextFixture.home_away==='home' ? `${C}20` : 'rgba(255,255,255,0.06)',color:nextFixture.venue?.toLowerCase().includes('home')||nextFixture.home_away==='home' ? C : 'rgba(255,255,255,0.4)'}}>
                    {nextFixture.home_away?.toUpperCase()||'TBC'}
                  </span>
                </div>
              </div>
              <div style={{padding:'0 18px 18px'}}>
                <Link href={`/portal/fixtures?date=${nextFixture.fixture_date}&sport=${sport}`}
                  style={{width:'100%',background:`linear-gradient(135deg,${C}cc,${C})`,border:'none',borderRadius:10,padding:'12px',color:'white',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:`0 6px 20px ${C}35`,textDecoration:'none'}}>
                  View Fixture
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:14,height:14}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </Link>
              </div>
            </div>
          ) : (
            <div style={{borderRadius:16,border:`1px solid ${BORDER}`,background:CARD,padding:'32px',textAlign:'center'}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No upcoming fixtures published.</p>
            </div>
          )}
        </div>

        {/* ── WEEK AT A GLANCE ── */}
        <div id="section-week" style={{marginBottom:24,scrollMarginTop:72}}>
          <Section>
            <div style={{padding:'20px'}}>
              {loadingWeek ? (
                <p style={{fontSize:13,color:'rgba(255,255,255,0.25)',textAlign:'center',padding:'24px 0'}}>Loading...</p>
              ) : (
                <>
                  {/* ── Week strip ── */}
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:16,justifyContent:'center'}}>
                    {weekDates.map((d,i)=>{
                      const isToday    = i === todayDow;
                      const isSelected = i === selectedDay;
                      const hasItems   = !!(itemsByDay[i]?.length);
                      return (
                        <button key={i} onClick={()=>setSelectedDay(i)} style={{
                          display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                          padding:'8px 10px',borderRadius:12,border:'none',cursor:'pointer',
                          background: isSelected ? C : 'transparent',
                          transition:'all 0.2s ease',
                          boxShadow: isSelected ? `0 4px 14px ${C}50` : 'none',
                          minWidth:38,
                        }}>
                          <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.06em',color:isSelected?'white':isToday?C:'rgba(255,255,255,0.35)',textTransform:'uppercase'}}>{DAY_NAMES[i].slice(0,1)}</span>
                          <span style={{fontSize:14,fontWeight:800,lineHeight:1,color:isSelected?'white':isToday?C:'rgba(255,255,255,0.55)'}}>{d.getDate()}</span>
                          <div style={{width:4,height:4,borderRadius:'50%',background:hasItems?(isSelected?'rgba(255,255,255,0.7)':isToday?C:`${C}80`):'transparent'}}/>
                        </button>
                      );
                    })}
                  </div>

                  {/* ── Day card ── */}
                  <div style={{
                    borderRadius:20,overflow:'hidden',
                    background:`linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.025) 100%)`,
                    border:`1px solid rgba(255,255,255,0.1)`,
                    boxShadow:`0 8px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)`,
                    backdropFilter:'blur(20px)',
                    WebkitBackdropFilter:'blur(20px)',
                  }}>
                    {/* Top accent */}
                    <div style={{height:3,background:`linear-gradient(90deg,transparent,${C},transparent)`}}/>

                    {/* Day hero */}
                    <div style={{
                      padding:'20px 24px 16px',
                      background:`linear-gradient(135deg,${C}18 0%,transparent 60%)`,
                      borderBottom:'1px solid rgba(255,255,255,0.07)',
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                    }}>
                      <div>
                        {todayDow === selectedDay && (
                          <div style={{display:'inline-flex',alignItems:'center',gap:5,marginBottom:6}}>
                            <div style={{width:6,height:6,borderRadius:'50%',background:C,boxShadow:`0 0 8px ${C}`}}/>
                            <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.2em',color:C,textTransform:'uppercase'}}>Today</span>
                          </div>
                        )}
                        <p style={{fontSize:28,fontWeight:900,color:'white',lineHeight:1,letterSpacing:'-0.02em',textTransform:'uppercase'}}>
                          {DAY_NAMES[selectedDay]}
                        </p>
                        <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:3,fontWeight:500}}>
                          {weekDates[selectedDay]?.toLocaleDateString('en-ZA',{day:'numeric',month:'long',year:'numeric'})}
                        </p>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>setSelectedDay(d=>Math.max(0,d-1))} disabled={selectedDay===0}
                          style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',cursor:selectedDay===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:selectedDay===0?0.3:1,transition:'all 0.15s'}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:14,height:14}}><path d="M15 18l-6-6 6-6"/></svg>
                        </button>
                        <button onClick={()=>setSelectedDay(d=>Math.min(6,d+1))} disabled={selectedDay===6}
                          style={{width:34,height:34,borderRadius:10,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',cursor:selectedDay===6?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:selectedDay===6?0.3:1,transition:'all 0.15s'}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} style={{width:14,height:14}}><path d="M9 18l6-6-6-6"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Sessions */}
                    <div style={{padding:'16px 24px 20px'}}>
                      {!itemsByDay[selectedDay]?.length ? (
                        <div style={{textAlign:'center',padding:'28px 0'}}>
                          <div style={{fontSize:28,marginBottom:10}}></div>
                          <p style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.35)'}}>Rest Day</p>
                          <p style={{fontSize:12,color:'rgba(255,255,255,0.2)',marginTop:4}}>No sessions scheduled</p>
                        </div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:12}}>
                          {itemsByDay[selectedDay].map((item,idx)=>{
                            const bullets = (item.detail||'').split('\n').map((s:string)=>s.trim()).filter(Boolean);
                            const isMatch = (item.title||'').toLowerCase().includes('match')||(item.title||'').toLowerCase().includes('fixture')||(item.title||'').toLowerCase().includes('game');
                            return (
                              <div key={item.id||idx} style={{
                                borderRadius:14,
                                border:`1px solid ${isMatch?C+'40':'rgba(255,255,255,0.07)'}`,
                                background:isMatch?`${C}10`:'rgba(255,255,255,0.03)',
                                overflow:'hidden',
                              }}>
                                {/* Session header */}
                                <div style={{
                                  padding:'11px 14px',
                                  background:isMatch?`${C}15`:'rgba(255,255,255,0.04)',
                                  borderBottom:`1px solid ${isMatch?C+'25':'rgba(255,255,255,0.05)'}`,
                                  display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,
                                }}>
                                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                                    <div style={{width:3,height:28,borderRadius:2,background:isMatch?C:'rgba(255,255,255,0.2)',flexShrink:0}}/>
                                    <div>
                                      <p style={{fontSize:13,fontWeight:800,color:isMatch?C:'white',lineHeight:1.2}}>{item.title}</p>
                                      {item.subtitle && <p style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>{item.subtitle}</p>}
                                    </div>
                                  </div>
                                  {isMatch && (
                                    <span style={{fontSize:9,fontWeight:800,letterSpacing:'0.12em',padding:'3px 8px',borderRadius:20,background:`${C}22`,color:C,border:`1px solid ${C}35`,whiteSpace:'nowrap'}}>MATCH DAY</span>
                                  )}
                                </div>
                                {/* Bullets */}
                                {bullets.length > 0 && (
                                  <div style={{padding:'10px 14px',display:'flex',flexDirection:'column',gap:5}}>
                                    {bullets.map((b:string,bi:number)=>(
                                      <div key={bi} style={{display:'flex',alignItems:'center',gap:8}}>
                                        <div style={{width:5,height:5,borderRadius:'50%',background:C,flexShrink:0,opacity:0.7}}/>
                                        <p style={{fontSize:12,color:'rgba(255,255,255,0.75)',lineHeight:1.4,fontWeight:500}}>{b}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </Section>
        </div>

        {/* ── FIXTURES + RESULTS ── */}
        <div id="section-fixtures" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24,scrollMarginTop:72}}>

          {/* Fixtures */}
          <Section>
            <SectionHeader title="Upcoming Fixtures"/>
            <div>
              {loadingFixtures ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : upcomingFixtures.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No upcoming fixtures.</p></div>
              ) : fixtures.filter(f=>f.fixture_date>=today).slice(0,3).map((f,i,arr)=>(
                <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${sport}`}
                  className="fixture-row"
                  style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s',textDecoration:'none',color:'inherit',cursor:'pointer'}}>
                  <DateBlock dateStr={f.fixture_date}/>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>
                      {new Date(f.fixture_date).toLocaleDateString('en-ZA',{weekday:'long'})} · {f.fixture_time||'TBC'}
                    </p>
                    <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>vs {f.opponent}</p>
                    <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{f.team}{f.home_away&&` · ${f.home_away}`}</p>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8}}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/st-benedicts-logo.png" alt="SBC" style={{width:26,height:26,objectFit:'contain'}}/>
                    <span style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.25)'}}>VS</span>
                    <TeamInitial name={f.opponent||'?'}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                    <span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',padding:'3px 9px',borderRadius:20,background:`${C}18`,color:C,whiteSpace:'nowrap'}}>UPCOMING</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} style={{width:13,height:13}}><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                </Link>
              ))}
            </div>
            <div style={{padding:'12px 22px',borderTop:`1px solid ${BORDER}`}}>
              <Link href={`/portal/fixtures/season?sport=${sport}`} style={{fontSize:12,color:C,textDecoration:'none',display:'flex',alignItems:'center',gap:5,fontWeight:600}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                View full season fixtures
              </Link>
            </div>
          </Section>

          {/* Results */}
          <Section>
            <SectionHeader title="Latest Results" link="#results" linkLabel="View all"/>
            <div>
              {loadingResults ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : latestResults.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No results yet.</p></div>
              ) : latestResults.map((r,i)=>{
                const outcome = outcomeOf(r.final_score||'');
                const oc = outcomeColor(outcome);
                return (
                  <div key={r.id} className="fixture-row" style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:i<latestResults.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s'}}>
                    <DateBlock dateStr={r.result_date}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>vs {r.opponent}</p>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{r.team}</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:22,fontWeight:800,color:oc,lineHeight:1,marginBottom:3}}>{r.final_score||'—'}</p>
                      {outcome&&<span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',padding:'3px 8px',borderRadius:20,background:`${oc}18`,color:oc}}>{outcome}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:'12px 22px',borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setExpandedResultId(expandedResultId==='all'?null:'all')} style={{fontSize:12,color:C,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:0}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                {expandedResultId==='all' ? 'Show less' : 'View all results'}
              </button>
            </div>
          </Section>
        </div>

        {/* ── PROGRAMS + REMINDERS ── */}
        <div id="section-programs" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:24,scrollMarginTop:72}}>

          {/* Programs */}
          <Section>
            <SectionHeader title="Programs" sub="Current gym, mobility and recovery work." link="#" linkLabel="View all"/>
            <div>
              {loadingPrograms ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : programs.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No programs yet.</p></div>
              ) : (openWeekItemId==='programs-all' ? programs : programs.slice(0,3)).map((p,i)=>(
                
                <div key={p.id} className="prog-row" style={{display:'flex',alignItems:'center',gap:12,padding:'13px 22px',borderBottom:i<Math.min(programs.length,3)-1?`1px solid ${BORDER}`:'none',cursor:'pointer',transition:'background 0.15s'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:`${C}18`,border:`1px solid ${C}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={1.8} style={{width:18,height:18}}><path d="M6.5 6.5h11M6.5 17.5h11M3 12h18"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>{p.title}</p>
                    {p.description&&<p style={{fontSize:11,color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.description}</p>}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} style={{width:14,height:14,flexShrink:0}}><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
            <div style={{padding:'12px 22px',borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setOpenWeekItemId(openWeekItemId==='programs-all'?null:'programs-all')} style={{fontSize:12,color:C,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:0}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/></svg>
                {openWeekItemId==='programs-all' ? 'Show less' : 'View all programs'}
              </button>
            </div>
          </Section>

          {/* Reminders */}
          <Section id="section-reminders">
            <SectionHeader title="Reminders" sub="Important notices and department updates." link="#" linkLabel="View all"/>
            <div>
              {loadingReminders ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : reminders.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No reminders yet.</p></div>
              ) : (openWeekItemId==='reminders-all' ? reminders : reminders.slice(0,3)).map((r,i)=>(
                
                <div key={r.id} className="prog-row" style={{display:'flex',alignItems:'center',gap:12,padding:'13px 22px',borderBottom:i<Math.min(reminders.length,3)-1?`1px solid ${BORDER}`:'none',cursor:'pointer',transition:'background 0.15s'}}>
                  <div style={{width:40,height:40,borderRadius:10,background:'rgba(251,191,36,0.12)',border:'1px solid rgba(251,191,36,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={1.8} style={{width:18,height:18}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>{r.title}</p>
                    {(r.body||r.date)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.35)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.body||r.date}</p>}
                  </div>
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} style={{width:14,height:14,flexShrink:0}}><path d="M9 18l6-6-6-6"/></svg>
                </div>
              ))}
            </div>
            <div style={{padding:'12px 22px',borderTop:`1px solid ${BORDER}`}}>
              <button onClick={()=>setOpenWeekItemId(openWeekItemId==='reminders-all'?null:'reminders-all')} style={{fontSize:12,color:C,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:0}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/></svg>
                {openWeekItemId==='reminders-all' ? 'Show less' : 'View all reminders'}
              </button>
            </div>
          </Section>
        </div>

        {/* ── PARTNERS ── */}
        {sponsors.length > 0 && (
          <Section>
            <SectionHeader title="Our Partners" sub="Thank you to our partners for their continued support."/>
            <div style={{padding:'28px 24px',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:48}}>
              {sponsors.map((s:Row)=>(
                <div key={s.id} style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'0 16px'}}>
                  {s.image_url
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={s.image_url} alt={s.name||'Sponsor'} style={{maxHeight:64,maxWidth:180,objectFit:'contain',opacity:0.85}}/>
                    : <p style={{fontSize:20,fontWeight:800,color:'rgba(255,255,255,0.6)',letterSpacing:'0.12em'}}>{s.name}</p>
                  }
                </div>
              ))}
            </div>
          </Section>
        )}

      </div>

      {/* ── FOOTER ── */}
      <footer style={{borderTop:`1px solid ${BORDER}`,padding:'28px 24px',textAlign:'center'}}>
        <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.45em',color:`${C}55`,textTransform:'uppercase',marginBottom:8}}>Veritas In Caritate</p>
        <div style={{display:'flex',flexWrap:'wrap',justifyContent:'center',gap:'4px 10px',fontSize:10,color:'rgba(255,255,255,0.2)'}}>
          <span>© {new Date().getFullYear()} St Benedict&apos;s College {sportCfg.label} Department</span>
          <span>·</span>
          <Link href="/privacy" style={{color:'inherit',textDecoration:'none'}}>Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" style={{color:'inherit',textDecoration:'none'}}>Terms &amp; Conditions</Link>
        </div>
      </footer>

    </main>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',background:'#0a0f1e'}}/>}>
      <PortalInner />
    </Suspense>
  );
}
