import * as React from 'react';
import CoachNav from '@/components/CoachNav';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CoachNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
