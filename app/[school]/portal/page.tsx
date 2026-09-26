import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';
import { getSchoolSports } from '@/lib/schoolSports';
import SchoolBrandingSeed from '@/components/SchoolBrandingSeed';
import PortalPage from '../../portal/page';

// ─── /[school]/portal ─────────────────────────────────────────────────────────
// The portal, reached by PATH rather than by ?school= query parameter.
//
// Why this exists: something in the deployed environment rewrites
// /portal?sport=X&school=Y to /portal-login?sport=X — preserving the sport but
// DROPPING the school. The portal reads its school from that parameter, so it
// arrived with no school context and fell back to default Altus branding,
// which is why a parent on Ashford's page saw a generic Altus portal.
//
// A path segment can't be stripped the way a query parameter can, and the
// school is resolved server-side here and seeded before paint — so the crest,
// colours and sports are correct in the first frame rather than after a fetch.
//
// /portal?school=… still works for existing links; this is the route the
// school pages now use.

export const revalidate = 300;

type Props = { params: Promise<{ school: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await params;
  const branding = await getSchoolBrandingBySlug(school);
  if (!branding) return { title: 'Not found' };
  return {
    title: `${branding.name} — Sport`,
    description: `Fixtures, results and team information for ${branding.name}.`,
  };
}

export default async function SchoolPortalPage({ params }: Props) {
  const { school } = await params;
  const branding = await getSchoolBrandingBySlug(school);
  if (!branding) notFound();

  const sports = await getSchoolSports(branding.id);

  return (
    <>
      <SchoolBrandingSeed
        branding={branding}
        sports={sports.map(s => ({ key: s.key, label: s.label, color: s.color, icon: s.icon, heroImage: s.heroImage }))}
      />
      <PortalPage />
    </>
  );
}
