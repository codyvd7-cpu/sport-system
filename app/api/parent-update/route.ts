import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getSchoolBranding } from '@/lib/schoolBranding';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { MODEL_QUICK, AI_GUARDRAILS } from '@/lib/aiModels';


export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: 'API key not configured.' });

  // Verify authenticated session
  // Rate limit
  const ip = getClientId(req);
  const rl = await rateLimit('app/api/parent-update/route.ts:'+ip, { max: 30, windowMs: 5 * 60_000 });
  if (!rl.ok) return NextResponse.json({ text: 'Rate limit exceeded.' }, { status: 429 });

  // Authenticate
  const auth = await authenticateRequest(req);
  if (!auth.ok) return NextResponse.json({ text: 'Unauthorised' }, { status: 401 });

  // School name comes from the acting staff member's school, not hardcoded —
  // otherwise every school's AI reports would be branded as School 1.
  const branding = await getSchoolBranding(await resolveStaffSchoolId(auth.email));

  try {
    const { data } = await req.json();
    const schoolId = await resolveStaffSchoolId(auth.email);

    // ── Pull what the app already knows ──────────────────────────────────
    // This tool used to require the coach to TYPE OUT fixtures, results and
    // availability by hand — all of which are already in the database. That
    // made it slower than writing the message yourself, which is presumably
    // why it went unused. The coach should only have to supply the things
    // the app genuinely can't know.
    const db = getAdmin();
    const today = new Date().toISOString().slice(0, 10);
    const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const weekBack  = new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10);

    let autoFixtures = '', autoResults = '', autoAvailability = '';
    if (schoolId && data.team) {
      const [fxR, resR, athR] = await Promise.all([
        db.from('portal_fixtures')
          .select('opponent,fixture_date,fixture_time,venue,home_away')
          .eq('school_id', schoolId).eq('team', data.team)
          .gte('fixture_date', today).lte('fixture_date', weekAhead)
          .order('fixture_date').limit(5),
        db.from('portal_results')
          .select('opponent,final_score,result_date')
          .eq('school_id', schoolId).eq('team', data.team)
          .gte('result_date', weekBack).order('result_date', { ascending: false }).limit(4),
        db.from('athletes')
          .select('availability')
          .eq('school_id', schoolId).eq('team', data.team).eq('is_active', true),
      ]);

      autoFixtures = (fxR.data || []).map(f =>
        `${f.opponent} on ${new Date(f.fixture_date).toLocaleDateString('en-ZA',{weekday:'long',day:'numeric',month:'long'})}` +
        `${f.fixture_time ? ` at ${String(f.fixture_time).slice(0,5)}` : ''}` +
        `${f.venue ? `, ${f.venue}` : ''}${f.home_away ? ` (${f.home_away})` : ''}`
      ).join('; ');

      autoResults = (resR.data || []).map(r => `${r.final_score} vs ${r.opponent}`).join('; ');

      const unavailable = (athR.data || []).filter(a => a.availability && a.availability !== 'Available').length;
      if (unavailable > 0) {
        // A count only — never names. A group message to all parents must not
        // identify which children are injured.
        autoAvailability = `${unavailable} player${unavailable > 1 ? 's' : ''} currently unavailable or on modified training`;
      }
    }

    const prompt = `You are a professional sport department administrator at ${branding.name}.
Write a professional, warm parent update message for WhatsApp or email.

Team: ${data.team}
Week focus: ${data.focus || 'General training and development'}
Upcoming fixtures: ${autoFixtures || data.fixtures || 'None this week'}
Recent results: ${autoResults || data.results || 'No recent results'}
Squad availability: ${autoAvailability || 'Full squad available'}
Testing this week: ${data.testing || 'No testing scheduled'}
Key announcements: ${data.announcements || 'None'}
Tone: ${data.tone || 'Professional and encouraging'}

IMPORTANT: Do not invent fixtures, results, scores or dates. Use only what is
given above. If a section says none, simply omit it rather than inventing
content. Never name an individual player as injured or unavailable.

Write a message that:
- Opens with a warm greeting
- Updates parents on the week's activities
- Mentions any upcoming fixtures or important dates
- Highlights positive developments
- Ends with a motivating close
- Feels personal, not like a template
- Is 150-200 words maximum
- Ready to send directly on WhatsApp
${AI_GUARDRAILS}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL_QUICK, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    });

    const d = await response.json();
    return NextResponse.json({ text: d.choices?.[0]?.message?.content || 'Could not generate message.' });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
