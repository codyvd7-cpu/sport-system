'use client';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import HPNav from '@/components/HPNav';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/hp/login';
  const [checked, setChecked] = React.useState(isLoginPage);

  React.useEffect(() => {
    if (isLoginPage) return;
    if (typeof window !== 'undefined') {
      if (sessionStorage.getItem('hp_access') === 'true') {
        setChecked(true);
      } else {
        router.replace('/hp/login');
      }
    }
  }, [router, isLoginPage]);

  if (!checked) return <div className="min-h-screen bg-[#03100a]" />;

  return (
    <>
      {!isLoginPage && <HPNav />}
      <div className={!isLoginPage ? 'pb-20 md:pb-0' : ''}>{children}</div>
    </>
  );
}
