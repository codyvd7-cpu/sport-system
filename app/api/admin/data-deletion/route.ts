import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

/**
 * POPIA Right to Erasure endpoint.
 * Deletes all personal data for an athlete by their ID.
 * Restricted to HOH and owner roles only.
 * Every deletion is logged in audit_log before execution.
 */
export async function DELETE(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`data-deletion:${ip}`, { max: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const auth = await authenticateRequest(req, ['owner', 'head_of_hockey']);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorised' }, { status: 401 });

  try {
    const { athleteId, reason } = await req.json();
    if (!athleteId || typeof athleteId !== 'string') {
      return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.length < 10) {
      return NextResponse.json({ error: 'A reason for deletion is required (min 10 chars).' }, { status: 400 });
    }

    // Use service role to bypass RLS for deletion (this is intentional — we're doing a full erasure)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) return NextResponse.json({ error: 'Service key not configured.' }, { status: 500 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // First get athlete name for the audit log
    const { data: athlete } = await supabase.from('athletes').select('full_name, team').eq('id', athleteId).maybeSingle();

    // Log the deletion request BEFORE deleting
    await supabase.from('audit_log').insert([{
      actor_email: auth.email,
      action: 'popia_erasure',
      table_name: 'athletes',
      record_id: athleteId,
      details: {
        athlete_name: athlete?.full_name || 'Unknown',
        team: athlete?.team,
        reason,
        tables_cleared: ['attendance', 'performance_tests', 'coach_notes', 'athletes'],
      },
    }]);

    // Delete all linked data in order
    await supabase.from('attendance').delete().eq('athlete_id', athleteId);
    await supabase.from('performance_tests').delete().eq('athlete_id', athleteId);
    await supabase.from('coach_notes').delete().eq('athlete_id', athleteId);
    await supabase.from('athletes').delete().eq('id', athleteId);

    return NextResponse.json({
      ok: true,
      message: `All data for athlete ${athlete?.full_name || athleteId} has been permanently deleted.`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}
