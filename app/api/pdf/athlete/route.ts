import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const [{ data: athlete }, { data: attendance }, { data: perf }, { data: notes }] = await Promise.all([
    admin.from('athletes').select('full_name,team,age_group,position,availability,photo_url').eq('id', id).single(),
    admin.from('attendance').select('status,session_date,session_type').eq('athlete_id', id).order('session_date', { ascending: false }).limit(50),
    admin.from('performance_tests').select('test_type,value,unit,test_date').eq('athlete_id', id).order('test_date', { ascending: false }),
    admin.from('coach_notes').select('strengths,current_focus,coach_comment').eq('athlete_id', id).order('created_at', { ascending: false }).limit(1),
  ]);

  const pbMap: Record<string, { value: number; unit: string; date: string }> = {};
  (perf || []).forEach((p: any) => {
    const existing = pbMap[p.test_type];
    if (!existing || p.value > existing.value)
      pbMap[p.test_type] = { value: p.value, unit: p.unit, date: p.test_date };
  });

  const total = (attendance || []).length;
  const present = (attendance || []).filter((a: any) => ['Present','Late'].includes(a.status)).length;
  const rate = total > 0 ? Math.round((present / total) * 100) : null;

  return NextResponse.json({ athlete, attendance: attendance || [], pbs: pbMap, notes: notes?.[0] || null, stats: { total, present, rate } });
}
