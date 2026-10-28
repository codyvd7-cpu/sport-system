import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, type StaffRole } from '@/lib/serverAuth';
import { canGrantRole } from '@/lib/staffAuth';

export async function POST(req: NextRequest) {
  // Only roles that may administer staff — now including modern head_of_sport.
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport', 'head_of_hockey']);
  if (!auth.ok || !auth.role) return NextResponse.json({ error: auth.reason || 'Unauthorized.' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Service key not configured.' }, { status: 500 });

  try {
    const { email, name, role, teams } = await req.json();
    if (!email || !name || !role) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });

    // Enforce the role-grant matrix (AP-08): a legacy head_of_hockey could
    // previously request role:owner and escalate. canGrantRole rejects any
    // target the caller isn't permitted to create.
    if (!canGrantRole(auth.role, role as StaffRole)) {
      return NextResponse.json({ error: 'You are not permitted to grant that role.' }, { status: 403 });
    }

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // The invite is service-role driven (bypasses RLS entirely), so the new
    // coach's school_id has to be resolved explicitly — it's whichever school
    // the inviting owner/HOH themselves belongs to. A null school would create
    // a tenant-less membership, so reject it.
    const { data: inviterRow } = await admin.from('staff_roles')
      .select('school_id').eq('email', auth.email).maybeSingle();
    const schoolId = inviterRow?.school_id || null;
    if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

    // Send invite email
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      data: { role, full_name: name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sport-system-rosy.vercel.app'}/set-password`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Create staff_roles record
    const { error: dbErr } = await admin.from('staff_roles').upsert([{
      email: email.trim().toLowerCase(),
      role,
      teams: role === 'head_of_hockey' ? [] : (teams || []),
      is_active: true,
      school_id: schoolId,
    }], { onConflict: 'email' });

    if (dbErr) return NextResponse.json({ error: `Invited but role failed: ${dbErr.message}` }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
