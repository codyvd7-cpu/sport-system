import * as React from 'react';
import CoachNav from '@/components/CoachNav';
import AuthGuard from '@/components/AuthGuard';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <CoachNav/>
      <div className="pb-20 md:pb-0 md:ml-[220px] overflow-x-hidden">{children}</div>
    </AuthGuard>
  );
}
