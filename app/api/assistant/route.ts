import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, system } = await req.json();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        system,
        messages,
      }),
    });

    const data = await response.json();
    const text = data.content?.map((c: any) => c.text || '').join('') || 'No response.';
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ text: 'Connection error. Please try again.' }, { status: 500 });
  }
}
