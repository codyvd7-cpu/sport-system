import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  // Auth check — must have valid HP session cookie or Supabase session
  const cookieHeader = req.headers.get('cookie') || '';
  const hpAccess = cookieHeader.includes('hp_access') ||
    req.headers.get('x-hp-access') === 'true';

  // Also accept Supabase auth token (coaches logged into hockey side)
  const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
  let supabaseAuthed = false;
  if (tokenMatch) {
    try {
      const token = decodeURIComponent(tokenMatch[1]);
      const parsed = JSON.parse(token);
      const accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
      if (accessToken) {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser(accessToken);
        if (user) supabaseAuthed = true;
      }
    } catch {}
  }

  if (!hpAccess && !supabaseAuthed) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set.' }, { status: 500 });

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.length > 4000) {
      return NextResponse.json({ error: 'Invalid prompt.' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 600, messages: [{ role: 'user', content: prompt }] }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: `OpenAI error: ${data.error?.message || response.status}` }, { status: 500 });
    const text = data.choices?.[0]?.message?.content || 'Could not generate summary.';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ error: `Server error: ${e.message}` }, { status: 500 });
  }
}
