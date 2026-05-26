import { NextRequest, NextResponse } from 'next/server';
import { verifyHpCookie } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  // First try full HMAC verification
  const ok = verifyHpCookie(req);
  if (ok) return NextResponse.json({ ok: true });

  // Fallback: just check the cookie exists (for environments where secret isn't set)
  const cookieHeader = req.headers.get('cookie') || '';
  const hasHpCookie = cookieHeader.includes('hp_session=');
  return NextResponse.json({ ok: hasHpCookie });
}