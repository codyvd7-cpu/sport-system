import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Rate limit: 10 attempts per minute per IP
  const ip = getClientId(req);
  const rl = rateLimit(`player-lookup:${ip}`, { max: 10, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Please wait a minute and try again.' },
      { status: 429 }
    );
  }

  try {
    const { code } = await req.json();
    if (!code || typeof code !== 'string' || code.length > 20) {
      return NextResponse.json({ error: 'Invalid code format.' }, { status: 400 });
    }

    // Use anon client — RLS protects data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('athletes')
      .select('id')
      .eq('player_code', code.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) {
      // Always return same delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 200));
      return NextResponse.json({ found: false, error: 'Invalid code. Please check and try again.' }, { status: 404 });
    }

    return NextResponse.json({ found: true });
  } catch {
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
