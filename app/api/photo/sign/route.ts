import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { signPhoto, pathFromLegacyUrl } from '@/lib/signedPhoto';

// ─── /api/photo/sign ──────────────────────────────────────────────────────────
// Returns a short-lived signed URL for a private athlete or coach photo.
//
// player-photos and coach-photos are private buckets, so the client can no
// longer build a photo URL itself. It asks here instead, and only an
// authenticated staff member from the SAME school as the athlete gets a URL —
// so this endpoint can't be used to sign photos across schools.

export async function POST(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ url: null }, { status: 500 });

  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ url: null }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ url: null }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const athleteId = body.athleteId ? String(body.athleteId) : null;
  const coachId = body.coachId ? String(body.coachId) : null;

  const db = getAdmin();

  if (athleteId) {
    const { data: a } = await db.from('athletes')
      .select('school_id, photo_path, photo_url').eq('id', athleteId).maybeSingle();
    // Only sign a photo for an athlete in the caller's own school.
    if (!a || a.school_id !== schoolId) return NextResponse.json({ url: null }, { status: 403 });
    const path = a.photo_path || pathFromLegacyUrl(a.photo_url, 'player-photos');
    return NextResponse.json({ url: await signPhoto('player-photos', path) });
  }

  if (coachId) {
    const { data: c } = await db.from('staff_roles')
      .select('school_id, photo_path, photo_url').eq('id', coachId).maybeSingle();
    if (!c || c.school_id !== schoolId) return NextResponse.json({ url: null }, { status: 403 });
    const path = c.photo_path || pathFromLegacyUrl(c.photo_url, 'coach-photos');
    return NextResponse.json({ url: await signPhoto('coach-photos', path) });
  }

  return NextResponse.json({ url: null }, { status: 400 });
}
