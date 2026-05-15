'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('hp_access') === 'true') {
        setChecked(true);
      } else {
        router.replace('/hp/login');
      }
    }
  }, [router]);

  if (!checked) return <div className="min-h-screen bg-[#03100a]" />;

  return <>{children}</>;
}
