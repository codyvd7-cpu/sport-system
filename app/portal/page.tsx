'use client';
import PortalAuthGuard from '@/components/PortalAuthGuard';
import Link from 'next/link';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [results, setResults] = useState<Row[]>([]);
  const [programs, setPrograms] = useState<Row[]>([]);
  const [spotlight, setSpotlight] = useState<Row[]>([]);
  const [openWeekItemId, setOpenWeekItemId] = useState<string | null>(null);
  const [loadingSponsors, setLoadingSponsors] = useState(true);
  const [loadingWeek, setLoadingWeek] = useState(true);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [loadingFixtures, setLoadingFixtures] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingSpotlight, setLoadingSpotlight] = useState(true);

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
      const spotlightData = await safeQuery<Row[]>(
        supabase.from('portal_spotlight').select('*').eq('is_published', true).eq('sport', sport).order('sort_order', { ascending: true }), []
      );

      setSponsors(sponsorsData);
      setWeekItems(weekData);
      setReminders(remindersData);
      setFixtures(fixturesData);
      setResults(resultsData);
      setPrograms(programsData.slice(0, 4));
      setSpotlight(spotlightData);
      setLoadingSponsors(false);
      setLoadingWeek(false);
      setLoadingReminders(false);
      setLoadingFixtures(false);
      setLoadingResults(false);
      setLoadingPrograms(false);
      setLoadingSpotlight(false);
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

  // ── stable derived values (memoized to prevent re-animation) ─────────────
  const DAY_NAMES = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  const DAY_LABEL_MAP: Record<string,number> = React.useMemo(()=>({
    monday:0,tuesday:1,wednesday:2,thursday:3,friday:4,saturday:5,sunday:6,
    mon:0,tue:1,wed:2,thu:3,fri:4,sat:5,sun:6,
  }),[]);

  const { today, todayDow, weekDates } = React.useMemo(()=>{
    const d = new Date();
    const raw = d.getDay();
    const dow = raw === 0 ? 6 : raw - 1;
    const mon = new Date(d);
    mon.setDate(d.getDate() - dow);
    return {
      today: d.toISOString().split('T')[0],
      todayDow: dow,
      weekDates: Array.from({length:7}, (_,i) => {
        const dd = new Date(mon); dd.setDate(mon.getDate()+i); return dd;
      }),
    };
  },[]);

  const itemsByDay = React.useMemo(()=>{
    const map: Record<number, Row[]> = {};
    weekItems.forEach(item => {
      const idx = DAY_LABEL_MAP[(item.day_label||'').toLowerCase().trim()] ?? -1;
      if (idx >= 0) { if (!map[idx]) map[idx]=[]; map[idx].push(item); }
    });
    return map;
  },[weekItems, DAY_LABEL_MAP]);

  const nextFixture = React.useMemo(()=>
    fixtures.find(f => f.fixture_date >= today) || fixtures[0] || null
  ,[fixtures, today]);

  const upcomingFixtures = React.useMemo(()=>
    fixtures.filter(f => f.fixture_date >= today).slice(0, 3)
  ,[fixtures, today]);

  const latestResults = React.useMemo(()=>
    results.slice(0, 3)
  ,[results]);

  const [activeTab, setActiveTab] = React.useState<string>('week');
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

        /* ── Responsive grids ── */
        .p-hero    { display:grid; grid-template-columns:1fr 420px; gap:24px; margin-bottom:28px; align-items:start; }
        .p-two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:24px; scroll-margin-top:72px; }
        .p-three   { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; }
        .p-days    { display:grid; grid-template-columns:repeat(6,1fr); gap:4px; margin-bottom:16px; }
        .p-nav-txt { display:inline-flex; align-items:center; gap:6px; }

        @media(max-width:900px) {
          .p-hero { grid-template-columns:1fr; }
        }
        @media(max-width:640px) {
          .p-two-col { grid-template-columns:1fr; }
          .p-three   { grid-template-columns:1fr; gap:8px; }
          .p-nav-txt { display:none; }
          .p-days    { gap:2px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{borderBottom:`1px solid ${BORDER}`,background:'rgba(10,15,30,0.95)',backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:50}}>
        <div style={{maxWidth:1120,margin:'0 auto',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
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
            <Link href="/player/auth" style={{background:`linear-gradient(135deg,${C}cc,${C})`,color:'white',fontSize:13,fontWeight:600,textDecoration:'none',padding:'7px 14px',borderRadius:8,display:'flex',alignItems:'center',gap:6,boxShadow:`0 4px 14px ${C}40`}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{width:14,height:14}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              Player Login
            </Link>
          </div>
        </div>
      </nav>

      <div style={{maxWidth:1120,margin:'0 auto',padding:'24px 16px 64px'}}>

        {/* ── HERO ── */}
        <div className='p-hero'>
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
            <div style={{borderRadius:16,border:`1px solid ${C}30`,overflow:'hidden',position:'relative'}}>
              {/* Background photo */}
              <div style={{position:'absolute',inset:0,zIndex:0}}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/sbc-hockey-1.jpg" alt="" style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',filter:'brightness(0.22) saturate(0.5)'}}/>
              </div>
              <div style={{position:'absolute',inset:0,background:`linear-gradient(135deg,${C}15,rgba(4,8,16,0.85))`,zIndex:1}}/>
              <div style={{position:'relative',zIndex:2}}>
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
                    {nextFixture.venue&&<p style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:2}}>{nextFixture.venue}</p>}
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
              </div>{/* end z-index wrapper */}
            </div>
          ) : (
            <div style={{borderRadius:16,border:`1px solid ${BORDER}`,background:CARD,padding:'32px',textAlign:'center'}}>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No upcoming fixtures published.</p>
            </div>
          )}
        </div>

        {/* ── WEEK AT A GLANCE ── */}
        {/* ── WEEK AT A GLANCE ── */}
        <motion.div id="section-week" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:0.15,duration:0.4}} style={{marginBottom:24,scrollMarginTop:72}}>
          <Section>
            <div style={{padding:'18px 20px 20px'}}>

              {/* Label */}
              <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.22em',color:C,textTransform:'uppercase',marginBottom:14}}>Week at a Glance</p>

              {/* Day strip — all 6 visible */}
              <div className='p-days'>
                {[0,1,2,3,4,5].map(i=>{
                  const isToday=i===todayDow, isSel=i===selectedDay, has=!!(itemsByDay[i]?.length);
                  return (
                    <button key={i} onClick={()=>setSelectedDay(i)} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                      padding:'8px 4px 6px',borderRadius:10,border:'none',cursor:'pointer',
                      transition:'all 0.18s ease',
                      background:isSel?C:isToday?`${C}15`:'rgba(255,255,255,0.03)',
                      outline:!isSel&&isToday?`1.5px solid ${C}45`:'none',
                      boxShadow:isSel?`0 4px 14px ${C}40`:'none',
                    }}>
                      <span style={{fontSize:8,fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:isSel?'rgba(255,255,255,0.7)':isToday?C:'rgba(255,255,255,0.3)'}}>{DAY_NAMES[i]}</span>
                      <span style={{fontSize:17,fontWeight:800,lineHeight:1,color:isSel?'white':isToday?C:'rgba(255,255,255,0.6)'}}>{weekDates[i].getDate()}</span>
                      <div style={{width:has?16:4,height:3,borderRadius:2,background:has?(isSel?'rgba(255,255,255,0.55)':C):'rgba(255,255,255,0.08)',transition:'width 0.2s'}}/>
                    </button>
                  );
                })}
              </div>

              {/* Detail panel */}
              {loadingWeek ? (
                <p style={{fontSize:12,color:'rgba(255,255,255,0.2)',padding:'8px 0'}}>Loading...</p>
              ) : (
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={selectedDay}
                    initial={{opacity:0, x:10}}
                    animate={{opacity:1, x:0}}
                    exit={{opacity:0, x:-10}}
                    transition={{duration:0.18, ease:'easeOut'}}
                    style={{borderRadius:12,border:`1px solid ${C}20`,background:`${C}07`,padding:'14px 16px',minHeight:64}}>
                    {/* Day label */}
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                      <p style={{fontSize:12,fontWeight:700,color:C,textTransform:'uppercase',letterSpacing:'0.1em'}}>{DAY_NAMES[selectedDay]}</p>
                      <p style={{fontSize:11,color:'rgba(255,255,255,0.35)'}}>{weekDates[selectedDay]?.toLocaleDateString('en-ZA',{day:'numeric',month:'long'})}</p>
                      {todayDow===selectedDay&&<span style={{fontSize:8,fontWeight:800,letterSpacing:'0.1em',padding:'2px 7px',borderRadius:20,background:`${C}22`,color:C,border:`1px solid ${C}35`}}>TODAY</span>}
                    </div>
                    {!itemsByDay[selectedDay]?.length ? (
                      <p style={{fontSize:12,color:'rgba(255,255,255,0.22)',fontStyle:'italic'}}>Rest day — no sessions scheduled.</p>
                    ) : (
                      <div style={{display:'flex',flexDirection:'column',gap:10}}>
                        {itemsByDay[selectedDay].map((item,si,arr)=>{
                          const bullets=(item.details||item.detail||'').split('\n').map((s:string)=>s.trim()).filter(Boolean);
                          const isMDay=(item.title||'').toLowerCase().includes('match')||(item.title||'').toLowerCase().includes('fixture')||(item.title||'').toLowerCase().includes('vs ');
                          const ac=isMDay?'#fbbf24':C;
                          return (
                            <div key={item.id||si}>
                              {si>0&&<div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:10}}/>}
                              <div style={{display:'flex',gap:10}}>
                                <div style={{width:2,flexShrink:0,borderRadius:1,background:`linear-gradient(to bottom,${ac},${ac}30)`,alignSelf:'stretch',minHeight:16}}/>
                                <div style={{flex:1}}>
                                  <p style={{fontSize:13,fontWeight:700,color:isMDay?'#fbbf24':'white',marginBottom:bullets.length?5:0}}>{item.title}</p>
                                  {bullets.map((b:string,bi:number)=>(
                                    <div key={bi} style={{display:'flex',alignItems:'flex-start',gap:6,marginBottom:3}}>
                                      <div style={{width:3,height:3,borderRadius:'50%',background:ac,flexShrink:0,marginTop:6,opacity:0.5}}/>
                                      <p style={{fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.55}}>{b}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}

              {/* Dot nav */}
              <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:12}}>
                {[0,1,2,3,4,5].map(i=>(
                  <div key={i} style={{
                    width:i===selectedDay?20:4,height:3,borderRadius:2,
                    transition:'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    background:i===selectedDay?C:i===todayDow?`${C}55`:itemsByDay[i]?.length?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.06)',
                  }}/>
                ))}
              </div>
            </div>
          </Section>
        </motion.div>

        <div id='section-fixtures' className='p-two-col'>

          {/* Fixtures */}
          <Section>
            <SectionHeader title="Upcoming Fixtures"/>
            <div>
              {loadingFixtures ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : upcomingFixtures.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No upcoming fixtures.</p></div>
              ) : fixtures.filter(f=>f.fixture_date>=today).slice(0,3).map((f,i,arr)=>(
                <motion.div key={f.id}
                  initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                  transition={{delay:i*0.05,duration:0.25}} layout="position">
                <Link href={`/portal/fixtures?date=${f.fixture_date}&sport=${sport}`}
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
                </motion.div>
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
            <SectionHeader title="Latest Results"/>
            <div>
              {loadingResults ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : latestResults.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No results yet.</p></div>
              ) : latestResults.map((r,i)=>{
                const outcome = outcomeOf(r.final_score||'');
                const oc = outcomeColor(outcome);
                return (
                  <motion.div key={r.id}
                    initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    transition={{delay:i*0.05,duration:0.25}} layout="position">
                  <Link href={`/portal/fixtures/season?sport=${sport}&tab=results`}
                    className="fixture-row"
                    style={{display:'flex',alignItems:'center',gap:14,padding:'14px 22px',borderBottom:i<latestResults.length-1?`1px solid ${BORDER}`:'none',transition:'background 0.15s',textDecoration:'none',color:'inherit',cursor:'pointer'}}>
                    <DateBlock dateStr={r.result_date}/>
                    <div style={{flex:1,minWidth:0}}>
                      <p style={{fontSize:10,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:2}}>{r.team}</p>
                      <p style={{fontSize:13,fontWeight:700,color:'white',marginBottom:2}}>vs {r.opponent}</p>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                      <p style={{fontSize:22,fontWeight:800,color:oc,lineHeight:1}}>{r.final_score||'—'}</p>
                      {outcome&&<span style={{fontSize:9,fontWeight:700,letterSpacing:'0.1em',padding:'3px 8px',borderRadius:20,background:`${oc}18`,color:oc,border:`1px solid ${oc}25`}}>{outcome}</span>}
                    </div>
                  </Link>
                  </motion.div>
                );
              })}
            </div>
            <div style={{padding:'12px 22px',borderTop:`1px solid ${BORDER}`}}>
              <Link href={`/portal/fixtures/season?sport=${sport}&tab=results`} style={{fontSize:12,color:C,textDecoration:'none',display:'flex',alignItems:'center',gap:5,fontWeight:600}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:13,height:13}}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                View full season results
              </Link>
            </div>
          </Section>
        </div>

        {/* ── PROGRAMS + REMINDERS ── */}
        <div id='section-programs' className='p-two-col'>

          {/* Programs */}
          <Section>
            <SectionHeader title="Programs" sub="Current gym, mobility and recovery work."/>
            <div>
              {loadingPrograms ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : programs.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No programs published yet.</p></div>
              ) : (openWeekItemId==='programs-all' ? programs : programs.slice(0,3)).map((p,i,arr)=>(
                <div key={p.id} style={{padding:'14px 20px',borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none'}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                    <div style={{width:38,height:38,borderRadius:10,background:`${C}14`,border:`1px solid ${C}22`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth={1.8} style={{width:17,height:17}}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      {(p.category||p.tag)&&<span style={{fontSize:9,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:`${C}80`,display:'block',marginBottom:3}}>{p.category||p.tag}</span>}
                      <p style={{fontSize:13,fontWeight:700,color:'white',lineHeight:1.3,marginBottom:(p.details||p.description)?4:0}}>{p.title}</p>
                      {(p.details||p.description)&&<p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.5,marginBottom:p.file_url?8:0}}>{p.details||p.description}</p>}
                      {p.file_url&&(
                        <a href={p.file_url} target="_blank" rel="noreferrer"
                          style={{display:'inline-flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,color:C,textDecoration:'none',padding:'5px 10px',borderRadius:8,background:`${C}14`,border:`1px solid ${C}28`}}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:12,height:12}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download PDF
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {programs.length > 3 && (
              <div style={{padding:'10px 20px',borderTop:`1px solid ${BORDER}`}}>
                <button onClick={()=>setOpenWeekItemId(openWeekItemId==='programs-all'?null:'programs-all')}
                  style={{fontSize:12,fontWeight:600,color:C,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:0}}>
                  {openWeekItemId==='programs-all'?'Show less':'View all programs'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:12,height:12}}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </Section>

          {/* Reminders */}
          <Section id="section-reminders">
            <SectionHeader title="Reminders" sub="Important notices and department updates."/>
            <div>
              {loadingReminders ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>Loading...</p></div>
              ) : reminders.length === 0 ? (
                <div style={{padding:'20px 22px'}}><p style={{fontSize:13,color:'rgba(255,255,255,0.25)'}}>No reminders yet.</p></div>
              ) : (openWeekItemId==='reminders-all' ? reminders : reminders.slice(0,3)).map((r,i,arr)=>{
                const det=r.details||r.body||'';
                return (
                  <div key={r.id} style={{padding:'14px 20px',borderBottom:i<arr.length-1?`1px solid ${BORDER}`:'none'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      <div style={{width:38,height:38,borderRadius:10,background:'rgba(251,191,36,0.1)',border:'1px solid rgba(251,191,36,0.18)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth={1.8} style={{width:17,height:17}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <p style={{fontSize:13,fontWeight:700,color:'white',lineHeight:1.3,marginBottom:det?5:0}}>{r.title}</p>
                        {det&&<p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6}}>{det}</p>}
                        {r.date&&<p style={{fontSize:10,fontWeight:600,color:'#fbbf24',marginTop:5,letterSpacing:'0.03em'}}>{r.date}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {reminders.length > 3 && (
              <div style={{padding:'10px 20px',borderTop:`1px solid ${BORDER}`}}>
                <button onClick={()=>setOpenWeekItemId(openWeekItemId==='reminders-all'?null:'reminders-all')}
                  style={{fontSize:12,fontWeight:600,color:C,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:5,padding:0}}>
                  {openWeekItemId==='reminders-all'?'Show less':'View all reminders'}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} style={{width:12,height:12}}><path d="M9 18l6-6-6-6"/></svg>
                </button>
              </div>
            )}
          </Section>
        </div>

        {/* ── PLAYER SPOTLIGHT ── */}
        <div style={{marginBottom:24}}>
          <div style={{borderRadius:18,overflow:'hidden',border:`1px solid rgba(255,255,255,0.07)`,background:'rgba(255,255,255,0.025)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',boxShadow:'inset 0 1px 0 rgba(255,255,255,0.07)'}}>
            <div style={{padding:'18px 22px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.22em',color:C,textTransform:'uppercase',marginBottom:2}}>Player Spotlight</p>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.35)'}}>Recognised players this week</p>
              </div>
            </div>
            <div style={{padding:'16px 20px'}}>
              {loadingSpotlight ? (
                <p style={{fontSize:13,color:'rgba(255,255,255,0.2)'}}>Loading...</p>
              ) : spotlight.length === 0 ? (
                <p style={{fontSize:13,color:'rgba(255,255,255,0.2)',padding:'8px 0'}}>No spotlight published yet.</p>
              ) : (
                <div className='p-three'>
                  {spotlight.map((s,i)=>{
                    const icons = [
                      <svg key="s" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
                      <svg key="t" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
                      <svg key="u" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{width:18,height:18}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
                    ];
                    const iconColors = [C,'#34d399','#a78bfa'];
                    const iconCol = iconColors[i] || C;
                    const labels = ['Player of the Week','Most Improved','Attendance Leader'];
                    return (
                      <div key={s.id} style={{borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.07)',padding:'14px',display:'flex',gap:12,alignItems:'flex-start'}}>
                        <div style={{width:40,height:40,borderRadius:11,background:`${iconCol}18`,border:`1px solid ${iconCol}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:iconCol}}>
                          {icons[i]||icons[0]}
                        </div>
                        <div>
                          <p style={{fontSize:9,fontWeight:700,letterSpacing:'0.12em',color:`${iconCol}99`,textTransform:'uppercase',marginBottom:3}}>{s.type?.replace(/_/g,' ')||labels[i]}</p>
                          <p style={{fontSize:14,fontWeight:800,color:'white',marginBottom:2,lineHeight:1.2}}>{s.player_name||'—'}</p>
                          {s.description&&<p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.4}}>{s.description}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── PARTNERS ── */}
        {sponsors.length > 0 && (
          <div style={{marginBottom:24}}>
            <p style={{fontSize:10,fontWeight:700,letterSpacing:'0.22em',color:`${C}55`,textTransform:'uppercase',marginBottom:16,textAlign:'center'}}>Our Partners</p>
            <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:12}}>
              {sponsors.map((s:Row)=>(
                <div key={s.id} style={{
                  background:'white',borderRadius:14,
                  padding:'20px 36px',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  minWidth:180,height:100,
                  boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
                }}>
                  {s.image_url
                    ? /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={s.image_url} alt={s.name||'Sponsor'}
                        style={{maxHeight:64,maxWidth:180,objectFit:'contain'}}
                      />
                    : <p style={{fontSize:15,fontWeight:900,color:'#0a0f1e',letterSpacing:'0.15em',textTransform:'uppercase'}}>{s.name}</p>
                  }
                </div>
              ))}
            </div>
          </div>
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
