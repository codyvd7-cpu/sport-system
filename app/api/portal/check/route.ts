import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get('portal_access')?.value;
  if (!cookie) return NextResponse.json({ ok: false });

  const secret = process.env.HP_SESSION_SECRET;
  if (!secret) return NextResponse.json({ ok: false });

  try {
    const [payload, sig] = cookie.split('.');
    if (!payload || !sig) return NextResponse.json({ ok: false });

    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expected) return NextResponse.json({ ok: false });

    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (!decoded.exp || decoded.exp < Date.now()) return NextResponse.json({ ok: false });

    return NextResponse.json({ ok: true, sport: decoded.sport });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
