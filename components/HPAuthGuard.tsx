'use client';
import * as React from 'react';
import { useRouter } from 'next/navigation';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (sessionStorage.getItem('hp_access') === 'true') {
      setChecked(true);
    } else {
      router.replace('/hp/login');
    }
  }, [router]);

  if (!checked) return (
    <div className="flex min-h-screen items-center justify-center bg-[#03100a]">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
    </div>
  );

  return <>{children}</>;
}
