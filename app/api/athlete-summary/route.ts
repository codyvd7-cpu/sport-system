import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/serverAuth';
import { rateLimit, getClientId } from '@/lib/rateLimit';


export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: 'API key not configured.' });

  // Verify authenticated session
  // Rate limit
  const ip = getClientId(req);
  const rl = rateLimit('app/api/athlete-summary/route.ts:'+ip, { max: 30, windowMs: 5 * 60_000 });
  if (!rl.ok) return NextResponse.json({ text: 'Rate limit exceeded.' }, { status: 429 });

  // Authenticate
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ text: 'Unauthorised' }, { status: 401 });

  try {
    const { athlete } = await req.json();

    const prompt = `You are a high-performance hockey coach analyst at St Benedict's College, Johannesburg. 
Write a professional, concise athlete summary (3-4 sentences) for a coach or parent.

Athlete data:
- Name: ${athlete.name}
- Team: ${athlete.team}
- Age Group: ${athlete.ageGroup}
- Position: ${athlete.position || 'Not specified'}
- Availability: ${athlete.availability}
- Attendance Rate: ${athlete.attendanceRate !== null ? athlete.attendanceRate + '%' : 'No data yet'}
- Sessions Attended: ${athlete.totalSessions}
- Absences: ${athlete.absences}
- Personal Bests: ${athlete.pbs.length > 0 ? athlete.pbs.map((p: any) => `${p.testType}: ${p.pb}${p.unit}`).join(', ') : 'No testing data yet'}
- Benchmark Tiers: ${athlete.tiers.length > 0 ? athlete.tiers.map((t: any) => `${t.test}: ${t.tier}`).join(', ') : 'No benchmark data yet'}

Write a summary that:
- Highlights strengths positively
- Notes areas for development constructively
- Mentions attendance commitment
- References specific test results where available
- Is professional enough to share with parents
- Does NOT make injury predictions or medical claims
- Ends with one forward-looking sentence about development focus`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Could not generate summary.';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
