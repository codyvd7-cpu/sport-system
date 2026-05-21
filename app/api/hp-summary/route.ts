import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, verifyHpCookie } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit: 20 calls per 5 mins per IP
  const ip = getClientId(req);
  const rl = rateLimit(`hp-summary:${ip}`, { max: 20, windowMs: 5 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please wait.' }, { status: 429 });
  }

  // Accept either valid HP session cookie OR valid Supabase auth
  const hpOk = verifyHpCookie(req);
  let authed = hpOk;

  if (!authed) {
    const result = await authenticateRequest(req);
    authed = result.ok;
  }

  if (!authed) {
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
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}
