import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

// Only player-facing fields — never expose internal metadata
const ATHLETE_FIELDS = 'id,full_name,team,age_group,position,availability,photo_url,player_code';

export async function GET(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`player-profile:${ip}`, { max: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Code required.' }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { data: athlete, error } = await supabase
    .from('athletes')
    .select(ATHLETE_FIELDS)
    .eq('player_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error || !athlete) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });

  const [attRes, perfRes, notesRes, coachRes, fixRes, resRes] = await Promise.all([
    supabase.from('attendance').select('id,status,session_date,session_type').eq('athlete_id', athlete.id).order('session_date', { ascending: false }).limit(50),
    supabase.from('performance_tests').select('id,test_type,value,unit,test_date').eq('athlete_id', athlete.id).order('test_date', { ascending: false }).limit(100),
    // Only fetch parent-visible feedback, not internal coach notes
    supabase.from('coach_notes').select('strengths,current_focus,coach_comment').eq('athlete_id', athlete.id).eq('is_feedback', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('staff_roles').select('full_name,email,teams').eq('role', 'coach').eq('is_active', true),
    supabase.from('portal_fixtures').select('opponent,fixture_date,fixture_time,venue').eq('team', athlete.team).gte('fixture_date', new Date().toISOString().split('T')[0]).order('fixture_date').limit(1),
    supabase.from('portal_results').select('opponent,final_score,result_date,goal_scorers').eq('team', athlete.team).order('result_date', { ascending: false }).limit(5),
  ]);

  const teamCoach = (coachRes.data || []).find((c: any) =>
    Array.isArray(c.teams) && c.teams.includes(athlete.team)
  );
  const coachName = teamCoach
    ? (teamCoach.full_name || teamCoach.email.split('@')[0].replace(/[._]/g, ' '))
    : null;

  return NextResponse.json({
    athlete,
    attendance:    attRes.data  || [],
    performance:   perfRes.data || [],
    feedback:      notesRes.data?.[0] || null,
    coachName,
    nextFixture:   fixRes.data?.[0]   || null,
    recentResults: resRes.data        || [],
  });
}
