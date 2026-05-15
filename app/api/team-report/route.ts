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
    const { team } = await req.json();

    const prompt = `You are a high-performance hockey coach analyst at St Benedict's College, Johannesburg.
Write a professional weekly team report for the coaching staff. Be specific, use real names and numbers.

Team: ${team.name}
Squad Size: ${team.playerCount} players
Season: 2026

AVAILABILITY:
- Available: ${team.available} players
- Injured: ${team.injured} players  
- Modified: ${team.modified} players
${team.injuredNames.length > 0 ? `- Injured players: ${team.injuredNames.join(', ')}` : ''}
${team.modifiedNames.length > 0 ? `- Modified players: ${team.modifiedNames.join(', ')}` : ''}

ATTENDANCE (last 30 days):
- Team average: ${team.attendanceRate !== null ? team.attendanceRate + '%' : 'No data yet'}
- Players below 70%: ${team.lowAttendance.length > 0 ? team.lowAttendance.map((p: any) => `${p.name} (${p.rate}%)`).join(', ') : 'None'}
- Top attendees: ${team.topAttendance.length > 0 ? team.topAttendance.map((p: any) => `${p.name} (${p.rate}%)`).join(', ') : 'No data yet'}

PERFORMANCE TESTING:
${team.testAverages.length > 0 ? team.testAverages.map((t: any) => `- ${t.test}: Team average ${t.avg}${t.unit}`).join('\n') : '- No testing data yet'}

TOP PERFORMERS:
${team.topPerformers.length > 0 ? team.topPerformers.map((p: any) => `- ${p.name}: ${p.highlights}`).join('\n') : '- No performance data yet'}

Write a report with these sections:
1. SQUAD STATUS - overall health and availability
2. ATTENDANCE SUMMARY - commitment levels, flag concerns
3. PERFORMANCE OVERVIEW - testing results and benchmarks
4. PLAYERS REQUIRING ATTENTION - specific names and reasons
5. RECOMMENDED FOCUS - what to prioritise this week

Keep it professional, specific and actionable. 3-5 sentences per section. Use actual names from the data.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || 'Could not generate report.';
    return NextResponse.json({ text });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
