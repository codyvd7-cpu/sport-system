'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/teams', label: 'Teams' },
  { href: '/attendance', label: 'Attendance' },
  { href: '/performance', label: 'Performance' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href="/" className="block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-sky-400">
                High-Performance Operations
              </p>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                School Sport System
              </h1>
            </Link>
            <p className="mt-1 text-sm text-slate-400">
              Athlete management, attendance, team operations, and performance tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => {
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
        </div>
      </div>
    </header>
  );
}