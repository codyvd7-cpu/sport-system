'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    href: '/squad',
    label: 'Squad',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  },
  {
    href: '/athletes',
    label: 'Athletes',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/></svg>,
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: '/attendance',
    label: 'Attendance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: '/portal-admin',
    label: 'Portal Admin',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2"/></svg>,
  },
];

// Bottom tab bar - only 5 core items
const BOTTOM_TABS = [
  { href: '/dashboard', label: 'Home', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg> },
  { href: '/athletes', label: 'Athletes', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/></svg> },
  { href: '/attendance', label: 'Attendance', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { href: '/performance', label: 'Testing', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
  { href: '/teams', label: 'Teams', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
];

export default function CoachNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* ── DESKTOP NAV ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 hidden border-b border-white/5 bg-[#020617]/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img src="/st-benedicts-logo.png" alt="SBC" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400">St Benedict's</p>
              <p className="text-sm font-black text-white leading-none">Hockey</p>
            </div>
          </Link>

          {/* Nav items */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-all ${
                    active ? 'bg-sky-500/15 text-sky-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}>
                  {item.icon}
                  <span className="hidden lg:block">{item.label === 'Portal Admin' ? 'Admin' : item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/" title="Departments" className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-slate-400 transition hover:text-white text-sm">🏠</Link>
            <Link href="/assistant" title="AI Assistant" className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/25 to-violet-500/15 border border-sky-500/30 text-base transition hover:scale-110">
              🤖
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-sky-500 ring-1 ring-slate-950" />
            </Link>
            <Link href="/ai-tools" title="AI Tools" className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/25 to-violet-500/15 border border-violet-500/30 text-base transition hover:scale-110">🛠️</Link>
            <Link href="/portal" target="_blank" className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">Portal ↗</Link>
            <Link href="/player" target="_blank" className="rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20 transition">Player ↗</Link>
            <button onClick={handleLogout} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">Logout</button>
          </div>
        </div>
      </header>

      {/* ── MOBILE TOP BAR ──────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/st-benedicts-logo.png" alt="SBC" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-sky-400">St Benedict's</p>
              <p className="text-sm font-black text-white leading-none">Hockey</p>
            </div>
          </Link>
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300">
            {menuOpen
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            }
          </button>
        </div>
      </header>

      {/* ── MOBILE MENU OVERLAY ─────────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="absolute right-0 top-0 h-full w-72 bg-[#06071a] border-l border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex h-14 items-center justify-between px-4 border-b border-white/5">
              <p className="text-sm font-black text-white">Menu</p>
              <button onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto py-4">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                      active ? 'bg-sky-500/10 text-sky-400' : 'text-slate-300 hover:bg-white/5'
                    }`}>
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
              <div className="mx-4 my-4 border-t border-white/5 pt-4 space-y-2">
                <Link href="/assistant" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-300">🤖 AI Assistant</Link>
                <Link href="/ai-tools" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-300">🛠️ AI Tools</Link>
                <Link href="/hp" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-300">⚡ HP Classes</Link>
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300">🏠 All Departments</Link>
                <Link href="/portal" target="_blank" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300">Portal ↗</Link>
                <button onClick={handleLogout} className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 text-left">Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ───────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {BOTTOM_TABS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 transition ${active ? 'text-sky-400' : 'text-slate-500'}`}>
                {item.icon}
                <span className="text-[9px] font-semibold tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
