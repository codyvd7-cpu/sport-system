'use client';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (pathname === '/hp-login') {
      setChecked(true);
      return;
    }
    const hasAccess = sessionStorage.getItem('hp_access') === 'true';
    if (hasAccess) {
      setChecked(true);
    } else {
      router.replace('/hp-login');
    }
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
