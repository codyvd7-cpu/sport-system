import { NextRequest } from 'next/server';
import { getAdmin } from './supabaseAdmin';

// ─── THE player JWT verifier ────────────────────────────────────────────────────
// One implementation of "who is this player?" for every player-app API route.
// Replaces three copy-pasted Bearer-parsing helpers with three error shapes.
//
//   const player = await verifyPlayer(req);
//   if (!player) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//
// `requireAthleteId` additionally resolves the linked athlete (the common
// precondition for photo upload, gym check-in, etc).

export interface PlayerIdentity {
  userId: string;
  email: string | null;
}

export async function verifyPlayer(req: NextRequest): Promise<PlayerIdentity | null> {
  const header = req.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { userId: data.user.id, email: data.user.email ?? null };
}

export async function requireAthleteId(userId: string): Promise<string | null> {
  const { data } = await getAdmin()
    .from('player_profiles').select('athlete_id').eq('user_id', userId).maybeSingle();
  return data?.athlete_id || null;
}
