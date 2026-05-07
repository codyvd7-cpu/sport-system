'use client';

import { usePathname } from 'next/navigation';
import Nav from '@/components/Nav';
import CoachNav from '@/components/CoachNav';

const COACH_ROUTES = ['/', '/athletes', '/teams', '/attendance', '/performance', '/portal-admin'];
const PUBLIC_ROUTES = ['/portal', '/login'];

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  const isCoachRoute = !isPublicRoute;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {isPublicRoute && <Nav />}
      {isCoachRoute && <CoachNav />}
      <div className={isCoachRoute ? 'pb-20 md:pb-0' : ''}>
        {children}
      </div>
    </div>
  );
}