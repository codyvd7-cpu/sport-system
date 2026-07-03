import * as React from 'react';
import HPNav from '@/components/HPNav';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <div style={{ minHeight:'100vh', background:'#060c1a', overflowX:'hidden' }}>
        <HPNav />
        <div className="hp-content" style={{ minHeight:'100vh' }}>
          <style>{`
            .hp-content { margin-left: 0; }
            @media(min-width: 1024px) { .hp-content { margin-left: 228px; } }
          `}</style>
          {children}
        </div>
      </div>
    </HPAuthGuard>
  );
}
