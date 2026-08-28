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

const BrandingContext = React.createContext<{
  branding: SchoolBranding;
  sports: SchoolSportItem[];
  loading: boolean;
  seed: (b: SchoolBranding, sports?: SchoolSportItem[]) => void;
}>({
  branding: DEFAULT_BRANDING,
  sports: [],
  loading: true,
  seed: () => {},
});

export function useBranding() {
  return React.useContext(BrandingContext);
}

/**
 * Lets a server-rendered page hand its already-resolved school to the client
 * context, so there's no flash of generic branding before the fetch lands.
 */
export function useSeedBranding() {
  return React.useContext(BrandingContext).seed;
}

export default function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<SchoolBranding>(DEFAULT_BRANDING);
  const [sports, setSports] = React.useState<SchoolSportItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  // Once a server-rendered page has seeded a school, the background fetch must
  // not overwrite it with a slower, less specific answer.
  const seededRef = React.useRef(false);

  const seed = React.useCallback((b: SchoolBranding, sp?: SchoolSportItem[]) => {
    seededRef.current = true;
    setBranding(b);
    if (sp?.length) setSports(sp);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Which school's branding to show:
        //   1. ?school= in the URL — an explicit request for that school
        //   2. otherwise, whatever the SESSION says (staff, player, HP or
        //      portal cookie)
        //
        // Deliberately NOT remembered across visits (no localStorage). An
        // earlier version stored the slug so branding survived navigation —
        // but that made the front door depend on browser history: anyone who
        // had once opened /ridgemont then saw Ridgemont's name and crest on
        // the bare domain, including parents from a different school entirely.
        //
        // School pages (/ridgemont) seed their branding server-side instead,
        // and internal pages resolve it from the signed-in session, so nothing
        // needs remembering.
        const urlSlug = new URLSearchParams(window.location.search).get('school');

        const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } } as any));

        const headers = session ? { Authorization: `Bearer ${session.access_token}` } : {};
        const qs = urlSlug ? `?slug=${encodeURIComponent(urlSlug)}` : '';
        const [brandRes, sportsRes] = await Promise.all([
          fetch(`/api/school/branding${qs}`, { headers }),
          fetch(`/api/school/sports${qs}`, { headers }),
        ]);
        const d = await brandRes.json();
        const sp = await sportsRes.json();
        if (!cancelled) {
          // A seeded school always wins — it was resolved server-side for this
          // exact URL and is more specific than anything inferred here.
          if (d.branding && !seededRef.current) setBranding(d.branding);
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
    <BrandingContext.Provider value={{ branding, sports, loading, seed }}>
      {children}
    </BrandingContext.Provider>
  );
}
