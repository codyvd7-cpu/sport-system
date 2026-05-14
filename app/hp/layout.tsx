import * as React from 'react';
import HPNav from '@/components/HPNav';

export default function HPLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HPNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
