'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const coachNavItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/teams', label: 'Teams' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/performance', label: 'Performance' },
  { href: '/portal-admin', label: 'Portal Admin' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [logoFailed, setLogoFailed] = useState(false);

  const inPortal = pathname === '/portal' || pathname.startsWith('/portal/');
  const inPortalAdmin = pathname === '/portal-admin' || pathname.startsWith('/portal-admin/');
  const inLogin = pathname === '/login';

  const showCoachNav = !inPortal && !inLogin;
  const showPublicPortalButton = !inPortal;
  const showCoachLoginButton = inLogin;
  const showLogoutButton = showCoachNav;

  function handleLogout() {
    document.cookie = 'coach_access=; path=/; max-age=0; SameSite=Lax';
    router.push('/login');
    router.refresh();
  }

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur ${
        inPortal
          ? 'border-slate-800/70 bg-slate-950/92'
          : 'border-slate-800/80 bg-slate-950/95'
      }`}
    >
      <div className={`${inPortal ? 'mx-auto max-w-6xl' : 'mx-auto max-w-7xl'} px-4 py-4 sm:px-6 lg:px-8`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Link href={inPortal ? '/portal' : '/'} className="flex min-w-0 items-center gap-4">
                <div
                  className={`flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border bg-slate-900 ${
                    inPortal
                      ? 'h-20 w-20 border-slate-700 p-1.5 sm:h-24 sm:w-24'
                      : 'h-16 w-16 border-slate-700 p-1'
                  }`}
                >
                  {!logoFailed ? (
                    <img
                      src="/st-benedicts-logo.png"
                      alt="St Benedict's logo"
                      className="h-full w-full object-contain"
                      onError={() => setLogoFailed(true)}
                    />
                  ) : (
                    <div
                      className={`flex h-full w-full items-center justify-center bg-slate-900 font-bold tracking-wide text-sky-300 ${
                        inPortal ? 'text-lg' : 'text-sm'
                      }`}
                    >
                      SB
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <p
                    className={`font-semibold uppercase text-sky-400 ${
                      inPortal
                        ? 'text-xs tracking-[0.32em]'
                        : 'text-[11px] tracking-[0.28em]'
                    }`}
                  >
                    St Benedict&apos;s College
                  </p>

                  <h1
                    className={`mt-1 font-bold tracking-tight text-white ${
                      inPortal ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
                    }`}
                  >
                    {inPortal ? 'St Benedict’s Hockey Portal' : 'High-Performance Operations System'}
                  </h1>

                  <p className={`mt-1 text-slate-400 ${inPortal ? 'text-sm sm:text-base' : 'text-sm'}`}>
                    {inPortal
                      ? 'Weekly communication, fixtures, results, programs, and leaderboards for players and parents.'
                      : inLogin
                      ? 'Protected coach access for internal operations.'
                      : 'Coach control, team operations, attendance, performance, and portal management.'}
                  </p>
                </div>
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {showPublicPortalButton ? (
                <Link
                  href="/portal"
                  className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    isActive(pathname, '/portal')
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-500 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  Parent &amp; Player Portal
                </Link>
              ) : null}

              {showCoachLoginButton ? (
                <Link
                  href="/login"
                  className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2.5 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
                >
                  Coach Login
                </Link>
              ) : null}

              {showLogoutButton ? (
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>

          {showCoachNav ? (
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap gap-2">
                {coachNavItems.map((item) => {
                  const active = isActive(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        active
                          ? 'border-sky-500 bg-sky-500/15 text-sky-300 shadow-[0_0_0_1px_rgba(14,165,233,0.15)]'
                          : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    inPortalAdmin ? 'bg-violet-500/15 text-violet-200' : 'bg-sky-500/15 text-sky-200'
                  }`}
                >
                  {inPortalAdmin ? 'Portal Admin View' : 'Coach Operations View'}
                </span>

                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                  Bennies Hockey / S&amp;C / Performance
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  inPortal ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {inPortal ? 'Public Portal View' : 'Protected Coach Login'}
              </span>

              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                Bennies Hockey / Parent &amp; Player Access
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}