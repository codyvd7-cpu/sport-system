import { redirect } from 'next/navigation';

// ─── /portal-login ─────────────────────────────────────────────────────────────
// Retired. The portal no longer requires a code — fixtures and results are
// public, and anything personal sits behind a real account instead (see
// PortalAuthGuard.tsx). This page used to be the code gate itself; it stayed
// live and reachable even after every link was updated to point at /portal
// directly, so anyone who had bookmarked it, or hit a cached link, could still
// land on a code prompt that no longer matches how the app works.
//
// Kept as a redirect rather than deleted outright, so an old link still lands
// somewhere useful instead of a 404.

export default async function PortalLoginRedirect({
  searchParams,
}: { searchParams: Promise<{ sport?: string; school?: string }> }) {
  const { sport, school } = await searchParams;
  const qs = new URLSearchParams();
  if (sport) qs.set('sport', sport);
  if (school) qs.set('school', school);
  redirect(`/portal${qs.toString() ? `?${qs.toString()}` : ''}`);
}
