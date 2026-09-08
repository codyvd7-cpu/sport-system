import { NextRequest } from 'next/server';
import { getAdmin } from './supabaseAdmin';
import type { StaffRole } from './serverAuth';
import { authenticateRequest } from './serverAuth';

// ─── requireStaffContext ───────────────────────────────────────────────────────
// The single authorization check every privileged staff route should use.
//
// FINDING A10 (audit, ZIP 22): authenticateRequest(req) with no allowedRoles
// accepts ANY valid Supabase user — it does not check staff_roles at all.
// Most service-role routes in this app call it that way, then separately
// compare school_id on the target record. That means:
//   - a deactivated coach's account still works, because is_active is never
//     re-checked on the actual operation, only (sometimes) at login
//   - a viewer-level account can write, because role is never compared
//     against what the OPERATION requires, only whether a role exists at all
//   - team/sport scoping enforced in some UI is absent from the API entirely
//
// This resolver fixes that by returning one thing: a fully-verified staff
// identity — active, real school, real role, real assigned teams/sports — or
// null. Callers then check school ownership of the target record. There is
// no code path here that returns something usable without every one of those
// checks passing.
//
// This does not replace authenticateRequest; it wraps it and adds the parts
// that were being skipped.

export interface StaffContext {
  userId: string;
  email: string;
  role: StaffRole;
  schoolId: string;
  /** Teams this account is explicitly assigned to. Empty for roles that see
   *  the whole school (owner, head_of_sport, deputy_head_of_sport, mic). */
  teams: string[];
  sport: string | null;
  /** True for roles the app treats as "sees everything in the school". */
  isSchoolWide: boolean;
}

const SCHOOL_WIDE_ROLES: StaffRole[] = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic', 'head_of_hockey'];

/**
 * Resolves a fully-verified, currently-active staff identity from the
 * request. Returns null for anything short of that — no partial credit, no
 * "role exists but who cares if it's the right one".
 */
export async function requireStaffContext(req: NextRequest): Promise<StaffContext | null> {
  const auth = await authenticateRequest(req);
  if (!auth.ok || !auth.userId || !auth.email) return null;

  const db = getAdmin();
  const { data: staff } = await db
    .from('staff_roles')
    .select('role, school_id, teams, sport, is_active')
    .eq('email', auth.email)
    .maybeSingle();

  // No row, or the row says inactive: this is the exact gap A10 and A28
  // describe. A deactivated coach's Supabase session still authenticates
  // fine — is_active is a fact about their STAFF ROW, not their auth session,
  // and it has to be re-checked on every request, not just at login.
  if (!staff || staff.is_active !== true || !staff.school_id) return null;

  // A28: a deactivated SCHOOL must not continue to authorize its own staff,
  // even if every individual staff row still says active.
  const { data: school } = await db
    .from('schools')
    .select('is_active')
    .eq('id', staff.school_id)
    .maybeSingle();
  if (!school || school.is_active !== true) return null;

  const role = staff.role as StaffRole;
  return {
    userId: auth.userId,
    email: auth.email,
    role,
    schoolId: staff.school_id,
    teams: Array.isArray(staff.teams) ? staff.teams : [],
    sport: staff.sport ?? null,
    isSchoolWide: SCHOOL_WIDE_ROLES.includes(role),
  };
}

/** Convenience wrapper for routes that only need "any active staff, any role". */
export async function requireAnyStaff(req: NextRequest): Promise<StaffContext | null> {
  return requireStaffContext(req);
}

/**
 * Verifies a staff member may act on a specific team. School-wide roles pass
 * automatically; team-scoped roles must have that exact team assigned.
 *
 * This is what A10/A11/A12 describe as missing: "the API only compares
 * school" — team membership was checked in some UI code but never
 * independently re-verified server-side.
 */
export function canActOnTeam(ctx: StaffContext, team: string | null | undefined): boolean {
  if (ctx.isSchoolWide) return true;
  if (!team) return false;
  return ctx.teams.includes(team);
}

/**
 * Verifies an athlete record belongs to the caller's school AND, for
 * team-scoped staff, that the athlete's team is one they're assigned to.
 * Returns the athlete row (with its team) on success, or null.
 */
export async function requireOwnedAthlete(
  ctx: StaffContext,
  athleteId: string
): Promise<{ id: string; school_id: string; team: string | null } | null> {
  if (!athleteId) return null;
  const db = getAdmin();
  const { data: athlete } = await db
    .from('athletes')
    .select('id, school_id, team')
    .eq('id', athleteId)
    .maybeSingle();

  if (!athlete || athlete.school_id !== ctx.schoolId) return null;
  if (!canActOnTeam(ctx, athlete.team)) return null;
  return athlete;
}

/**
 * A minimal role-grant matrix for A26: which roles may grant which other
 * roles. Prevents a head_of_hockey (a legacy role) from minting an owner.
 */
const ROLE_GRANT_MATRIX: Record<StaffRole, StaffRole[]> = {
  owner: ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic', 'coach', 'viewer', 'head_of_hockey'],
  head_of_sport: ['deputy_head_of_sport', 'mic', 'coach', 'viewer'],
  deputy_head_of_sport: ['mic', 'coach', 'viewer'],
  head_of_hockey: ['coach', 'viewer'],
  mic: ['coach', 'viewer'],
  coach: [],
  viewer: [],
};

export function canGrantRole(grantorRole: StaffRole, targetRole: StaffRole): boolean {
  return ROLE_GRANT_MATRIX[grantorRole]?.includes(targetRole) ?? false;
}
