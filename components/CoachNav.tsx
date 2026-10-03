'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useBranding } from '@/components/BrandingProvider';
import NotificationBell from '@/components/NotificationBell';

type NavItem = { href: string; label: string; icon: React.ReactNode };

// ── Icons ────────────────────────────────────────────────────
const I = {
  newplayer: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>,
  grid:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  users:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  pulse:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  team:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  teams:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>,
  globe:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  star:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  export:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  squad:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  brain:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/><circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/></svg>,
  chat:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  menu:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  close:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  logout:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-4 w-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  retest:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg>,
  video:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>,
  clock:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  bell:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  sheet:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-[18px] w-[18px]"><path d="M9 2h6a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12l2 2 4-4"/></svg>,
  bolt:    <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>,
};

type NavGroup = { heading: string | null; items: NavItem[] };

// ── Grouped navigation ───────────────────────────────────────────────────────
// The old nav was a flat list of up to 17 items, which is why it read as a
// wall. Now the 4 things a coach touches daily sit ungrouped at the top, and
// everything else is filed under a heading so the eye isn't asked to scan 17
// peers. Items a given role can't use simply don't appear.

// What EVERY coach gets — the daily spine.
const DAILY: NavItem[] = [
  { href:'/dashboard',   label:'My Team',     icon:I.grid     },
  { href:'/attendance',  label:'Attendance',  icon:I.check    },
  { href:'/selection',   label:'Selection',   icon:I.sheet    },
  { href:'/performance', label:'Testing',     icon:I.pulse    },
];

// Managing the squad.
const SQUAD: NavItem[] = [
  { href:'/athletes',    label:'Athletes',    icon:I.users    },
  { href:'/enrolment',   label:'New Players', icon:I.newplayer},
  { href:'/retest',      label:'Retest Due',  icon:I.retest   },
  { href:'/video',       label:'Video',       icon:I.video    },
  { href:'/teams',       label:'Team Info',   icon:I.teams    },
];

// Head-of-sport only: publishing to parents + department management.
const PUBLISH: NavItem[] = [
  { href:'/portal-admin',label:'Portal',      icon:I.globe    },
  { href:'/results',     label:'Results',     icon:I.clock    },
  { href:'/notifications',label:'Notify',     icon:I.bell     },
];
const MANAGE: NavItem[] = [
  { href:'/claims',      label:'Requests',    icon:I.users    },
  { href:'/coaches',     label:'Coaches',     icon:I.star     },
  { href:'/export/attendance', label:'Export',icon:I.export   },
];
const TOOLS: NavItem[] = [
  { href:'/assistant',   label:'AI Assistant',icon:I.chat     },
  { href:'/ai-tools',    label:'AI Tools',    icon:I.brain    },
];

function buildGroups(isHOH: boolean, canLightning: boolean): NavGroup[] {
  const daily = canLightning
    ? [DAILY[0], { href:'/lightning', label:'Lightning Alert', icon:I.bolt }, ...DAILY.slice(1)]
    : DAILY;
  const groups: NavGroup[] = [
    { heading: null, items: daily },
    { heading: 'Squad', items: SQUAD },
  ];
  if (isHOH) {
    groups.push({ heading: 'Publish', items: PUBLISH });
    groups.push({ heading: 'Manage', items: MANAGE });
  }
  groups.push({ heading: 'Tools', items: TOOLS });
  return groups;
}

// Mobile bottom tabs — only the daily spine, same for everyone.
const COACH_TABS: NavItem[] = DAILY;
const HOH_TABS: NavItem[] = DAILY;

