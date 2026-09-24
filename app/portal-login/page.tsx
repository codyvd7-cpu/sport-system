import { redirect } from 'next/navigation';

// ─── /portal-login ─────────────────────────────────────────────────────────────
// Retired. The portal no longer requires a code — fixtures and results are
// public, and anything personal sits behind a real account instead (see
// PortalAuthGuard.tsx).
//
// LOOP GUARD: this page redirects to /portal. If an older deployment of
// PortalAuthGuard is still live, that guard redirects /portal back here —
// and the two bounce forever, which is exactly what happened in production
// when only half of the open-portal change had shipped. The `r` marker below
// makes the second arrival detectable: if we've already sent this visitor to
// /portal once and they're back, we stop redirecting and render a plain link
// instead of looping. A half-deployed state should degrade to something a
// parent can click, not an infinite refresh.

export default async function PortalLoginRedirect({
  searchParams,
}: { searchParams: Promise<{ sport?: string; school?: string; r?: string }> }) {
  const { sport, school, r } = await searchParams;

  const qs = new URLSearchParams();
  if (sport) qs.set('sport', sport);
  if (school) qs.set('school', school);

  if (r !== '1') {
    qs.set('r', '1');
    redirect(`/portal${qs.toString() ? `?${qs.toString()}` : ''}`);
  }

  // Second arrival: something upstream is bouncing us. Don't loop.
  const href = `/portal${sport ? `?sport=${encodeURIComponent(sport)}` : ''}${school ? `${sport ? '&' : '?'}school=${encodeURIComponent(school)}` : ''}`;
  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#05070d', color: 'white', padding: 24, textAlign: 'center',
    }}>
      <div>
        <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Continue to the portal</p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 20, maxWidth: 320 }}>
          Fixtures, results and the week ahead — no code needed.
        </p>
        <a href={href} style={{
          display: 'inline-block', padding: '12px 24px', borderRadius: 12,
          background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.45)',
          color: '#38bdf8', fontSize: 14, fontWeight: 700, textDecoration: 'none',
        }}>
          Open portal
        </a>
      </div>
    </main>
  );
}
