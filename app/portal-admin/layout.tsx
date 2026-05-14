import * as React from 'react';
import { checkStaffAccess } from '@/lib/staffAccess';
import { redirect } from 'next/navigation';
import CoachNav from '@/components/CoachNav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await checkStaffAccess(['owner', 'head_of_hockey']);
  if (!access.allowed) redirect('/login');
  return (
    <>
      <CoachNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
