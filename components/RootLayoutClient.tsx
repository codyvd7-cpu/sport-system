'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import CoachNav from '@/components/CoachNav';

const PUBLIC_ROUTES = ['/portal', '/login', '/player'];
const LANDING = '/';

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding = pathname === LANDING;
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showCoachNav = !isLanding && !isPublic;

  return (
    <>
      {isPublic && <Nav />}
      {showCoachNav && <CoachNav />}
      <div
        suppressHydrationWarning
        className={showCoachNav ? 'min-h-screen bg-slate-950 text-white pb-20 md:pb-0' : 'min-h-screen bg-slate-950 text-white'}
      >
        {children}
      </div>
    </>
  );
}