import { NextRequest, NextResponse } from 'next/server';
import { verifyPortalCookie } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/portal/data ─────────────────────────────────────────────────────────
// Returns the parent portal's content, scoped to the school on the signed
// portal_access cookie.
//
// Why this exists: the portal pages used to query Supabase directly from the
// browser, and portal_* tables carry `public read USING (true)`. That's fine
// for one school, but the moment a second school exists every parent would
// see every school's fixtures and results mixed together — and a browser
// query can't be trusted to filter itself. Doing the read here, server-side,
// from a signed cookie the client can't forge, is what actually enforces it.

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const session = verifyPortalCookie(req);
  if (!session) return NextResponse.json({ error: 'Not signed in to the portal.' }, { status: 401 });

  const sport = req.nextUrl.searchParams.get('sport') || session.sport;
  const schoolId = session.schoolId;
  const db = getAdmin();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Johannesburg' });

  // Every query is scoped by BOTH school and sport. schoolId is null only for
  // sessions issued before multi-school existed; those fall back to unscoped
  // (correct while one school exists, and they expire within 24h anyway).
  const scope = (q: any) => (schoolId ? q.eq('school_id', schoolId) : q);

  try {
    const [planRes, remindersRes, fixturesRes, resultsRes, programsRes, spotlightRes, sponsorsRes] = await Promise.all([
      scope(db.from('portal_week_plans').select('id').eq('published', true).eq('sport', sport))
        .order('created_at', { ascending: false }).limit(1),
      scope(db.from('portal_reminders').select('*').eq('is_published', true).eq('sport', sport)).order('sort_order'),
      scope(db.from('portal_fixtures').select('*').eq('is_published', true).eq('sport', sport))
        .gte('fixture_date', today).order('fixture_date').limit(8),
      scope(db.from('portal_results').select('*').eq('is_published', true).eq('sport', sport))
        .order('result_date', { ascending: false }).limit(5),
      scope(db.from('portal_programs').select('*').eq('is_published', true).eq('sport', sport)).order('sort_order').limit(6),
      scope(db.from('portal_spotlight').select('*').eq('is_published', true).eq('sport', sport)).order('sort_order'),
      scope(db.from('portal_sponsors').select('*').eq('is_published', true)).order('sort_order'),
    ]);

    const planId = planRes.data?.[0]?.id;
    const itemsRes = planId
      ? await db.from('portal_week_plan_items').select('*').eq('week_plan_id', planId).order('sort_order')
      : { data: [] };

    return NextResponse.json({
      sport,
      weekPlanItems: itemsRes.data || [],
      reminders:     remindersRes.data || [],
      fixtures:      fixturesRes.data || [],
      results:       resultsRes.data || [],
      programs:      programsRes.data || [],
      spotlight:     spotlightRes.data || [],
      sponsors:      sponsorsRes.data || [],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to load portal data.' }, { status: 500 });
  }
}
