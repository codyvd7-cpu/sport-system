import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getHpSchoolId, verifyPortalCookie, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getSchoolSports } from '@/lib/schoolSports';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';

// ─── /api/school/sports ───────────────────────────────────────────────────────
// The sports a school actually offers. Resolves the school the same way
// /api/school/branding does — cookies first, then bearer token, then an
// explicit ?slug= for public portal links.

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug');
  if (slug) {
    const school = await getSchoolBrandingBySlug(slug);
    return NextResponse.json({ sports: await getSchoolSports(school?.id) });
  }

  if (!adminConfigured()) return NextResponse.json({ sports: await getSchoolSports(null) });

  const hpSchoolId = getHpSchoolId(req);
  if (hpSchoolId) return NextResponse.json({ sports: await getSchoolSports(hpSchoolId) });

  const portal = verifyPortalCookie(req);
  if (portal?.schoolId) return NextResponse.json({ sports: await getSchoolSports(portal.schoolId) });

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const { data } = await getAdmin().auth.getUser(token);
    const user = data.user;
    if (user?.email) {
      const staffSchoolId = await resolveStaffSchoolId(user.email);
      if (staffSchoolId) return NextResponse.json({ sports: await getSchoolSports(staffSchoolId) });
    }
    if (user) {
      const { data: profile } = await getAdmin()
        .from('player_profiles').select('athlete_id').eq('user_id', user.id).maybeSingle();
      if (profile?.athlete_id) {
        const { data: athlete } = await getAdmin()
          .from('athletes').select('school_id').eq('id', profile.athlete_id).maybeSingle();
        if (athlete?.school_id) return NextResponse.json({ sports: await getSchoolSports(athlete.school_id) });
      }
    }
  }

  return NextResponse.json({ sports: await getSchoolSports(null) });
}
