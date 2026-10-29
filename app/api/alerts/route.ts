import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getActiveAlert, activateAlert, clearAlert } from '@/lib/alertsService';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';

// ─── /api/alerts ────────────────────────────────────────────────────────────────
// Thin adapter over lib/alertsService (shared with /api/safety-alert).
// GET  ?school=<slug> → current active alert for THAT school (public — banner polls)
// POST → owner / head_of_sport: { action: 'activate', message? } | { action: 'clear' }

export async function GET(req: NextRequest) {
  if (!adminConfigured()) return NextResponse.json({ alert: null });
  // Scope the read to a school (AP-12). Without one, return nothing rather than
  // leaking whichever school most recently raised an alert.
  const slug = req.nextUrl.searchParams.get('school');
  const noAlert = () => { const r = NextResponse.json({ alert: null }); r.headers.set('Cache-Control', 'no-store'); return r; };
  if (!slug) return noAlert();
  const branding = await getSchoolBrandingBySlug(slug);
  if (!branding) return noAlert();
  const alert = await getActiveAlert(getAdmin(), branding.id);
  const res = NextResponse.json({ alert });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const db = getAdmin();
  const schoolId = await resolveStaffSchoolId(auth.email);
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}

  try {
    if (body.action === 'activate') {
      const { alert, pushed, pushConfigured } = await activateAlert(db, {
        message: body.message, type: 'lightning', actor: auth.email || 'staff', schoolId,
      });
      return NextResponse.json({ ok: true, alert, pushed, pushConfigured });
    }
    if (body.action === 'clear') {
      const { pushed, pushConfigured } = await clearAlert(db, schoolId);
      return NextResponse.json({ ok: true, pushed, pushConfigured });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Alert action failed' }, { status: 500 });
  }
}
