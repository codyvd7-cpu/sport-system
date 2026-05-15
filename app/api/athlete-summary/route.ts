import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  try {
    const authHeader = req.headers.get('authorization');
    const cookieHeader = req.headers.get('cookie') || '';
    
    // Check for Supabase session cookie
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    // Extract access token from cookie
    const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (!tokenMatch) return false;
    
    const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]));
    const accessToken = tokenData?.access_token;
    if (!accessToken) return false;
    
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    return !!user;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: 'API key not configured.' });

  // Verify authenticated session
  const authed = await isAuthenticated(req);
  if (!authed) return NextResponse.json({ text: 'Unauthorized' }, { status: 401 });

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
