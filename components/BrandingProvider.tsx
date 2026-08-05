'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import type { SchoolBranding } from '@/lib/schoolBranding';
import { DEFAULT_BRANDING } from '@/lib/schoolBranding';

// ─── BrandingProvider ──────────────────────────────────────────────────────────
// Loads the current user's school branding once and makes it available
// everywhere via useBranding(). Also writes the school's colours to CSS
// variables on <html>, so styling can reference var(--brand-primary) and
// automatically be correct per school without every component needing to
// read the context.
//
// Falls back to neutral Altus branding while loading or when signed out, so
// nothing flashes blank.

const BrandingContext = React.createContext<{ branding: SchoolBranding; loading: boolean }>({
  branding: DEFAULT_BRANDING,
  loading: true,
});

export function useBranding() {
  return React.useContext(BrandingContext);
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<SchoolBranding>(DEFAULT_BRANDING);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // A slug in the URL wins (public portal links); otherwise the session
        // decides — bearer token for staff/players, cookies for HP/portal.
        const slug = new URLSearchParams(window.location.search).get('school');
        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));

        const res = await fetch(`/api/school/branding${slug ? `?slug=${encodeURIComponent(slug)}` : ''}`, {
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
        });
        const d = await res.json();
        if (!cancelled && d.branding) setBranding(d.branding);
      } catch {
        /* keep defaults */
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // Push colours into CSS variables so any stylesheet or inline style can use
  // them without importing the context.
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-primary', branding.primaryColor);
    root.style.setProperty('--brand-accent', branding.accentColor);
  }, [branding.primaryColor, branding.accentColor]);

  return (
    <BrandingContext.Provider value={{ branding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}
