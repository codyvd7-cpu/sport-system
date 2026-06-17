import * as React from 'react';
import HPNav from '@/components/HPNav';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <div style={{ display:'flex', minHeight:'100vh', background:'#060c1a' }}>
        <HPNav />
        {/* offset for sidebar on desktop */}
        <div style={{ flex:1, marginLeft:228, minHeight:'100vh' }} className="hp-body">
          <style>{`@media(max-width:1024px){.hp-body{margin-left:0!important;padding-bottom:80px;}}`}</style>
          {children}
        </div>
      </div>
    </HPAuthGuard>
  );
}
