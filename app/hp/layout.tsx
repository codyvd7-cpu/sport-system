import * as React from 'react';
import HPNav from '@/components/HPNav';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <div className="flex min-h-screen" style={{ background:'#060c1a' }}>
        <HPNav />
        <div className="flex-1 min-h-screen lg:ml-[228px] pb-20 lg:pb-0">
          {children}
        </div>
      </div>
    </HPAuthGuard>
  );
}
