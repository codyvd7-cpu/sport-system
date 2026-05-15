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
    const { data } = await req.json();

    const prompt = `You are a professional hockey department administrator at St Benedict's College, Johannesburg.
Write a professional, warm parent update message for WhatsApp or email.

Team: ${data.team}
Week focus: ${data.focus || 'General training and development'}
Upcoming fixtures: ${data.fixtures || 'None this week'}
Recent results: ${data.results || 'No recent results'}
Testing this week: ${data.testing || 'No testing scheduled'}
Key announcements: ${data.announcements || 'None'}
Tone: ${data.tone || 'Professional and encouraging'}

Write a message that:
- Opens with a warm greeting
- Updates parents on the week's activities
- Mentions any upcoming fixtures or important dates
- Highlights positive developments
- Ends with a motivating close
- Feels personal, not like a template
- Is 150-200 words maximum
- Ready to send directly on WhatsApp`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    });

    const d = await response.json();
    return NextResponse.json({ text: d.choices?.[0]?.message?.content || 'Could not generate message.' });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
