'use client';
import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function HPAuthGuard({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = React.useState(false);

  React.useEffect(() => {
    if (pathname === '/hp-login') { setChecked(true); return; }
    fetch('/api/hp/check', { method: 'GET', credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.ok) setChecked(true); else router.replace('/hp-login'); })
      .catch(() => router.replace('/hp-login'));
  }, [pathname, router]);

  if (!checked) return (
    <div style={{ minHeight:'100vh', background:'#060c1a', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
      <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #10b981', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }}/>
      <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, fontFamily:'Inter,system-ui,sans-serif' }}>Loading…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return <>{children}</>;
}
