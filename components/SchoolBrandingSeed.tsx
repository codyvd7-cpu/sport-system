'use client';
import * as React from 'react';
import type { SchoolBranding } from '@/lib/schoolBranding';
import { useSeedBranding } from '@/components/BrandingProvider';

// ─── SchoolBrandingSeed ────────────────────────────────────────────────────────
// Hands a server-resolved school to the client branding context.
//
// Why this exists: /[school] resolves the school on the server, but the landing
// page reads branding from client context. Without seeding, the page would
// paint generic Altus branding first and then flick to the school's — the
// exact "this isn't really ours" impression the school URL exists to avoid.
//
// Also remembers the slug, so branding survives as the visitor taps deeper in
// (portal, player pages) and the ?school= parameter drops off the URL.

export default function SchoolBrandingSeed({
  branding, sports = [],
}: { branding: SchoolBranding; sports?: { key: string; label: string; color: string; icon: string }[] }) {
  const seed = useSeedBranding();

  // Runs before paint so the correct crest and colours are the first thing
  // rendered, rather than a corrected second frame.
  React.useLayoutEffect(() => {
    seed(branding, sports);
    try { localStorage.setItem('altus_school', branding.slug); } catch { /* private browsing */ }
  }, [branding, sports, seed]);

  return null;
}
