import * as React from 'react';
import { checkStaffAccess } from '@/lib/staffAccess';
import { redirect } from 'next/navigation';

export default async function HPLayout({ children }: { children: React.ReactNode }) {
  const access = await checkStaffAccess(['owner', 'head_of_hockey', 'coach', 'viewer']);
  if (!access.allowed) redirect('/login?redirect=/hp');
  return <>{children}</>;
}
