import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getActiveAlert, activateAlert, clearAlert } from '@/lib/alertsService';

// ─── /api/alerts ────────────────────────────────────────────────────────────────
// Thin adapter over lib/alertsService (shared with /api/safety-alert).
// GET  → current active alert (public — the banner polls this)
// POST → owner / head_of_sport: { action: 'activate', message? } | { action: 'clear' }

export async function GET() {
  if (!adminConfigured()) return NextResponse.json({ alert: null });
  const alert = await getActiveAlert(getAdmin());
  const res = NextResponse.json({ alert });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const db = getAdmin();
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}

  try {
    if (body.action === 'activate') {
      const { alert, pushed } = await activateAlert(db, {
        message: body.message, type: 'lightning', actor: auth.email || 'staff',
      });
      return NextResponse.json({ ok: true, alert, pushed });
    }
    if (body.action === 'clear') {
      const { pushed } = await clearAlert(db);
      return NextResponse.json({ ok: true, pushed });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Alert action failed' }, { status: 500 });
  }
}
