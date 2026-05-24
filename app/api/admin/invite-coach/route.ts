import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Service key not configured.' }, { status: 500 });

  try {
    const { email, name, role, teams } = await req.json();
    if (!email || !name || !role) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Send invite email
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
      data: { role, full_name: name },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://sport-system-rosy.vercel.app'}/login`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    // Create staff_roles record
    const { error: dbErr } = await admin.from('staff_roles').upsert([{
      email: email.trim().toLowerCase(),
      role,
      teams: role === 'head_of_hockey' ? [] : (teams || []),
      is_active: true,
    }], { onConflict: 'email' });

    if (dbErr) return NextResponse.json({ error: `Invited but role failed: ${dbErr.message}` }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
