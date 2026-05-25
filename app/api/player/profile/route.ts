import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`player-profile:${ip}`, { max: 20, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Code required.' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: athlete, error } = await supabase
    .from('athletes')
    .select('*')
    .eq('player_code', code.trim().toUpperCase())
    .maybeSingle();

  if (error || !athlete) return NextResponse.json({ error: 'Player not found.' }, { status: 404 });

  const [attRes, perfRes, notesRes, coachRes, fixRes, resRes] = await Promise.all([
    supabase.from('attendance').select('*').eq('athlete_id', athlete.id).order('session_date', { ascending: false }),
    supabase.from('performance_tests').select('*').eq('athlete_id', athlete.id).order('test_date', { ascending: false }),
    supabase.from('coach_notes').select('*').eq('athlete_id', athlete.id).eq('is_feedback', true).order('created_at', { ascending: false }).limit(1),
    supabase.from('staff_roles').select('full_name,email,teams').eq('role', 'coach').eq('is_active', true),
    supabase.from('portal_fixtures').select('*').eq('team', athlete.team).gte('fixture_date', new Date().toISOString().split('T')[0]).order('fixture_date').limit(1),
    supabase.from('portal_results').select('*').eq('team', athlete.team).order('result_date', { ascending: false }).limit(5),
  ]);

  const teamCoach = (coachRes.data || []).find((c: any) =>
    Array.isArray(c.teams) && c.teams.includes(athlete.team)
  );
  const coachName = teamCoach
    ? (teamCoach.full_name || teamCoach.email.split('@')[0].replace(/[._]/g, ' '))
    : null;

  return NextResponse.json({
    athlete,
    attendance: attRes.data || [],
    performance: perfRes.data || [],
    feedback: notesRes.data?.[0] || null,
    coachName,
    nextFixture: fixRes.data?.[0] || null,
    recentResults: resRes.data || [],
  });
}
