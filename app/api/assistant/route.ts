import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  // Rate limit
  const ip = getClientId(req);
  const rl = rateLimit(`assistant:${ip}`, { max: 30, windowMs: 5 * 60_000 });
  if (!rl.ok) {
    return NextResponse.json({ text: 'Rate limit exceeded. Please wait.' }, { status: 429 });
  }

  // Authentication
  const auth = await authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ text: 'Unauthorised' }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ text: 'API key not configured.' }, { status: 500 });
  }

  try {
    const { messages, system } = await req.json();
    if (!Array.isArray(messages) || typeof system !== 'string' || system.length > 4000) {
      return NextResponse.json({ text: 'Invalid request.' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: system },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      return NextResponse.json({ text: `OpenAI error: ${err.error?.message || response.status}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response.';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ text: 'Server error.' }, { status: 500 });
  }
}
