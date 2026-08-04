import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyHpCookie, getHpSchoolId } from '@/lib/serverAuth';

function getAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Server misconfigured.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function requireAuth(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  return null;
}

export async function GET(req: NextRequest) {
  const err = requireAuth(req);
  if (err) return err;
  try {
    const admin = getAdmin();
    const schoolId = getHpSchoolId(req);
    let q = admin.from('hp_students').select('*').eq('is_active', true).order('full_name');
    if (schoolId) q = q.eq('school_id', schoolId);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ students: data || [] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: NextRequest) {
  const err = requireAuth(req);
  if (err) return err;
  try {
    const admin = getAdmin();
    const body = await req.json();
    const { action, ...payload } = body;

    if (action === 'add') {
      const { error } = await admin.from('hp_students').insert([{
        full_name: payload.full_name, grade: payload.grade, class_group: payload.class_group, is_active: true,
        school_id: getHpSchoolId(req),
      }]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'remove') {
      let dq = admin.from('hp_students').update({ is_active: false }).eq('id', payload.id);
      { const sid = getHpSchoolId(req); if (sid) dq = dq.eq('school_id', sid); }
      const { error } = await dq;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'update_notes') {
      let nq = admin.from('hp_students').update({ notes: payload.notes }).eq('id', payload.id);
      { const sid = getHpSchoolId(req); if (sid) nq = nq.eq('school_id', sid); }
      const { error } = await nq;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'update_group') {
      let tq = admin.from('hp_students').update({ training_group: payload.training_group }).eq('id', payload.id);
      { const sid = getHpSchoolId(req); if (sid) tq = tq.eq('school_id', sid); }
      const { error } = await tq;
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
