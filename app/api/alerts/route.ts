import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authenticateRequest } from '@/lib/serverAuth';
import { broadcastPush } from '@/lib/push';

// ─── Urgent alerts (lightning) ──────────────────────────────────────────────────
// GET  → current active alert (public — the banner polls this)
// POST → staff only: { action: 'activate', message } | { action: 'clear' }
//        Activation broadcasts a push notification to every subscriber.

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function GET() {
  const { data } = await admin().from('urgent_alerts')
    .select('id,type,message,created_at')
    .eq('active', true).order('created_at', { ascending: false }).limit(1);
  const res = NextResponse.json({ alert: data?.[0] || null });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner', 'head_of_sport']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = admin();
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}

  if (body.action === 'activate') {
    const message = String(body.message || '').trim() ||
      'Lightning detected — all outdoor training and matches are suspended. Move indoors immediately.';
    // Clear any previous active alert, then create the new one
    await db.from('urgent_alerts').update({ active: false, cleared_at: new Date().toISOString() }).eq('active', true);
    const { data, error } = await db.from('urgent_alerts')
      .insert([{ type: 'lightning', message, created_by: auth.email || 'staff' }])
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const sent = await broadcastPush(db, {
      title: '⚡ LIGHTNING ALERT — St Benedict\u2019s Sport',
      body: message,
      url: '/portal',
      urgent: true,
      tag: 'lightning',
    });
    return NextResponse.json({ ok: true, alert: data, pushed: sent });
  }

  if (body.action === 'clear') {
    await db.from('urgent_alerts').update({ active: false, cleared_at: new Date().toISOString() }).eq('active', true);
    const sent = await broadcastPush(db, {
      title: 'All clear — St Benedict\u2019s Sport',
      body: 'The lightning alert has been lifted. Activities may resume as directed by coaches.',
      url: '/portal',
      tag: 'lightning',
    });
    return NextResponse.json({ ok: true, pushed: sent });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
