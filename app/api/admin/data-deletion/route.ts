import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`data-deletion:${ip}`, { max: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const auth = await authenticateRequest(req, ['owner', 'head_of_hockey']);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorised' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const { athleteId, reason } = await req.json();
    if (!athleteId || typeof athleteId !== 'string') {
      return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json({ error: 'A reason for deletion is required (min 10 chars).' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // Log MINIMAL audit record — no personal data stored in audit log
    // Store only what is needed to prove the deletion happened
    await supabase.from('audit_log').insert([{
      actor_email: auth.email,
      action: 'popia_erasure',
      table_name: 'athletes',
      record_id: athleteId,
      details: {
        // Do NOT store athlete name, team, or any personal data
        reason: reason.trim(),
        tables_cleared: ['attendance', 'performance_tests', 'coach_notes', 'athletes'],
        requested_at: new Date().toISOString(),
      },
    }]);

    // Delete all linked personal data
    await supabase.from('attendance').delete().eq('athlete_id', athleteId);
    await supabase.from('performance_tests').delete().eq('athlete_id', athleteId);
    await supabase.from('coach_notes').delete().eq('athlete_id', athleteId);
    await supabase.from('athletes').delete().eq('id', athleteId);

    return NextResponse.json({ ok: true, message: 'Athlete data permanently deleted.' });
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}
