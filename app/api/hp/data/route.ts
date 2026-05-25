import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

function getAdmin(): any {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function GET(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');
  const admin = getAdmin();

  try {
    if (type === 'testing') {
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const term = searchParams.get('term');
      const grade = searchParams.get('grade');
      let sQ = admin.from('hp_students').select('*').eq('is_active', true).order('full_name');
      if (grade && grade !== 'All') sQ = sQ.eq('grade', grade);
      let rQ = admin.from('hp_test_results').select('*').eq('year', year);
      if (term) rQ = rQ.eq('term', term);
      const [sRes, rRes] = await Promise.all([sQ, rQ]);
      return NextResponse.json({ students: sRes.data || [], tests: rRes.data || [] });
    }
    if (type === 'students') {
      const { data, error } = await admin.from('hp_students').select('*').eq('is_active', true).order('full_name');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (type === 'student') {
      const id = searchParams.get('id');
      const [sRes, aRes, tRes] = await Promise.all([
        admin.from('hp_students').select('*').eq('id', id).single(),
        admin.from('hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
        admin.from('hp_test_results').select('*').eq('student_id', id).order('year').order('term'),
      ]);
      return NextResponse.json({ student: sRes.data, attendance: aRes.data || [], tests: tRes.data || [] });
    }
    if (type === 'class') {
      const grade = searchParams.get('grade');
      const cls = searchParams.get('cls');
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const sRes = await admin.from('hp_students').select('*').eq('grade', grade).eq('class_group', cls).eq('is_active', true).order('full_name');
      const ids = (sRes.data || []).map((s: any) => s.id);
      if (!ids.length) return NextResponse.json({ students: [], attendance: [], tests: [] });
      const [aRes, tRes] = await Promise.all([
        admin.from('hp_attendance').select('*').in('student_id', ids).order('session_date', { ascending: false }).limit(500),
        admin.from('hp_test_results').select('*').in('student_id', ids).eq('year', year),
      ]);
      return NextResponse.json({ students: sRes.data || [], attendance: aRes.data || [], tests: tRes.data || [] });
    }
    if (type === 'dashboard') {
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const [sRes, tRes, aRes] = await Promise.all([
        admin.from('hp_students').select('*').eq('is_active', true),
        admin.from('hp_test_results').select('student_id,term,year').eq('year', year),
        admin.from('hp_attendance').select('student_id,session_date,status').order('session_date', { ascending: false }).limit(2000),
      ]);
      return NextResponse.json({ students: sRes.data || [], tests: tRes.data || [], attendance: aRes.data || [] });
    }
    if (type === 'trends') {
      const [sRes, tRes] = await Promise.all([
        admin.from('hp_students').select('*').eq('is_active', true),
        admin.from('hp_test_results').select('*').order('year').order('term'),
      ]);
      return NextResponse.json({ students: sRes.data || [], tests: tRes.data || [] });
    }
    if (type === 'attendance') {
      const [sRes, aRes] = await Promise.all([
        admin.from('hp_students').select('*').eq('is_active', true),
        admin.from('hp_attendance').select('*').order('session_date', { ascending: false }).limit(500),
      ]);
      return NextResponse.json({ students: sRes.data || [], attendance: aRes.data || [] });
    }
    return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = getAdmin();
  const body = await req.json();
  const { action, table, ...payload } = body;

  try {
    if (action === 'save_test_result') {
      const { student_id, term, year, ...testData } = payload;
      await admin.from('hp_test_results').delete().eq('student_id', student_id).eq('term', term).eq('year', year);
      const { error } = await admin.from('hp_test_results').insert([{ student_id, term, year, ...testData }]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'save_attendance') {
      const { date, records } = payload;
      const ids = records.map((r: any) => r.student_id);
      await admin.from('hp_attendance').delete().eq('session_date', date).in('student_id', ids);
      const { error } = await admin.from('hp_attendance').insert(records);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'insert') {
      const { error } = await admin.from(table).insert([payload.data]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'upsert') {
      const { error } = await admin.from(table).upsert(payload.data, { onConflict: payload.onConflict });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'update') {
      const { error } = await admin.from(table).update(payload.data).eq(payload.matchCol, payload.matchVal);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'delete') {
      const { error } = await admin.from(table).delete().eq(payload.matchCol, payload.matchVal);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'delete_many') {
      const { error } = await admin.from(table).delete().in(payload.matchCol, payload.matchVals);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'insert_many') {
      const { error } = await admin.from(table).insert(payload.data);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}