import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { rolesFor } from '@/lib/authz';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
import { broadcastPush, pushReady } from '@/lib/push';

// ─── /api/notifications/send ─────────────────────────────────────────────────────
// Adapter for the staff broadcast page (app/notifications). Consolidated onto
// the shared broadcastPush() pipeline instead of its own inline web-push call
// and its own (mismatched) subscription-column assumptions.

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, rolesFor('notifications.send'));
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorized.' }, { status: 401 });
  if (!adminConfigured() || !pushReady()) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }

  const { title, body, url } = await req.json().catch(() => ({}));
  if (!title || !body) return NextResponse.json({ error: 'Title and body required.' }, { status: 400 });

  try {
    const schoolId = await resolveStaffSchoolId(auth.email);
    const sent = await broadcastPush(getAdmin(), { title, body, url: url || '/dashboard', tag: 'altus-notify' }, schoolId);
    return NextResponse.json({ ok: true, sent, failed: 0 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Send failed' }, { status: 500 });
  }
}
