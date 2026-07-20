import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── THE service-role client ────────────────────────────────────────────────────
// Single source for privileged Supabase access in API routes. Replaces 20+
// inline createClient() calls, each with its own env handling.
//
//   import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';
//   if (!adminConfigured()) return NextResponse.json({ error: 'Server misconfigured.' }, { status: 500 });
//   const db = getAdmin();
//
// Memoized per lambda instance — safe to call per-request.

let cached: SupabaseClient | null = null;

export function adminConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getAdmin(): SupabaseClient {
  if (!cached) {
    cached = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return cached;
}
