import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';

// ─── /api/portal/leaderboard ──────────────────────────────────────────────────
// SECURITY FIX. This route used the service-role key with NO authentication
// and NO school filter, returning up to 500 athletes' names and teams plus
// their attendance records to anyone who requested the URL — across every
// school on the platform. It was reachable in production and nothing in the
// app even called it, so the exposure was invisible.
//
// Now requires an authenticated staff member and is scoped to that person's
// own school. Athlete names belong behind authentication whatever the
// endpoint was originally intended for.

export async function GET(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`portal-leaderboard:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const sport = req.nextUrl.searchParams.get('sport') || 'hockey';

    const [athletesRes, attendanceRes, performanceRes] = await Promise.all([
      admin.from('athletes').select('id,full_name,team,sport').eq('sport', sport).eq('school_id', schoolId).limit(500),
      admin.from('attendance').select('athlete_id,status,session_type,sport').eq('sport', sport).eq('school_id', schoolId).limit(2000),
      admin.from('performance_tests').select('athlete_id,test_date').eq('school_id', schoolId).limit(2000),
    ]);

    // Strip to first name only before returning — privacy protection
    const athletes = (athletesRes.data || []).map((a: any) => ({
      id:        a.id,
      firstName: (a.full_name || '').split(' ')[0],
      team:      a.team,
    }));

    return NextResponse.json({
      athletes,
      attendance:  attendanceRes.data  || [],
      performance: performanceRes.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
