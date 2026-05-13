import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ text: 'API key not configured. Please add OPENAI_API_KEY to Vercel environment variables.' });
  }

  try {
    const { messages, system } = await req.json();

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
      return NextResponse.json({ text: `OpenAI error: ${err.error?.message || response.status}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response.';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}