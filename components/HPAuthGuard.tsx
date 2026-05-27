'use client';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    // Only login page bypasses guard
    if (pathname === '/hp-login') {
      setChecked(true);
      return;
    }

    // Verify the httpOnly cookie server-side
    fetch('/api/hp/check', { method: 'GET', credentials: 'include' })
      .then(r => r.json())
      .then((data) => {
        if (data.ok) {
          setChecked(true);
        } else {
          router.replace('/hp-login');
        }
      })
      .catch(() => {
        router.replace('/hp-login');
      });
  }, [pathname, router]);

  if (!checked) return null;
  return <>{children}</>;
}
