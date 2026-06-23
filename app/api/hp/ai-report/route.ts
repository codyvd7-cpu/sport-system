import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { classId, grade, tests, students, avgs } = await req.json();

  const testLines = tests.map((t: any) => {
    const a = avgs.find((x: any) => x.key === t.key);
    if (!a?.avg) return `- ${t.label}: no data`;
    return `- ${t.label}: class avg ${a.avg.toFixed(2)}${t.unit} (${a.count}/${students.length} tested) — tier: ${a.tier}`;
  }).join('\n');

  const studentLines = students.map((s: any) => {
    if (!s.result) return `  • ${s.surname}: untested`;
    const scores = tests.map((t: any) => {
      const v = s.result[t.key];
      return v ? `${t.label}: ${v}${t.unit}` : null;
    }).filter(Boolean).join(', ');
    return `  • ${s.surname} (G${s.training_group||'?'}): ${scores}`;
  }).join('\n');

  const prompt = `You are a sports science analyst for a school High Performance programme at St Benedict's College, Bedfordview, South Africa.

Analyse the following fitness testing data for class ${classId} (${grade}) and produce a concise coaching report.

CLASS AVERAGES:
${testLines}

INDIVIDUAL RESULTS:
${studentLines}

Write a professional coaching report with these sections:
1. OVERALL ASSESSMENT (2-3 sentences on general class fitness level)
2. STRENGTHS (what the class does well, be specific with metrics)
3. AREAS FOR DEVELOPMENT (weakest fitness components, be specific)
4. INDIVIDUAL HIGHLIGHTS (2-3 standout performers and 2-3 who need most support)
5. TRAINING RECOMMENDATIONS (3-4 specific, actionable recommendations for the coach)

Keep it concise, data-driven, and practical. Use plain text, no markdown symbols. Each section heading should be on its own line in CAPITALS.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    return NextResponse.json({ report: text });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
