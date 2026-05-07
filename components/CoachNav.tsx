'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: '/athletes',
    label: 'Athletes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <circle cx="8" cy="7" r="3" />
        <circle cx="16" cy="7" r="3" />
        <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6" />
      </svg>
    ),
  },
  {
    href: '/teams',
    label: 'Teams',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: '/attendance',
    label: 'Attendance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    href: '/performance',
    label: 'Performance',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/portal-admin',
    label: 'Portal Admin',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-5 w-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        <path d="M12 2v2m0 16v2M2 12h2m16 0h2" />
      </svg>
    ),
  },
];

export default function CoachNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* ── DESKTOP TOP NAV ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 hidden border-b border-white/5 bg-[#020617]/90 backdrop-blur-xl md:block">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between gap-6 px-6">

          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-md" />
              <Image
                src="/st-benedicts-logo.png"
                alt="St Benedict's"
                width={36}
                height={36}
                className="relative h-9 w-9 object-contain"
                priority
              />
            </div>
            <div className="leading-none">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-sky-400">
                St Benedict's
              </p>
              <p className="text-sm font-black tracking-tight text-white">
                Hockey
              </p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    active
                      ? 'bg-sky-500/15 text-sky-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-sky-400' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/portal"
              target="_blank"
              className="rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
            >
              View Portal ↗
            </Link>
            <button
              onClick={handleLogout}
              className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE TOP BAR ──────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-md" />
              <Image
                src="/st-benedicts-logo.png"
                alt="St Benedict's"
                width={32}
                height={32}
                className="relative h-8 w-8 object-contain"
                priority
              />
            </div>
            <div className="leading-none">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-sky-400">St Benedict's</p>
              <p className="text-xs font-black text-white">Hockey</p>
            </div>
          </Link>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300"
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="border-t border-white/5 bg-[#020617] px-4 pb-4 pt-2">
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active
                        ? 'bg-sky-500/15 text-sky-300'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className={active ? 'text-sky-400' : ''}>{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 flex gap-2 border-t border-white/5 pt-3">
              <Link
                href="/portal"
                target="_blank"
                onClick={() => setMenuOpen(false)}
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 py-2.5 text-center text-xs font-semibold text-slate-300"
              >
                View Portal ↗
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl border border-red-500/20 bg-red-500/10 py-2.5 text-xs font-semibold text-red-300"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ── MOBILE BOTTOM TAB BAR ───────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#020617]/95 backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                  active ? 'text-sky-400' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="text-[9px] font-semibold tracking-wide">
                  {item.label === 'Portal Admin' ? 'Admin' : item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}