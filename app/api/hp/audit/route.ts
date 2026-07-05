import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';
import { getHpAdmin } from '@/lib/hpRepository';

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { action, actor, details } = await req.json();
    const db = getHpAdmin();
    await db.from('hp_audit_log').insert([{ action, actor: actor || 'unknown', details: details || {} }]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data } = await getHpAdmin().from('hp_audit_log')
      .select('*').order('created_at', { ascending: false }).limit(50);
    return NextResponse.json({ logs: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
