import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getHpSchoolId, verifyPortalCookie, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getSchoolBranding, getSchoolBrandingBySlug, DEFAULT_BRANDING } from '@/lib/schoolBranding';

// ─── /api/school/branding ─────────────────────────────────────────────────────
// Returns the branding (name, logo, colours) for whoever is asking. The app
// has four different session types, so this resolves the school from
// whichever one is present:
//   1. ?slug=      — explicit, for public portal URLs
//   2. staff       — Supabase Auth bearer token → staff_roles.school_id
//   3. player      — Supabase Auth bearer token → their athlete's school
//   4. HP / portal — signed cookies carrying schoolId
// Falls back to neutral Altus branding rather than erroring, so a logged-out
// page still renders something sensible.

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (slug) {
    const bySlug = await getSchoolBrandingBySlug(slug);
    return NextResponse.json({ branding: bySlug || DEFAULT_BRANDING });
  }

  if (!adminConfigured()) return NextResponse.json({ branding: DEFAULT_BRANDING });

  // Signed cookies first — cheapest, no network call to verify.
  const hpSchoolId = getHpSchoolId(req);
  if (hpSchoolId) {
    return NextResponse.json({ branding: await getSchoolBranding(hpSchoolId) });
  }
  const portalSession = verifyPortalCookie(req);
  if (portalSession?.schoolId) {
    return NextResponse.json({ branding: await getSchoolBranding(portalSession.schoolId) });
  }

  // Supabase Auth token — could be staff or a player.
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data } = await getAdmin().auth.getUser(token);
    const user = data.user;
    if (user) {
      // Staff?
      if (user.email) {
        const staffSchoolId = await resolveStaffSchoolId(user.email);
        if (staffSchoolId) return NextResponse.json({ branding: await getSchoolBranding(staffSchoolId) });
      }
      // Player? → their linked athlete's school
      const { data: profile } = await getAdmin()
        .from('player_profiles').select('athlete_id').eq('user_id', user.id).maybeSingle();
      if (profile?.athlete_id) {
        const { data: athlete } = await getAdmin()
          .from('athletes').select('school_id').eq('id', profile.athlete_id).maybeSingle();
        if (athlete?.school_id) {
          return NextResponse.json({ branding: await getSchoolBranding(athlete.school_id) });
        }
      }
    }
  }

  return NextResponse.json({ branding: DEFAULT_BRANDING });
}
