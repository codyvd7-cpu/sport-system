import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';
import { getSchoolSports } from '@/lib/schoolSports';
import LandingPage from '../page';
import SchoolBrandingSeed from '@/components/SchoolBrandingSeed';

// ─── /[school] ────────────────────────────────────────────────────────────────
// A school's own front door — app.altusperformance.co.za/ridgemont
//
// This renders the EXACT same landing page as the root, with that school's
// branding pre-set. Deliberately reusing the component rather than making a
// second design: two near-identical pages inevitably drift apart, and the
// school's page shouldn't be a lesser version of the main one — it IS the main
// one, wearing their crest.
//
// The slug is validated server-side (404 for unknown or inactive schools) so a
// stranger never sees a half-branded page, and the metadata carries the
// school's name for anyone sharing the link.

export const revalidate = 300;

// Static routes take priority over a dynamic segment in Next.js, so real pages
// are never shadowed. But a typo like /dashbord would still land here and hit
// the database, and any route added later would silently do the same. This
// list makes that impossible: reserved paths 404 immediately.
const RESERVED = new Set([
  'api', 'login', 'logout', 'dashboard', 'athletes', 'attendance', 'teams',
  'squad', 'performance', 'retest', 'claims', 'coaches', 'notifications',
  'lightning', 'video', 'ai-tools', 'assistant', 'portal', 'portal-login',
  'portal-admin', 'hp', 'hp-login', 'hp-print', 'platform', 'player',
  'privacy', 'terms', 'results', 'export', 'auth', 'set-password',
  'monitoring', 'favicon.ico', 'manifest.json', 'robots.txt', 'sitemap.xml',
  '_next', 'static', 'images', 'icons', 'sports', 'schools',
]);

type Props = { params: Promise<{ school: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await params;
  if (RESERVED.has(school.toLowerCase())) return { title: 'Not found' };
  const branding = await getSchoolBrandingBySlug(school);
  if (!branding) return { title: 'Not found' };
  return {
    title: `${branding.name} — Sport`,
    description: `Fixtures, results and team information for ${branding.name}.`,
  };
}

export default async function SchoolLandingPage({ params }: Props) {
  const { school } = await params;
  if (RESERVED.has(school.toLowerCase())) notFound();

  const branding = await getSchoolBrandingBySlug(school);
  // An unknown or inactive slug is a genuine 404 — better than showing a
  // stranger a half-branded page.
  if (!branding) notFound();

  // Resolved server-side too, so the sport tiles are this school's from the
  // first paint rather than appearing a moment later.
  const sports = await getSchoolSports(branding.id);

  return (
    <>
      {/* Seeds the branding context before paint, so the crest and colours are
          this school's immediately rather than flashing generic Altus first. */}
      <SchoolBrandingSeed branding={branding} sports={sports.map(s => ({ key: s.key, label: s.label, color: s.color, icon: s.icon }))} />
      <LandingPage />
    </>
  );
}
