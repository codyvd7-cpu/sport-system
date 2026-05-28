import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req, ['owner', 'head_of_hockey']);
  if (!auth.ok) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  try {
    const formData = await req.formData();
    const file    = formData.get('photo')   as File;
    const coachId = formData.get('coachId') as string;

    if (!file || !coachId) return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    if (!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type))
      return NextResponse.json({ error: 'Only JPEG, PNG and WebP allowed.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024)
      return NextResponse.json({ error: 'Image must be under 5MB.' }, { status: 400 });

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const ext  = file.name.split('.').pop() || 'jpg';
    const path = `${coachId}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('coach-photos').upload(path, bytes, { contentType: file.type, upsert: true });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from('coach-photos').getPublicUrl(path);
    await supabase.from('staff_roles').update({ photo_url: publicUrl }).eq('id', coachId);

    return NextResponse.json({ url: publicUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
