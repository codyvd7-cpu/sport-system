import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { rateLimit, getClientId } from '@/lib/rateLimit';

// ─── /api/player/photo ──────────────────────────────────────────────────────
// Profile photo upload for the authed player portal. Ownership is proven by
// the caller's login: we only ever update the athlete linked to THEIR
// player_profiles row — no athlete id or code accepted from the client.

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`player-photo:${ip}`, { max: 6, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Too many uploads — try again in a minute.' }, { status: 429 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Verify the player's session token
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data: userData, error: userErr } = await db.auth.getUser(token);
  if (userErr || !userData.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    if (!file) return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG and WebP allowed.' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });
    }

    // The only athlete you can update is the one linked to your own profile
    const { data: profile } = await db.from('player_profiles')
      .select('athlete_id').eq('user_id', userData.user.id).maybeSingle();
    if (!profile?.athlete_id) {
      return NextResponse.json({ error: 'Link your athlete record first (Settings → Edit Profile).' }, { status: 400 });
    }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${profile.athlete_id}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await db.storage
      .from('player-photos')
      .upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = db.storage.from('player-photos').getPublicUrl(path);
    const url = `${publicUrl}?v=${Date.now()}`; // cache-bust so the new photo shows immediately

    await db.from('athletes').update({ photo_url: url }).eq('id', profile.athlete_id);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 });
  }
}
