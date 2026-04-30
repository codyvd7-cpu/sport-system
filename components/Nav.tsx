'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Nav() {
  return (
    <header className="border-b border-slate-800 bg-[#020617]/95 text-white shadow-2xl backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link href="/portal" className="flex items-center gap-3 sm:gap-5">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-sky-400/20 blur-xl" />
              <Image
                src="/st-benedicts-logo.png"
                alt="St Benedict's College"
                width={90}
                height={90}
                className="relative h-14 w-14 object-contain sm:h-24 sm:w-24"
                priority
              />
            </div>

            <div className="leading-tight">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-400 sm:text-xs">
                St Benedict&apos;s College
              </p>

              <h1 className="text-xl font-black tracking-tight sm:text-4xl">
                St Benedicts Hockey
              </h1>

              <p className="hidden max-w-xl text-sm font-medium text-slate-400 sm:block">
                Weekly plans, fixtures, results, programs, and leaderboards.
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-sky-500/80 bg-sky-500/10 px-3 py-2 text-xs font-black text-slate-100 shadow-lg shadow-sky-500/10 transition hover:bg-sky-500 hover:text-slate-950 sm:px-5 sm:py-3 sm:text-sm"
          >
            Coach Login
          </Link>
        </div>

        <div className="mt-4 hidden gap-2 sm:flex">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300">
            Public Portal View
          </span>
          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">
            Bennies Hockey / Parent &amp; Player Access
          </span>
        </div>
      </div>
    </header>
  );
}