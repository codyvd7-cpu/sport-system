import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { getActiveAlert, activateAlert, clearAlert, type ActiveAlert } from '@/lib/alertsService';

// ─── /api/safety-alert ──────────────────────────────────────────────────────────
// Adapter for the portal-admin SafetySection. Same alertsService as
// /api/alerts — this is what fixes the P0 split-brain: activations from this
// endpoint previously wrote to a `safety_alerts` table nothing rendered, and
// its pushes failed on a schema mismatch. The response shape this section's
// UI expects (active / activated_by / activated_at / is_active / push counts)
// is preserved by mapping from the unified `urgent_alerts` rows.

function toLegacyShape(a: ActiveAlert | null) {
  if (!a) return null;
  return {
    id: a.id, type: a.type, message: a.message, sport: null,
    activated_by: a.created_by, activated_at: a.created_at, is_active: true,
  };
}

export async function GET() {
  if (!adminConfigured()) return NextResponse.json({ active: null });
  const alert = await getActiveAlert(getAdmin());
  const res = NextResponse.json({ active: toLegacyShape(alert) });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req: NextRequest) {
  // Policy aligned with /lightning: alert activation is owner + head_of_sport only.
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport']);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorized.' }, { status: 401 });
  if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const db = getAdmin();
  const body = await req.json().catch(() => ({}));
  const actor = auth.email || 'Staff';

  try {
    if (body.action === 'activate') {
      const { alert, pushed, pushConfigured } = await activateAlert(db, {
        message: body.message, type: String(body.type || 'lightning'), actor,
      });
      return NextResponse.json({
        ok: true,
        alert: toLegacyShape(alert),
        push: { sent: pushed, failed: 0, configured: pushConfigured },
      });
    }
    if (body.action === 'resolve') {
      const { pushed, pushConfigured } = await clearAlert(db);
      // UI derives "no active alert" from alert.is_active being falsy
      return NextResponse.json({
        ok: true,
        alert: null,
        push: { sent: pushed, failed: 0, configured: pushConfigured },
      });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Alert action failed' }, { status: 500 });
  }
}
