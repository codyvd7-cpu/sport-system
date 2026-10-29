import type { StaffRole } from './serverAuth';

// ─── lib/authz — the single authorization contract ──────────────────────────────
// AP-07. Before this, every privileged route hand-wrote its own list of
// allowed roles (e.g. ['owner','head_of_sport','deputy_head_of_sport',...]).
// The same list was copy-pasted a dozen ways, drifted between routes, and
// there was no one place that answered "who is allowed to do X" — so widening
// or tightening a permission meant finding and editing every copy, and a
// missed copy was a silent security gap.
//
// This module is that one place. It follows the standard role-based access
// control model (NIST RBAC): named ROLES, a seniority RANK, and a CAPABILITY
// catalogue that assigns each action to the exact set of roles permitted to
// perform it. Routes reference a capability — never a literal role array.

/** Every staff role the system knows, most senior first. */
export const STAFF_ROLES: readonly StaffRole[] = [
  'owner', 'head_of_sport', 'deputy_head_of_sport', 'head_of_hockey', 'mic', 'coach', 'viewer',
];

/**
 * Seniority rank. Higher = more authority. Used for grant rules and for any
 * "at least this senior" check. head_of_hockey is a legacy sport-head role;
 * it sits just above mic for grant purposes but carries its own explicit
 * capability assignments rather than inheriting a whole tier.
 */
export const ROLE_RANK: Record<StaffRole, number> = {
  owner: 100,
  head_of_sport: 80,
  deputy_head_of_sport: 60,
  head_of_hockey: 45,
  mic: 40,
  coach: 20,
  viewer: 10,
};

// Named role groups. These are the building blocks capabilities and route
// guards share, so a grouping is defined once and reused by name.
const OWNER_HOS: StaffRole[] = ['owner', 'head_of_sport'];
const SENIOR: StaffRole[] = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'head_of_hockey'];
const SENIOR_MIC: StaffRole[] = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic'];
// Everyone who can write/coach — every role except the read-only viewer.
const WRITERS: StaffRole[] = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic', 'coach', 'head_of_hockey'];
// Roles the app treats as "sees everything in the school" (no per-team scoping).
export const SCHOOL_WIDE_ROLES: StaffRole[] = ['owner', 'head_of_sport', 'deputy_head_of_sport', 'mic', 'head_of_hockey'];

/**
 * The capability catalogue — the authority record for the whole app. Each key
 * is an action; its value is the exact set of roles permitted to perform it.
 * Add a capability here and reference it from the route; never inline a role
 * list in a route again.
 */
export const CAPABILITIES = {
  // Raise / clear safety (lightning) alerts for the school.
  'alerts.manage': OWNER_HOS,
  // Invite or add other staff members.
  'staff.invite': ['owner', 'head_of_sport', 'head_of_hockey'] as StaffRole[],
  // Senior administrative actions — coach photos, data-deletion requests.
  'school.admin': SENIOR,
  // Send a broadcast notification to the school.
  'notifications.send': SENIOR_MIC,
  // Read athlete-level data (coach dashboards, athlete PDFs). Any coach, not a viewer.
  'athlete.view': WRITERS,
} as const;

export type Capability = keyof typeof CAPABILITIES;

/** The roles permitted to perform a capability — pass straight to a guard. */
export function rolesFor(capability: Capability): StaffRole[] {
  return [...CAPABILITIES[capability]];
}

/** Does this role hold this capability? The single yes/no authorization check. */
export function can(role: StaffRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return (CAPABILITIES[capability] as readonly StaffRole[]).includes(role);
}

/** True for roles that see the whole school rather than only assigned teams. */
export function isSchoolWide(role: StaffRole): boolean {
  return SCHOOL_WIDE_ROLES.includes(role);
}

/**
 * Which roles may GRANT which other roles (role-administration rules). A role
 * can never grant one more senior than the sets below allow — e.g. a
 * head_of_hockey cannot mint an owner.
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
