'use client';
import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PortalAuthGuard({ children, sport }: { children: React.ReactNode; sport: string }) {
  const router = useRouter();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    fetch('/api/portal/check', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.ok && (!data.sport || data.sport === sport)) {
          setChecked(true);
        } else {
          // No valid cookie, or the code entered was for a different sport
          router.replace(`/portal-login?sport=${sport}`);
        }
      })
      .catch(() => router.replace(`/portal-login?sport=${sport}`));
  }, [router, sport]);

  if (!checked) return (
    <div style={{ minHeight:'100vh', background:'#040810', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #38bdf8', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return <>{children}</>;
}
