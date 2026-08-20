'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import type { SchoolBranding } from '@/lib/schoolBranding';
import { DEFAULT_BRANDING } from '@/lib/schoolBranding';

export interface SchoolSportItem { key: string; label: string; color: string; icon: string }

// ─── BrandingProvider ──────────────────────────────────────────────────────────
// Loads the current user's school branding once and makes it available
// everywhere via useBranding(). Also writes the school's colours to CSS
// variables on <html>, so styling can reference var(--brand-primary) and
// automatically be correct per school without every component needing to
// read the context.
//
// Falls back to neutral Altus branding while loading or when signed out, so
// nothing flashes blank.

const BrandingContext = React.createContext<{ branding: SchoolBranding; sports: SchoolSportItem[]; loading: boolean }>({
  branding: DEFAULT_BRANDING,
  sports: [],
  loading: true,
});

export function useBranding() {
  return React.useContext(BrandingContext);
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<SchoolBranding>(DEFAULT_BRANDING);
  const [sports, setSports] = React.useState<SchoolSportItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Which school's branding to show, in priority order:
        //   1. ?school= in the URL — someone arriving from a school's own link
        //   2. a slug remembered from an earlier visit
        //   3. whatever their session says (staff, player, HP or portal cookie)
        //
        // Step 2 matters: a parent arriving at /ridgemont then tapping through
        // to the portal would otherwise revert to generic Altus branding the
        // moment ?school= dropped off the URL, which looks broken on exactly
        // the journey this is meant to serve.
        const urlSlug = new URLSearchParams(window.location.search).get('school');
        let slug = urlSlug;
        try {
          if (urlSlug) localStorage.setItem('altus_school', urlSlug);
          else slug = localStorage.getItem('altus_school');
        } catch { /* private browsing — fall back to session resolution */ }

        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));

        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
        // A signed-in user's own school always wins over a remembered slug —
        // otherwise a coach who once opened another school's public page would
        // keep seeing that school's colours.
        const useSlug = session ? urlSlug : slug;
        const qs = useSlug ? `?slug=${encodeURIComponent(useSlug)}` : '';
        const [brandRes, sportsRes] = await Promise.all([
          fetch(`/api/school/branding${qs}`, { headers }),
          fetch(`/api/school/sports${qs}`, { headers }),
        ]);
        const d = await brandRes.json();
        const sp = await sportsRes.json();
        if (!cancelled) {
          if (d.branding) setBranding(d.branding);
          if (sp.sports) setSports(sp.sports);
        }
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
    <BrandingContext.Provider value={{ branding, sports, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}
