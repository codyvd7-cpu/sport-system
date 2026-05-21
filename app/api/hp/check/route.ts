import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  const ok = verifyHpCookie(req);
  return NextResponse.json({ ok });
}
