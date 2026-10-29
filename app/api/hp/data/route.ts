import { NextRequest, NextResponse } from 'next/server';
import { getHpActor, requireHpSchoolId } from '@/lib/serverAuth';
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

// Every HP table read must be scoped to the session's school. Rather than
// bolt .eq('school_id', ...) onto 16 separate queries by hand (miss one and
// a school sees another's students), this wraps the table access in one place.
// schoolId is always concrete here — the route refuses a null-school session
// before calling this, so there is no longer an unscoped path (AP-04/AP-05).
function hpTable(admin: any, schoolId: string, table: string) {
  const q = admin.from(table);
  return {
    select: (cols: string) => q.select(cols).eq('school_id', schoolId),
  };
}

export async function GET(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

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
      let sQ = hpTable(admin, schoolId, 'hp_students').select('*').eq('is_active', true).order('full_name');
      if (grade && grade !== 'All') sQ = sQ.eq('grade', grade);
      let rQ = hpTable(admin, schoolId, 'hp_test_results').select('*').eq('year', year);
      if (term) rQ = rQ.eq('term', term);
      const [sRes, rRes] = await Promise.all([sQ, rQ]);
      return NextResponse.json({ students: sRes.data || [], tests: rRes.data || [] });
    }
    if (type === 'students') {
      const { data, error } = await hpTable(admin, schoolId, 'hp_students').select('*').eq('is_active', true).order('full_name');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ data });
    }
    if (type === 'student') {
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'Missing id.' }, { status: 400 });
      const [sRes, aRes, tRes] = await Promise.all([
        hpTable(admin, schoolId, 'hp_students').select('*').eq('id', id).single(),
        hpTable(admin, schoolId, 'hp_attendance').select('*').eq('student_id', id).order('session_date', { ascending: false }),
        hpTable(admin, schoolId, 'hp_test_results').select('*').eq('student_id', id).order('year').order('term'),
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
      const sRes = await hpTable(admin, schoolId, 'hp_students').select('*')
        .eq('grade', resolvedGrade).eq('class_group', resolvedCls).eq('is_active', true).order('full_name');
      const ids = (sRes.data || []).map((s: any) => s.id);
      if (!ids.length) return NextResponse.json({ students: [], attendance: [], tests: [] });
      const [aRes, tRes] = await Promise.all([
        hpTable(admin, schoolId, 'hp_attendance').select('*').in('student_id', ids).order('session_date', { ascending: false }).limit(500),
        hpTable(admin, schoolId, 'hp_test_results').select('*').in('student_id', ids).eq('year', year),
      ]);
      return NextResponse.json({ students: sRes.data || [], attendance: aRes.data || [], tests: tRes.data || [] });
    }
    if (type === 'dashboard') {
      const year = searchParams.get('year') || new Date().getFullYear().toString();
      const [sRes, tRes, aRes] = await Promise.all([
        hpTable(admin, schoolId, 'hp_students').select('*').eq('is_active', true),
        hpTable(admin, schoolId, 'hp_test_results').select('student_id,term,year').eq('year', year),
        hpTable(admin, schoolId, 'hp_attendance').select('student_id,session_date,status').order('session_date', { ascending: false }).limit(2000),
      ]);
      return NextResponse.json({ students: sRes.data || [], tests: tRes.data || [], attendance: aRes.data || [] });
    }
    if (type === 'trends') {
      const [sRes, tRes] = await Promise.all([
        hpTable(admin, schoolId, 'hp_students').select('*').eq('is_active', true),
        hpTable(admin, schoolId, 'hp_test_results').select('*').order('year').order('term'),
      ]);
      return NextResponse.json({ students: sRes.data || [], tests: tRes.data || [] });
    }
    if (type === 'attendance') {
      const [sRes, aRes] = await Promise.all([
        hpTable(admin, schoolId, 'hp_students').select('*').eq('is_active', true),
        hpTable(admin, schoolId, 'hp_attendance').select('*').order('session_date', { ascending: false }).limit(500),
      ]);
      return NextResponse.json({ students: sRes.data || [], attendance: aRes.data || [] });
    }
    return NextResponse.json({ error: 'Unknown type.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

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
      try { await saveTestResult(admin, payload, getHpActor(req), schoolId); return NextResponse.json({ ok: true }); }
      catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    }
    if (action === 'save_attendance') {
      const { date, records } = payload;
      try { await saveAttendance(admin, date, records, getHpActor(req), schoolId); return NextResponse.json({ ok: true }); }
      catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }
    }
    if (action === 'update') {
      if (!ALLOWED_HP_TABLES.includes(table as AllowedTable)) return NextResponse.json({ error: 'Invalid table.' }, { status: 400 });
      // Scope the update to the caller's own school, and force the row's
      // school_id to stay put. Without this an HP coach could update ANY
      // school's row by id (matchCol/matchVal are client-supplied) and even
      // re-tag it into another school via payload.data.school_id (AP-04).
      const data = { ...(payload.data || {}), school_id: schoolId };
      const { error } = await admin.from(table).update(data)
        .eq(payload.matchCol, payload.matchVal).eq('school_id', schoolId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    if (action === 'insert') {
      if (!ALLOWED_HP_TABLES.includes(table as AllowedTable)) return NextResponse.json({ error: 'Invalid table.' }, { status: 400 });
      // Force the session's school onto every inserted row — never trust a
      // client-supplied school_id, which would let one school plant rows in
      // another's data (AP-04).
      const row = { ...(payload.data || {}), school_id: schoolId };
      const { error } = await admin.from(table).insert([row]);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
