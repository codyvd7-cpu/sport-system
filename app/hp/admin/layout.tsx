'use client';
import * as React from 'react';
import AuthGuard from '@/components/AuthGuard';
import HPNav from '@/components/HPNav';

export default function HPAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requiredRoles={['owner', 'head_of_hockey']}>
      <HPNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </AuthGuard>
  );
}
