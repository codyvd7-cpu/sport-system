import * as React from 'react';
import HPNav from '@/components/HPNav';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <HPNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </HPAuthGuard>
  );
}
