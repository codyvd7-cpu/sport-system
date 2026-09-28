import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';

// ─── /api/school/sponsors ─────────────────────────────────────────────────────
// A school's own commercial partners, for the portal.
//
// Public by design — the same logos a school prints on its fixture list and
// puts on the boundary boards. It returns ONLY sponsor records: no athlete,
// staff or fixture data, and it is scoped to one school per request.

export const revalidate = 300;

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

  return NextResponse.json({ sponsors: data || [] });
}
