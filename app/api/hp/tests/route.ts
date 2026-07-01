import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyHpCookie } from '@/lib/serverAuth';

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const term = searchParams.get('term');
  const year = searchParams.get('year');
  let q = admin().from('hp_test_results').select('*');
  if (term) q = q.eq('term', term);
  if (year) q = q.eq('year', Number(year));
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ results: data || [] });
}

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { action, payload } = await req.json();
  const db = admin();
  if (action === 'upsert') {
    await db.from('hp_test_results').delete()
      .eq('student_id', payload.student_id)
      .eq('term', payload.term)
      .eq('year', payload.year);
    const { error } = await db.from('hp_test_results').insert([payload]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
