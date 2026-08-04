import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalCookie } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/portal/fixtures ─────────────────────────────────────────────────────
// School-scoped fixtures + results for the portal's fixtures pages. Same
// reasoning as /api/portal/data: portal_* tables are publicly readable, so
// the scoping has to happen server-side against the signed cookie rather than
// in a browser query that can't be trusted to filter itself.
//
// ?mode=upcoming (default) → published fixtures from today onward
// ?mode=season             → the full season: all fixtures + all results
// ?date=YYYY-MM-DD         → additionally return that specific day's fixtures

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const session = verifyPortalCookie(req);
  if (!session) return NextResponse.json({ error: 'Not signed in to the portal.' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const sport = params.get('sport') || session.sport;
  const mode = params.get('mode') || 'upcoming';
  const dateParam = params.get('date');
  const schoolId = session.schoolId;

  const db = getAdmin();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });
  const scope = (q: any) => (schoolId ? q.eq('school_id', schoolId) : q);

  try {
    if (mode === 'season') {
      const [fixturesRes, resultsRes] = await Promise.all([
        scope(db.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport))
          .order('fixture_date', { ascending: true }),
        scope(db.from('portal_results').select('*').eq('is_published', true).eq('sport', sport))
          .order('result_date', { ascending: false }),
      ]);
      return NextResponse.json({ fixtures: fixturesRes.data || [], results: resultsRes.data || [] });
    }

    const upcomingRes = await scope(
      db.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport).gte('fixture_date', today)
    ).order('fixture_date').order('fixture_time', { ascending: true });

    const upcoming = upcomingRes.data || [];
    let extra: any[] = [];

    // A link to a past fixture day won't be in the upcoming window — fetch it.
    if (dateParam && !upcoming.some((f: any) => f.fixture_date === dateParam)) {
      const extraRes = await scope(
        db.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport).eq('fixture_date', dateParam)
      ).order('fixture_time', { ascending: true });
      extra = extraRes.data || [];
    }

    return NextResponse.json({ upcoming, extra });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load fixtures.' }, { status: 500 });
  }
}
