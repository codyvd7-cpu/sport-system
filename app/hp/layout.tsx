import * as React from 'react';
import HPNav from '@/components/HPNav';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <div className="min-h-screen bg-slate-950 text-white">
        {children}
      </div>
    </HPAuthGuard>
  );
}
