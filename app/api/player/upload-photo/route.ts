import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientId } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`photo-upload:${ip}`, { max: 5, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads.' }, { status: 429 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const formData = await req.formData();
    const file       = formData.get('photo')      as File;
    const athleteId  = formData.get('athleteId')  as string;
    const playerCode = formData.get('playerCode') as string;

    if (!file || !athleteId || !playerCode) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Validate athleteId is a UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(athleteId)) {
      return NextResponse.json({ error: 'Invalid athlete ID.' }, { status: 400 });
    }

    // Validate file type
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG and WebP allowed.' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

    // Verify the player code matches the athlete ID — proves ownership
    const { data: athlete, error: lookupErr } = await supabase
      .from('athletes')
      .select('id, player_code')
      .eq('id', athleteId)
      .eq('player_code', playerCode.trim().toUpperCase())
      .maybeSingle();

    if (lookupErr || !athlete) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }

    const ext  = file.name.split('.').pop() || 'jpg';
    const path = `${athleteId}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('player-photos').getPublicUrl(path);

    await supabase.from('athletes').update({ photo_url: publicUrl }).eq('id', athleteId);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
