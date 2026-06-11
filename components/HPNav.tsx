'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  {
    href: '/hp',
    label: 'Dashboard',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  },
  {
    href: '/hp/students',
    label: 'Students',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/><path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/></svg>,
  },
  {
    href: '/hp/attendance',
    label: 'Attendance',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    href: '/hp/testing',
    label: 'Testing',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    href: '/hp/trends',
    label: 'Trends',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  },
  {
    href: '/hp/classes',
    label: 'Classes',
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  },
];

export default function HPNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = React.useState(false);

  function isActive(href: string) {
    if (href === '/hp') return pathname === '/hp';
    return pathname.startsWith(href);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <>
      {/* ── DESKTOP ─────────────────────────────────────── */}
      <header suppressHydrationWarning className="sticky top-0 z-50 hidden border-b border-emerald-500/10 bg-[#020617]/95 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/hp" className="flex items-center gap-2.5 shrink-0">
            <img src="/st-benedicts-logo.png" alt="SBC" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">St Benedict&apos;s</p>
              <p className="text-sm font-black text-white leading-none">High Performance</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="rounded-xl border border-slate-700 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition">← Departments</Link>
            <button onClick={handleLogout} className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition">Logout</button>
          </div>
        </div>
      </header>

      {/* ── MOBILE TOP BAR ──────────────────────────────── */}
      <header suppressHydrationWarning className="sticky top-0 z-50 border-b border-emerald-500/10 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/hp" className="flex items-center gap-2">
            <img src="/st-benedicts-logo.png" alt="SBC" className="h-8 w-8 rounded-lg object-contain bg-white p-0.5" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">St Benedict&apos;s</p>
              <p className="text-sm font-black text-white leading-none">High Performance</p>
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
              <p className="text-sm font-black text-white">HP Classes</p>
              <button onClick={() => setMenuOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="py-4">
              {NAV_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                    isActive(item.href) ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-300 hover:bg-white/5'
                  }`}>
                  {item.icon}{item.label}
                </Link>
              ))}
              <div className="mx-4 mt-4 space-y-2 border-t border-white/5 pt-4">
                <Link href="/" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300">All Departments</Link>
                <button onClick={handleLogout} className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-left text-sm font-semibold text-red-300">Logout</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TABS ──────────────────────────── */}
      <nav suppressHydrationWarning className="fixed bottom-0 left-0 right-0 z-50 border-t border-emerald-500/10 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around px-1 py-1.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 transition ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
                {item.icon}
                <span className="text-[9px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
