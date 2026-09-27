import { NextRequest, NextResponse } from 'next/server';
import { getAdmin } from '@/lib/supabaseAdmin';
import { authenticateRequest, resolveStaffSchoolId } from '@/lib/serverAuth';
import { getSchoolBranding } from '@/lib/schoolBranding';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { MODEL_REASONING, AI_GUARDRAILS } from '@/lib/aiModels';


export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ text: 'API key not configured.' });

  // Verify authenticated session
  // Rate limit
  const ip = getClientId(req);
  const rl = await rateLimit('app/api/session-builder/route.ts:'+ip, { max: 30, windowMs: 5 * 60_000 });
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

    // ── Real squad context ───────────────────────────────────────────────
    // The coach previously typed things like "3 players on modified" by
    // hand. The app already knows squad size, who is unavailable, and what
    // is coming up — a session two days before a match should look different
    // to one in a quiet week, and only the app can know which this is.
    const db = getAdmin();
    let squadContext = '', fixtureContext = '';
    if (schoolId && data.team) {
      const today = new Date().toISOString().slice(0, 10);
      const [athR, fxR] = await Promise.all([
        db.from('athletes').select('availability')
          .eq('school_id', schoolId).eq('team', data.team).eq('is_active', true),
        db.from('portal_fixtures').select('opponent,fixture_date')
          .eq('school_id', schoolId).eq('team', data.team)
          .gte('fixture_date', today).order('fixture_date').limit(1),
      ]);

      const squad = athR.data || [];
      const modified = squad.filter(a => a.availability === 'Modified').length;
      const out = squad.filter(a => a.availability === 'Injured').length;
      squadContext = `${squad.length} players in the squad`
        + (modified ? `, ${modified} on modified training` : '')
        + (out ? `, ${out} unavailable` : '');

      const nextFx = (fxR.data || [])[0];
      if (nextFx) {
        const days = Math.round((new Date(nextFx.fixture_date).getTime() - Date.now()) / 86400000);
        fixtureContext = days <= 0 ? 'Match is today'
          : days === 1 ? `Match TOMORROW vs ${nextFx.opponent} — this should be a light activation session, not a hard load`
          : days <= 3 ? `Match in ${days} days vs ${nextFx.opponent} — moderate the volume accordingly`
          : `Next match in ${days} days vs ${nextFx.opponent}`;
      }
    }

    const prompt = `You are an experienced school sport S&C coach at ${branding.name}.
Design a complete training session plan.

Team/Age Group: ${data.team}
Duration: ${data.duration} minutes
Session Focus: ${data.focus}
Phase of Season: ${data.phase || 'Mid-season'}
Squad: ${squadContext || 'Squad size not specified'}
Match context: ${fixtureContext || 'No fixture scheduled soon'}
Equipment Available: ${data.equipment || 'Cones, balls, sticks, open field'}
Player Level: ${data.level || 'School level competitive'}
Special Considerations: ${data.notes || 'None'}

IMPORTANT: Adjust the load to the match context above — do not prescribe a
heavy session the day before a fixture. If players are on modified training,
include a regression for them rather than ignoring it. These are school-age
athletes, so keep volumes and intensities age-appropriate.

Write a complete session plan with:
1. WARM-UP (time, activities, coaching points)
2. ACTIVATION (speed/movement prep)
3. MAIN BLOCK (key drills with sets/reps/distances)
4. CONDITIONING (fitness component)
5. COOL-DOWN & REFLECTION
6. COACHING POINTS (2-3 key focus areas for the session)
7. PROGRESSIONS/REGRESSIONS (how to make it harder or easier)

Be specific with times, distances, and numbers. Make it practical and ready to run.
${AI_GUARDRAILS}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL_REASONING, max_tokens: 1000, messages: [{ role: 'user', content: prompt }] }),
    });

    const d = await response.json();
    return NextResponse.json({ text: d.choices?.[0]?.message?.content || 'Could not generate session.' });
  } catch (e: any) {
    return NextResponse.json({ text: `Error: ${e.message}` });
  }
}
