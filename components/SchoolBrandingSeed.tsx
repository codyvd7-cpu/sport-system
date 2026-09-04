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
// Deliberately does NOT remember the school across visits: doing so made the
// bare domain show whichever school that browser last opened, which is wrong
// for anyone else using the device.

export default function SchoolBrandingSeed({
  branding, sports = [],
}: { branding: SchoolBranding; sports?: { key: string; label: string; color: string; icon: string; heroImage?: string | null }[] }) {
  const seed = useSeedBranding();

  // Runs before paint so the correct crest and colours are the first thing
  // rendered, rather than a corrected second frame.
  React.useLayoutEffect(() => {
    seed(branding, sports);
  }, [branding, sports, seed]);

  return null;
}
