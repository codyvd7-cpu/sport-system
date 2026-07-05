import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type StaffRole = 'owner' | 'head_of_hockey' | 'coach' | 'viewer';

export type ServerAuthResult = {
  ok: boolean;
  userId?: string;
  email?: string;
  role?: StaffRole;
  reason?: string;
};

/**
 * Server-side authentication helper.
 * Validates Supabase JWT from either:
 *  - Authorization: Bearer <token> header (preferred)
 *  - sb-*-auth-token cookie (fallback)
 *
 * Then optionally checks staff_roles table for role-based access.
 */
export async function authenticateRequest(
  req: NextRequest,
  allowedRoles?: StaffRole[]
): Promise<ServerAuthResult> {
  // Try Authorization header first
  const authHeader = req.headers.get('authorization');
  let accessToken: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    accessToken = authHeader.slice(7);
  } else {
    // Fallback to cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/sb-[^-]+-auth-token=([^;]+)/);
    if (tokenMatch) {
      try {
        const raw = decodeURIComponent(tokenMatch[1]);
        const parsed = JSON.parse(raw);
        accessToken = Array.isArray(parsed) ? parsed[0] : parsed?.access_token;
      } catch {
        // fall through
      }
    }
  }

  if (!accessToken) {
    return { ok: false, reason: 'No authentication credentials provided.' };
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(accessToken);
  if (error || !user || !user.email) {
    return { ok: false, reason: 'Invalid or expired session.' };
  }

  const email = user.email.toLowerCase();

  // If no role check required, accept any valid Supabase user
  if (!allowedRoles || allowedRoles.length === 0) {
    return { ok: true, userId: user.id, email };
  }

  // Verify role in staff_roles table
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, is_active')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (!staffRole) {
    return { ok: false, userId: user.id, email, reason: 'No active staff role for this account.' };
  }

  const role = staffRole.role as StaffRole;
  if (!allowedRoles.includes(role)) {
    return { ok: false, userId: user.id, email, role, reason: 'Insufficient permissions.' };
  }

  return { ok: true, userId: user.id, email, role };
}

/**
 * Verifies HP access via the secure httpOnly cookie set by /api/hp/login.
 * Cookie value is a signed token tied to the server-side secret.
 */
export function verifyHpCookie(req: NextRequest): boolean {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/hp_session=([^;]+)/);
  if (!match) return false;

  const secret = process.env.HP_SESSION_SECRET;
  // If secret not configured, just check cookie exists with valid structure
  if (!secret) {
    try {
      const value = decodeURIComponent(match[1]);
      const [payload] = value.split('.');
      if (!payload) return false;
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
      return !decoded.exp || decoded.exp > Date.now();
    } catch { return false; }
  }

  try {
    const value = decodeURIComponent(match[1]);
    const [payload, sig] = value.split('.');
    if (!payload || !sig) return false;

    // Verify HMAC signature
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expected) return false;

    // Verify not expired
    const decoded = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (!decoded.exp || decoded.exp < Date.now()) return false;

    return true;
  } catch {
    return false;
  }
}
