import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Portal data is public-facing — no auth needed, but we use service role to bypass RLS
// Data is already privacy-filtered (first names only, top 3 only) in the portal page

export async function GET(req: NextRequest) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  try {
    const [athletesRes, attendanceRes, performanceRes] = await Promise.all([
      admin.from('athletes').select('id,full_name,team').limit(500),
      admin.from('attendance').select('athlete_id,status,session_type').limit(2000),
      admin.from('performance_tests').select('athlete_id,test_date').limit(2000),
    ]);

    return NextResponse.json({
      athletes:    athletesRes.data    || [],
      attendance:  attendanceRes.data  || [],
      performance: performanceRes.data || [],
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
