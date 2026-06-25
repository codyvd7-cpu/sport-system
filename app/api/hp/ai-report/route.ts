import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set in Vercel environment variables.' }, { status: 500 });

  const { classId, grade, tests, students, avgs } = await req.json();

  const testLines = tests.map((t: any) => {
    const a = avgs.find((x: any) => x.key === t.key);
    if (!a?.avg) return `- ${t.label}: no data`;
    return `- ${t.label}: class avg ${Number(a.avg).toFixed(2)}${t.unit} (${a.count}/${students.length} tested) — tier: ${a.tier}`;
  }).join('\n');

  const studentLines = students.slice(0, 30).map((s: any) => {
    if (!s.result) return `  • ${s.surname}: untested`;
    const scores = tests.map((t: any) => {
      const v = s.result[t.key];
      return v ? `${t.label}: ${v}${t.unit}` : null;
    }).filter(Boolean).join(', ');
    return `  • ${s.surname} (G${s.training_group || '?'}): ${scores}`;
  }).join('\n');

  const prompt = `You are a sports science analyst for the High Performance programme at St Benedict's College, Bedfordview, South Africa.

Analyse this fitness testing data for class ${classId} (${grade}) and write a concise coaching report.

CLASS TEST AVERAGES:
${testLines}

INDIVIDUAL RESULTS:
${studentLines}

Write a professional coaching report with exactly these 5 sections, each heading on its own line in CAPITALS:

OVERALL ASSESSMENT
STRENGTHS
AREAS FOR DEVELOPMENT
INDIVIDUAL HIGHLIGHTS
TRAINING RECOMMENDATIONS

Keep it concise, data-driven and practical. Plain text only, no bullet symbols or markdown.`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 900,
        messages: [
          { role: 'system', content: 'You are a sports science analyst writing concise, data-driven coaching reports.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      return NextResponse.json({ error: `OpenAI error: ${errMsg}` }, { status: 500 });
    }

    const text = data.choices?.[0]?.message?.content || '';
    if (!text) return NextResponse.json({ error: 'OpenAI returned empty response.' }, { status: 500 });

    return NextResponse.json({ report: text });
  } catch (e: any) {
    return NextResponse.json({ error: `Network error: ${e.message}` }, { status: 500 });
  }
}
