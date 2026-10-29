import { NextRequest, NextResponse } from 'next/server';
import { requireHpSchoolId } from '@/lib/serverAuth';
import { getHpAdmin, getTestResults, saveTestResult } from '@/lib/hpRepository';

export async function GET(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const db   = getHpAdmin();
    const opts = {
      term:      searchParams.get('term')  || undefined,
      year:      searchParams.get('year')  ? Number(searchParams.get('year')) : undefined,
      studentId: searchParams.get('studentId') || undefined,
    };
    const results = await getTestResults(db, { ...opts, schoolId });
    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const schoolId = requireHpSchoolId(req);
  if (!schoolId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { action, payload } = await req.json();
    if (action === 'upsert') {
      await saveTestResult(getHpAdmin(), payload, 'hp-coach', schoolId);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
