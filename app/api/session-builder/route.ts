import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: 'API key not configured.' });

  try {
    const { data } = await req.json();

    const prompt = `You are an elite hockey S&C coach and performance specialist at St Benedict's College, Johannesburg.
Design a complete training session plan.

Team/Age Group: ${data.team}
Duration: ${data.duration} minutes
Session Focus: ${data.focus}
Phase of Season: ${data.phase || 'Mid-season'}
Equipment Available: ${data.equipment || 'Cones, balls, sticks, open field'}
Player Level: ${data.level || 'School level competitive'}
Special Considerations: ${data.notes || 'None'}

Write a complete session plan with:
1. WARM-UP (time, activities, coaching points)
2. ACTIVATION (speed/movement prep)
3. MAIN BLOCK (key drills with sets/reps/distances)
4. CONDITIONING (fitness component)
5. COOL-DOWN & REFLECTION
6. COACHING POINTS (2-3 key focus areas for the session)
7. PROGRESSIONS/REGRESSIONS (how to make it harder or easier)

Be specific with times, distances, and numbers. Make it practical and ready to run.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });

    const d = await response.json();
    return NextResponse.json({ text: d.choices?.[0]?.message?.content || 'Could not generate session.' });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
