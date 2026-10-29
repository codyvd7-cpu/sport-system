import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { rolesFor } from '@/lib/authz';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

export async function DELETE(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`data-deletion:${ip}`, { max: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const auth = await authenticateRequest(req, rolesFor('school.admin'));
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorised' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  try {
    const { athleteId, reason } = await req.json();
    if (!athleteId || typeof athleteId !== 'string') {
      return NextResponse.json({ error: 'athleteId required.' }, { status: 400 });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length < 10) {
      return NextResponse.json({ error: 'A reason for deletion is required (min 10 chars).' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // The athlete MUST belong to the caller's school (AP-01). Previously the
    // service-role handler deleted by athleteId with no tenant check, so a
    // school-A admin could erase a school-B athlete. Same 404 for "not found"
    // and "other school".
    const { data: target } = await supabase.from('athletes').select('id').eq('id', athleteId).eq('school_id', schoolId).maybeSingle();
    if (!target) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

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

    // Delete all linked personal data, checking each result so a failure is
    // reported truthfully instead of a blanket success. (Full atomicity needs a
    // DB transaction/RPC — tracked as a follow-up; the critical cross-school
    // boundary is closed above.)
    const failed: string[] = [];
    {
      const r1 = await supabase.from('attendance').delete().eq('athlete_id', athleteId);
      if (r1.error) failed.push('attendance');
      const r2 = await supabase.from('performance_tests').delete().eq('athlete_id', athleteId);
      if (r2.error) failed.push('performance_tests');
      const r3 = await supabase.from('coach_notes').delete().eq('athlete_id', athleteId);
      if (r3.error) failed.push('coach_notes');
      const r4 = await supabase.from('athletes').delete().eq('id', athleteId);
      if (r4.error) failed.push('athletes');
    }
    if (failed.length) {
      return NextResponse.json({ error: `Deletion incomplete — failed on: ${failed.join(', ')}. Please retry.`, failed }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Athlete data permanently deleted.' });
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}
