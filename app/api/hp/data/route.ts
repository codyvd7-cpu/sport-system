import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';
import { getDashboardData, saveTestResult, saveAttendance } from '@/lib/hpRepository';

// Whitelisted tables for HP writes — no arbitrary table injection
const ALLOWED_HP_TABLES = ['hp_students', 'hp_attendance', 'hp_test_results'] as const;
type AllowedTable = typeof ALLOWED_HP_TABLES[number];

function getAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Server misconfigured: missing service role key.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

function requireHpAuth(req: NextRequest) {
  if (!verifyHpCookie(req)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authErr = requireHpAuth(req);
  if (authErr) return authErr;

  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type');

  let admin: any;
  try { admin = getAdmin(); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

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
      if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
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
      const classId = searchParams.get('id');
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const resolvedGrade = grade || (classId ? (classId[0] === '8' ? 'Grade 8' : 'Grade 9') : null);
      const resolvedCls   = cls   || (classId ? classId[1] : null);
      if (!resolvedGrade || !resolvedCls) return NextResponse.json({ students: [], attendance: [], tests: [] });
      const sRes = await admin.from('hp_students').select('*')
        .eq('grade', resolvedGrade).eq('class_group', resolvedCls).eq('is_active', true).order('full_name');
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
    return NextResponse.json({ error: 'Unknown type.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = requireHpAuth(req);
  if (authErr) return authErr;

  let admin: any;
  try { admin = getAdmin(); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }

  const body = await req.json();
  const { action, table, ...payload } = body;

  // Whitelist table names — never allow arbitrary tables from request body
  if (table && !ALLOWED_HP_TABLES.includes(table as AllowedTable)) {
    return NextResponse.json({ error: 'Invalid table.' }, { status: 400 });
  }

  try {
    if (action === 'save_test_result') {
      try { await saveTestResult(admin, payload); return NextResponse.json({ ok: true }); }
      catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    }
    if (action === 'save_attendance') {
      const { date, records } = payload;
      try { await saveAttendance(admin, date, records); return NextResponse.json({ ok: true }); }
      catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    }
    if (action === 'update') {
      if (!ALLOWED_HP_TABLES.includes(table as AllowedTable)) return NextResponse.json({ error: 'Invalid table.' }, { status: 400 });
      const { error } = await admin.from(table).update(payload.data).eq(payload.matchCol, payload.matchVal);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'insert') {
      if (!ALLOWED_HP_TABLES.includes(table as AllowedTable)) return NextResponse.json({ error: 'Invalid table.' }, { status: 400 });
      const { error } = await admin.from(table).insert([payload.data]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