export default function CoachNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { isHOS, isMIC, isOwner, email, sport, loading: roleLoading } = useRole();
  const { branding } = useBranding();

  const isHOH = isHOS || isMIC || isOwner;
  const groups = buildGroups(isHOH, isOwner || isHOS);

  // Live counts make the launcher feel alive — a coach sees "3 waiting" on
  // New Players without opening it. One cheap call, refreshed on mount.
  const [counts, setCounts] = useState<{ newPlayers?: number; needsAttention?: number; fixturesToday?: number }>({});
  React.useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const r = await fetch('/api/coach/nav-counts', { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (r.ok) setCounts(await r.json());
      } catch { /* counts are optional chrome */ }
    })();
  }, []);
  // Flat list still needed for the mobile "more" sheet and active-state checks.
  const navItems = groups.flatMap(g => g.items);
  const tabs = isHOH ? HOH_TABS : COACH_TABS;

  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'All Sports';
  const SPORT_COLORS: Record<string,string> = {
    hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',
    rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4',
  };
  const sportCfg = { label: sportLabel, color: SPORT_COLORS[sport||'hockey'] || '#38bdf8' };
  const roleBadge = isOwner ? { label:'Admin',             color:'#f87171', bg:'rgba(248,113,113,0.1)' }
    : isHOS   ? { label:'Head of Sport',       color:'#10b981', bg:'rgba(16,185,129,0.1)' }
    : isMIC   ? { label:`MIC · ${sportLabel}`, color:'#fbbf24', bg:'rgba(251,191,36,0.1)' }
    : { label:`Coach · ${sportLabel}`, color:'rgba(255,255,255,0.35)', bg:'rgba(255,255,255,0.05)' };

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname === href || pathname.startsWith(href + '/');

  // Show back button when on a detail page (has dynamic segment)
  const ROOT_PAGES = ['/dashboard','/athletes','/attendance','/performance','/teams','/squad','/coaches','/portal-admin','/assistant','/ai-tools','/export'];
  const isDeepPage = !ROOT_PAGES.some(p => pathname === p || (p !== '/dashboard' && pathname === p))
    && pathname !== '/dashboard'
    && ROOT_PAGES.every(p => pathname !== p);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/login');
  }


  // Which count, if any, sits on a given destination.
  function countFor(href: string): number | undefined {
    if (href === '/enrolment') return counts.newPlayers || undefined;
    if (href === '/dashboard') return counts.needsAttention || undefined;
    if (href === '/selection') return counts.fixturesToday || undefined;
    return undefined;
  }

  const initials = (e: string) => e?.split('@')[0].slice(0,2).toUpperCase() || '??';

  return (
    <>
      {/* ── DESKTOP SIDEBAR ─────────────────────── */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[248px] flex-col border-r z-40"
        style={{
          background:'rgba(4,6,14,0.98)',
          borderColor:'rgba(255,255,255,0.06)',
          backdropFilter:'blur(20px)',
        }}>

        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <Link href="/" className="flex items-center gap-3">
            <img src={branding.logoUrl} alt={branding.abbreviation}
              className="h-9 w-9 rounded-xl object-contain bg-white p-1 shadow-lg"/>
            <div>
              <p className="text-[11px] font-bold text-white leading-tight tracking-tight">{branding.shortName}</p>
              <p className="text-[9px] font-medium tracking-[0.15em] uppercase"
                style={{color:'var(--sport-color)'}}>{sportCfg.label}</p>
            </div>
          </Link>
        </div>

        {/* ── LAUNCHER ─────────────────────────────────────────────────
            The daily four as large, tactile tiles with live counts, then the
            rest as quiet grouped links. A coach's eye lands on what they do
            every day; everything else recedes. */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
              {group.heading ? (
                <>
                  <p className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-[0.2em]"
                     style={{ color: 'rgba(255,255,255,0.2)' }}>{group.heading}</p>
                  <div className="space-y-0.5">
                    {group.items.map(item => {
                      const active = isActive(item.href);
                      const n = countFor(item.href);
                      return (
                        <Link key={item.href} href={item.href}
                          className="flex items-center gap-3 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-all duration-150"
                          style={{
                            background: active ? 'var(--sport-color-dim)' : 'transparent',
                            color: active ? 'var(--sport-color)' : 'rgba(255,255,255,0.4)',
                          }}
                          onMouseEnter={e => { if(!active){(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.03)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.75)';} }}
                          onMouseLeave={e => { if(!active){(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.4)';} }}>
                          <span style={{ opacity: active ? 1 : 0.55 }}>{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {n !== undefined && (
                            <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tabular-nums"
                              style={{ background: 'var(--sport-color-dim)', color: 'var(--sport-color)' }}>{n}</span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </>
              ) : (
                // The daily spine — larger tiles, two per row, with live counts.
                <div className="grid grid-cols-2 gap-1.5">
                  {group.items.map(item => {
                    const active = isActive(item.href);
                    const n = countFor(item.href);
                    const short = item.label.replace('My Team','Team').replace('Lightning Alert','Alert');
                    return (
                      <Link key={item.href} href={item.href}
                        className="relative flex flex-col justify-between rounded-xl p-2.5 transition-all duration-150"
                        style={{
                          minHeight: 62,
                          background: active ? 'var(--sport-color-dim)' : 'rgba(255,255,255,0.025)',
                          border: `1px solid ${active ? 'var(--sport-color)' : 'rgba(255,255,255,0.06)'}`,
                        }}
                        onMouseEnter={e => { if(!active) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.055)'; }}
                        onMouseLeave={e => { if(!active) (e.currentTarget as HTMLElement).style.background='rgba(255,255,255,0.025)'; }}>
                        <div className="flex items-start justify-between">
                          <span style={{ color: active ? 'var(--sport-color)' : 'rgba(255,255,255,0.5)' }}>{item.icon}</span>
                          {n !== undefined && n > 0 && (
                            <span className="rounded-full px-1.5 text-[10px] font-black tabular-nums"
                              style={{ background: 'var(--sport-color)', color: '#03060c' }}>{n}</span>
                          )}
                        </div>
                        <span className="text-[12px] font-bold leading-tight"
                          style={{ color: active ? 'var(--sport-color)' : 'rgba(255,255,255,0.85)' }}>{short}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 pt-2 border-t space-y-1" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
              style={{background:'var(--sport-color-dim)',color:'var(--sport-color)'}}>
              {initials(email||'')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium truncate" style={{color:'rgba(255,255,255,0.4)'}}>{email}</p>
              <span className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide mt-0.5"
                style={{background:roleBadge.bg, color:roleBadge.color}}>
                {roleBadge.label}
              </span>
            </div>
            <NotificationBell/>
          </div>
          <button onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition"
            style={{color:'rgba(255,255,255,0.3)'}}
            onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(248,113,113,0.08)';(e.currentTarget as HTMLElement).style.color='#f87171';}}
            onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,0.3)';}}>
            {I.logout}
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ──────────────────────── */}
      <header className="md:hidden sticky top-0 z-50 flex h-14 items-center justify-between px-4 border-b"
        style={{background:'rgba(4,6,14,0.98)',borderColor:'rgba(255,255,255,0.06)',backdropFilter:'blur(20px)'}}>

        {/* Left — back button or logo */}
        {isDeepPage ? (
          <button onClick={() => window.history.back()}
            className="flex items-center gap-2 text-sm font-semibold transition"
            style={{color:'rgba(255,255,255,0.6)'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-4 w-4">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        ) : (
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img src={branding.logoUrl} alt={branding.abbreviation} className="h-8 w-8 rounded-lg object-contain bg-white p-0.5"/>
            <div>
              <p className="text-[11px] font-bold text-white leading-none">{branding.shortName}</p>
              <p className="text-[9px] font-semibold tracking-[0.2em] uppercase" style={{color:'var(--sport-color)'}}>{sportCfg.label}</p>
            </div>
          </Link>
        )}

        {/* Right — role badge + menu */}
        <div className="flex items-center gap-2">
          <NotificationBell/>
          {!roleLoading && (
            <span className="rounded-md px-2 py-1 text-[9px] font-bold tracking-wide"
              style={{background:roleBadge.bg, color:roleBadge.color}}>
              {roleBadge.label}
            </span>
          )}
          <button onClick={() => setOpen(v => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition"
            style={{background:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.6)'}}>
            {open ? I.close : I.menu}
          </button>
        </div>
      </header>

      {/* ── MOBILE DRAWER ───────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0" style={{background:'rgba(0,0,0,0.7)',backdropFilter:'blur(6px)'}}/>
          <div className="absolute right-0 top-0 h-full w-72 flex flex-col border-l"
            style={{background:'rgba(4,6,14,0.99)',borderColor:'rgba(255,255,255,0.08)'}}
            onClick={e => e.stopPropagation()}>

            {/* Drawer header */}
            <div className="flex h-14 shrink-0 items-center justify-between px-5 border-b"
              style={{borderColor:'rgba(255,255,255,0.06)'}}>
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                  style={{background:'var(--sport-color-dim)',color:'var(--sport-color)'}}>
                  {initials(email||'')}
                </div>
                <p className="text-[12px] font-medium truncate max-w-[170px]" style={{color:'rgba(255,255,255,0.5)'}}>{email}</p>
              </div>
              <button onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-xl"
                style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
                {I.close}
              </button>
            </div>

            {/* Drawer nav */}
            <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-0.5">
              {navItems.map(item => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition"
                    style={{
                      background: active ? 'var(--sport-color-dim)' : 'transparent',
                      color: active ? 'var(--sport-color)' : 'rgba(255,255,255,0.55)',
                      borderLeft: active ? '2px solid var(--sport-color)' : '2px solid transparent',
                    }}>
                    <span style={{opacity: active ? 1 : 0.6}}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Drawer footer */}
            <div className="shrink-0 px-3 pb-20 pt-2 border-t" style={{borderColor:'rgba(255,255,255,0.06)'}}>
              <button onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] font-medium transition"
                style={{color:'rgba(255,255,255,0.35)'}}>
                {I.logout}
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TABS ──────────────────── */}
      {!roleLoading && (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background:'rgba(4,6,14,0.98)',
          borderColor:'rgba(255,255,255,0.06)',
          backdropFilter:'blur(24px)',
          paddingBottom:'env(safe-area-inset-bottom)',
        }}>
        <div className="flex">
          {tabs.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 transition-all"
                style={{color: active ? 'var(--sport-color)' : 'rgba(255,255,255,0.3)'}}>
                <span style={{
                  transform: active ? 'scale(1.1)' : 'scale(1)',
                  transition: 'transform 0.15s ease',
                  display:'block',
                }}>
                  {item.icon}
                </span>
                <span className="text-[9px] font-semibold tracking-[0.05em]" style={{
                  opacity: active ? 1 : 0.6,
                  color: active ? 'var(--sport-color)' : undefined,
                }}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-6 rounded-full"
                    style={{background:'var(--sport-color)',opacity:0.8}}/>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      )}

      {/* Desktop spacer */}
      <div className="hidden md:block md:w-[248px] shrink-0"/>
    </>
  );
}