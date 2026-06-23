import * as React from 'react';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function HPPrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      <div style={{ background: '#ffffff', minHeight: '100vh' }}>
        {children}
      </div>
    </HPAuthGuard>
  );
}
