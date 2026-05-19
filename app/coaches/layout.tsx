import * as React from 'react';
import CoachNav from '@/components/CoachNav';
import AuthGuard from '@/components/AuthGuard';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRole="head_of_hockey">
      <CoachNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </AuthGuard>
  );
}
