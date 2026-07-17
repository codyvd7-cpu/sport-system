import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { rateLimit, getClientId } from '@/lib/rateLimit';
import { GRADE8_TESTS, GRADE9_TESTS, getTier, type TestKey } from '@/lib/hpTests';
import { cohortStats, termSeries, classifyChange, percentileRank } from '@/lib/hpAnalytics';

// ─── /api/player/me ─────────────────────────────────────────────────────────────
// The single data layer for the authed player/parent portal. The profile page
// previously queried athletes/attendance/hp_test_results directly from the
// browser — blocked by staff-only RLS, so linked players saw empty tabs.
// This route verifies the player's Supabase JWT, then fetches with the service
// role and returns ONLY player-safe fields.
//
// Actions:
//   get          → full profile payload
//   match        → athlete name search for setup linking (safe fields only)
//   save_profile → create/update the player_profiles row
//   link         → set athlete_id (+ auto-link hp_student_id on exact name match)

const ATHLETE_FIELDS = 'id,full_name,team,sport,age_group,position,availability,photo_url';

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

async function verifyUser(req: NextRequest, db: SupabaseClient) {
  const auth = req.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function POST(req: NextRequest) {
  const ip = getClientId(req);
  const rl = rateLimit(`player-me:${ip}`, { max: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
  }
  const db = admin();
  const user = await verifyUser(req, db);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, any> = {};
  try { body = await req.json(); } catch {}
  const action = body.action || 'get';

  try {
    // ── MATCH: athlete name search for linking ─────────────────────────────────
    if (action === 'match') {
      const name = String(body.name || '').trim();
      if (name.length < 3) return NextResponse.json({ matches: [] });
      const surname = name.split(' ').pop() || name;
      const { data } = await db.from('athletes')
        .select('id,full_name,team,sport')
        .or(`full_name.ilike.%${name}%,full_name.ilike.%${surname}%`)
        .limit(8);
      return NextResponse.json({ matches: data || [] });
    }

    // ── SAVE PROFILE ───────────────────────────────────────────────────────────
    if (action === 'save_profile') {
      const row = {
        user_id: user.id,
        email: user.email,
        full_name: String(body.full_name || '').trim(),
        grade: String(body.grade || '').trim() || null,
        sports: Array.isArray(body.sports) ? body.sports : [],
      };
      if (!row.full_name) return NextResponse.json({ error: 'Name required.' }, { status: 400 });
      const { error } = await db.from('player_profiles').upsert(row, { onConflict: 'user_id' });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    // ── LINK: connect this account to an athlete record ────────────────────────
    if (action === 'link') {
      const athleteId = String(body.athlete_id || '');
      let hpStudentId: string | null = null;
      if (athleteId) {
        const { data: ath } = await db.from('athletes').select('id,full_name').eq('id', athleteId).maybeSingle();
        if (!ath) return NextResponse.json({ error: 'Athlete not found.' }, { status: 404 });
        // Auto-link the HP record when exactly one active student shares the name
        const { data: hpMatches } = await db.from('hp_students')
          .select('id').eq('active', true).ilike('full_name', ath.full_name.trim());
        if (hpMatches?.length === 1) hpStudentId = hpMatches[0].id;
      }
      const { error } = await db.from('player_profiles')
        .update({ athlete_id: athleteId || null, ...(hpStudentId ? { hp_student_id: hpStudentId } : {}) })
        .eq('user_id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, hp_linked: !!hpStudentId });
    }

    // ── GET: the full portal payload ───────────────────────────────────────────
    const { data: profile } = await db.from('player_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (!profile) return NextResponse.json({ profile: null });

    const sports: string[] = (profile.sports || []).map((s: string) => s.toLowerCase());
    const prim = sports[0] || 'hockey';
    const today = new Date().toISOString().split('T')[0];
    const year = new Date().getFullYear();

    const [fxR, resR, remR, planR, progR] = await Promise.all([
      db.from('portal_fixtures').select('*').eq('sport', prim).eq('is_published', true).gte('fixture_date', today).order('fixture_date').order('fixture_time').limit(25),
      db.from('portal_results').select('*').eq('sport', prim).eq('is_published', true).order('result_date', { ascending: false }).limit(20),
      db.from('portal_reminders').select('*').eq('sport', prim).eq('is_published', true).order('created_at', { ascending: false }).limit(15),
      db.from('portal_week_plans').select('id').eq('sport', prim).eq('published', true).order('created_at', { ascending: false }).limit(1),
      db.from('portal_programs').select('id,title,category,day_label,details,file_name,file_url').eq('sport', prim).eq('is_published', true).order('sort_order').limit(20),
    ]);
    let weekItems: any[] = [];
    if (planR.data?.length) {
      const { data: items } = await db.from('portal_week_plan_items').select('*').eq('week_plan_id', planR.data[0].id).order('sort_order');
      weekItems = items || [];
    }

    // Athlete-linked data
    let athlete: any = null, attendance: any[] = [], perfTests: any[] = [], feedback: any = null, coachName: string | null = null;
    let gymCheckins: any[] = [];
    if (profile.athlete_id) {
      const [aR, attR, pR, fbR, coachR, gymR] = await Promise.all([
        db.from('athletes').select(ATHLETE_FIELDS).eq('id', profile.athlete_id).maybeSingle(),
        db.from('attendance').select('id,status,session_date,session_type').eq('athlete_id', profile.athlete_id).order('session_date', { ascending: false }).limit(200),
        db.from('performance_tests').select('id,test_type,value,unit,test_date').eq('athlete_id', profile.athlete_id).order('test_date', { ascending: false }).limit(100),
        db.from('coach_notes').select('strengths,current_focus,coach_comment,created_at').eq('athlete_id', profile.athlete_id).eq('is_feedback', true).order('created_at', { ascending: false }).limit(3),
        db.from('staff_roles').select('full_name,email,teams').eq('role', 'coach').eq('is_active', true),
        db.from('gym_checkins').select('id,checkin_date,checkin_time,venue').eq('athlete_id', profile.athlete_id).order('checkin_date', { ascending: false }).limit(180),
      ]);
      athlete = aR.data;
      attendance = attR.data || [];
      perfTests = pR.data || [];
      feedback = fbR.data || [];
      gymCheckins = gymR.data || [];
      if (athlete) {
        const teamCoach = (coachR.data || []).find((c: any) => Array.isArray(c.teams) && c.teams.includes(athlete.team));
        coachName = teamCoach ? (teamCoach.full_name || teamCoach.email?.split('@')[0]?.replace(/[._]/g, ' ')) : null;
      }
    }

    // HP testing + server-computed cohort insights (percentile/SWC are aggregate
    // stats — safe to share; no other student's individual data leaves the server)
    let hpTests: any[] = [];
    let hpInsights: Record<string, any> = {};
    let hpStudent: any = null;
    if (profile.hp_student_id) {
      const { data: stu } = await db.from('hp_students').select('id,full_name,grade,class_group,training_group').eq('id', profile.hp_student_id).maybeSingle();
      hpStudent = stu;
      if (stu) {
        const tests = stu.grade === 'Grade 9' ? GRADE9_TESTS : GRADE8_TESTS;
        const [{ data: own }, { data: cohortStudents }] = await Promise.all([
          db.from('hp_test_results').select('*').eq('student_id', stu.id),
          db.from('hp_students').select('id').eq('grade', stu.grade).eq('active', true),
        ]);
        hpTests = own || [];
        const cohortIds = (cohortStudents || []).map(s => s.id);
        const { data: cohortResults } = await db.from('hp_test_results')
          .select('*').eq('year', year).in('student_id', cohortIds.slice(0, 400));
        const cohortRows = (cohortStudents || []) as any[];
        const stats = cohortStats(cohortRows, cohortResults || [], tests, year);
        tests.forEach(t => {
          const ser = termSeries(hpTests, stu.id, t.key, year);
          const latest = ser.length ? ser[ser.length - 1].val : null;
          const prev = ser.length > 1 ? ser[ser.length - 2].val : null;
          const st = stats[t.key];
          hpInsights[t.key] = {
            latest, prev,
            tier: latest !== null ? getTier(t.key as TestKey, latest, t.lower).label : null,
            percentile: latest !== null ? percentileRank(st.values, latest, t.lower) : null,
            change: latest !== null && prev !== null ? classifyChange(prev, latest, st.swc, t.lower) : null,
            cohortTested: st.values.length,
          };
        });
      }
    }

    return NextResponse.json({
      profile, athlete, hpStudent,
      attendance, perfTests, feedback, coachName,
      hpTests, hpInsights,
      gymCheckins,
      fixtures: fxR.data || [], results: resR.data || [],
      reminders: remR.data || [], weekItems,
      programs: progR.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
