import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File;
    const athleteId = formData.get('athleteId') as string;

    if (!file || !athleteId) {
      return NextResponse.json({ error: 'Missing photo or athlete ID.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${athleteId}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('player-photos')
      .upload(path, bytes, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from('player-photos')
      .getPublicUrl(path);

    // Save URL to athlete record
    await supabase.from('athletes').update({ photo_url: publicUrl }).eq('id', athleteId);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
