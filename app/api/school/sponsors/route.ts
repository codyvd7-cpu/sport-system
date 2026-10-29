import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';

// ─── /api/school/sponsors ─────────────────────────────────────────────────────
// A school's own commercial partners, for the portal.
//
// Public by design — the same logos a school prints on its fixture list and
// puts on the boundary boards. It returns ONLY sponsor records: no athlete,
// staff or fixture data, and it is scoped to one school per request.

// NOTE: deliberately no `export const revalidate`. This response varies by the
// ?school / ?schoolId query param, and segment-level revalidate caches the
// route without discriminating on that param — the classic way one school ends
// up served another's sponsors (AP-33). HTTP caches key on the FULL URL
// (query string included), so we cache per-school correctly by setting an
// explicit Cache-Control below instead.
export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ sponsors: [] });

  const schoolId = req.nextUrl.searchParams.get('schoolId');
  const slug = req.nextUrl.searchParams.get('school');

  let resolvedId = schoolId;
  if (!resolvedId && slug) {
    const branding = await getSchoolBrandingBySlug(slug);
    // An unknown slug must not fall through to another school's sponsors.
    if (!branding) return NextResponse.json({ sponsors: [] });
    resolvedId = branding.id;
  }
  if (!resolvedId) return NextResponse.json({ sponsors: [] });

  const { data } = await getAdmin()
    .from('school_sponsors')
    .select('id,name,logo_url,website_url,tier')
    .eq('school_id', resolvedId)
    .eq('is_active', true)
    .order('sort_order');

  const res = NextResponse.json({ sponsors: data || [] });
  // Public, per-school data — cache at the CDN keyed by the full URL (which
  // carries the school param), so each school gets its own entry.
  res.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  return res;
}
