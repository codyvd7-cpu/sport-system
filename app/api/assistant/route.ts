import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, system } = await req.json();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
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

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'No response.';
    return NextResponse.json({ text });
  } catch (e) {
    return NextResponse.json({ text: 'Connection error. Please try again.' }, { status: 500 });
  }
}