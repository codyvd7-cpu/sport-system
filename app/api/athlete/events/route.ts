import { NextRequest, NextResponse } from 'next/server';
import { authorize, requireOwnedAthlete } from '@/lib/staffAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { recordAthleteEvent, getAthleteTimeline, type AthleteEventType } from '@/lib/athleteEvents';

// ─── /api/athlete/events ──────────────────────────────────────────────────────
// GET  ?athleteId=  → that athlete's timeline
// POST { athleteId, type, summary, detail? } → record an event
//
// Coach-side pages write through here rather than inserting directly, so the
// school and the acting coach are resolved server-side and can't be spoofed
// from the browser. Events are deliberately append-only: there is no edit or
// delete, because a history you can quietly rewrite isn't a history.

export async function GET(req: NextRequest) {
  const ctx = await authorize(req, 'athlete.view');
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const athleteId = req.nextUrl.searchParams.get('athleteId') || '';
  if (!athleteId) return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });

  if (!(await requireOwnedAthlete(ctx, athleteId))) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10) || 50, 200);
  return NextResponse.json({ events: await getAthleteTimeline(athleteId, limit) });
}

export async function POST(req: NextRequest) {
  const ctx = await authorize(req, 'athlete.manage');
  if (!ctx) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const body = await req.json().catch(() => ({}));
  const athleteId = String(body.athleteId || '');
  const type = String(body.type || '') as AthleteEventType;
  const summary = String(body.summary || '').trim();
  if (!athleteId || !type || !summary) {
    return NextResponse.json({ error: 'athleteId, type and summary are required.' }, { status: 400 });
  }

  if (!(await requireOwnedAthlete(ctx, athleteId))) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  await recordAthleteEvent({
    athleteId,
    schoolId: ctx.schoolId,
    type,
    summary,
    detail: typeof body.detail === 'object' && body.detail ? body.detail : {},
    sourceTable: body.sourceTable ? String(body.sourceTable) : undefined,
    actor: ctx.email || 'staff',
  });

  return NextResponse.json({ ok: true });
}
