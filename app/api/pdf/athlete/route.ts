import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';

// For a personal best, timed/agility tests are better when LOWER; distance and
// strength are better when HIGHER. (AP-24 — the old code always took the max,
// so a slower sprint was labelled a PB.)
function lowerIsBetter(testType: string, unit: string): boolean {
  const u = (unit || '').trim().toLowerCase();
  if (['s', 'sec', 'secs', 'second', 'seconds', 'min', 'mins', 'minute', 'minutes'].includes(u)) return true;
  return /sprint|agility|dash|shuttle|\brun\b|yo-?yo|time|5-?0-?5|t-?test|\d+\s?m\b/i.test(testType || '');
}

export async function GET(req: NextRequest) {
  // Staff only. This export carries full history AND private coach notes — the
  // old handler accepted ANY authenticated account (incl. a player/parent) and
  // any athlete id, with no school/role/ownership check (AP-02).
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic', 'coach', 'head_of_hockey']);
  if (!auth.ok) return NextResponse.json({ error: auth.reason || 'Unauthorized.' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const schoolId = await resolveStaffSchoolId(auth.email);
  if (!schoolId) return NextResponse.json({ error: 'No school for this account.' }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Prove the athlete belongs to the caller's school BEFORE loading anything.
  // Same 404 for "doesn't exist" and "different school" — never confirm the
  // existence of another school's athlete.
  const { data: athlete } = await admin.from('athletes')
    .select('full_name,team,age_group,position,availability,photo_url,school_id')
    .eq('id', id).eq('school_id', schoolId).maybeSingle();
  if (!athlete) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const [{ data: attendance }, { data: perf }, { data: notes }] = await Promise.all([
    admin.from('attendance').select('status,session_date,session_type').eq('athlete_id', id).order('session_date', { ascending: false }).limit(50),
    admin.from('performance_tests').select('test_type,value,unit,test_date').eq('athlete_id', id).order('test_date', { ascending: false }),
    admin.from('coach_notes').select('strengths,current_focus,coach_comment').eq('athlete_id', id).order('created_at', { ascending: false }).limit(1),
  ]);

  const pbMap: Record<string, { value: number; unit: string; date: string }> = {};
  (perf || []).forEach((p: any) => {
    const existing = pbMap[p.test_type];
    const better = !existing || (lowerIsBetter(p.test_type, p.unit) ? p.value < existing.value : p.value > existing.value);
    if (better) pbMap[p.test_type] = { value: p.value, unit: p.unit, date: p.test_date };
  });

  const total = (attendance || []).length;
  const present = (attendance || []).filter((a: any) => ['Present', 'Late'].includes(a.status)).length;
  const rate = total > 0 ? Math.round((present / total) * 100) : null;

  const { school_id, ...athleteOut } = athlete as any;
  return NextResponse.json({ athlete: athleteOut, attendance: attendance || [], pbs: pbMap, notes: notes?.[0] || null, stats: { total, present, rate } });
}
