// Export pages get no nav — clean print layout only
import * as React from 'react';
import HPAuthGuard from '@/components/HPAuthGuard';

export default function ExportLayout({ children }: { children: React.ReactNode }) {
  return (
    <HPAuthGuard>
      {children}
    </HPAuthGuard>
  );
}
