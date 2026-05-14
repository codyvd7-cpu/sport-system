'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import CoachNav from '@/components/CoachNav';

const PUBLIC_ROUTES = ['/portal', '/login', '/player'];

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => { setMounted(true); }, []);

  const isLanding = pathname === '/';
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  const showCoachNav = !isLanding && !isPublic;

  // Before mount, render children only to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {isPublic && <Nav />}
      {showCoachNav && <CoachNav />}
      <div className={showCoachNav ? 'pb-20 md:pb-0' : ''}>
        {children}
      </div>
    </div>
  );
}