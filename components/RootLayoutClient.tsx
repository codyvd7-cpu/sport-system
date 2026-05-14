'use client';

import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import CoachNav from '@/components/CoachNav';

const PUBLIC_ROUTES = ['/portal', '/login', '/player'];
const LANDING_ROUTE = '/';

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isLanding = pathname === LANDING_ROUTE;
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {isPublicRoute && <Nav />}
      {!isPublicRoute && !isLanding && <CoachNav />}
      <div className={!isPublicRoute && !isLanding ? 'pb-20 md:pb-0' : ''}>
        {children}
      </div>
    </div>
  );
}