import { NextRequest, NextResponse } from 'next/server';
import { getSchoolContext } from '@/lib/hpRepository';
import { verifyHpCookie } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { MODEL_QUICK, AI_GUARDRAILS } from '@/lib/aiModels';

export async function POST(req: NextRequest) {
  if (!verifyHpCookie(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Every other AI route is rate-limited; this one wasn't, so a valid HP
  // session could fire OpenAI calls in a loop and run up the bill (AP-32).
  const rl = rateLimit(`hp-ai-report:${getClientId(req)}`, { max: 20, windowMs: 5 * 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Too many reports — wait a few minutes.' }, { status: 429 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY not set in Vercel environment variables.' }, { status: 500 });

  const { classId, grade, tests, students, avgs } = await req.json();
  // Cap the client-supplied arrays before they become prompt tokens — a huge
  // payload would otherwise inflate the OpenAI call arbitrarily (AP-32).
  if (!Array.isArray(tests) || !Array.isArray(students) || tests.length > 40 || students.length > 300) {
    return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
  }
  const safeAvgs = Array.isArray(avgs) ? avgs : [];

  const testLines = tests.map((t: any) => {
    const a = safeAvgs.find((x: any) => x.key === t.key);
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

  const school = getSchoolContext();
  const prompt = `You are a sports science analyst for the High Performance programme at ${school.name}, ${school.location}.

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

Keep it concise, data-driven and practical. Plain text only, no bullet symbols or markdown.
${AI_GUARDRAILS}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL_QUICK,
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
