// ─── HP Role System ────────────────────────────────────────────────────────────
// Simple role layer on top of HP cookie auth.
// Roles are stored in the hp_session cookie payload.
// hp-admin role: can access rollover, bulk delete, year config.
// hp-coach role: can access testing, attendance, classes.
// Default (no role field): treated as hp-coach for backward compatibility.

export type HPRole = 'hp-admin' | 'hp-coach';

export const HP_ROLE_PERMISSIONS: Record<HPRole, string[]> = {
  'hp-admin': [
    'rollover', 'bulk-delete', 'year-config',
    'testing', 'attendance', 'classes', 'students',
    'trends', 'import', 'reports',
  ],
  'hp-coach': [
    'testing', 'attendance', 'classes', 'students',
    'trends', 'import', 'reports',
  ],
};

export function canAccess(role: HPRole | undefined, feature: string): boolean {
  if (!role) return HP_ROLE_PERMISSIONS['hp-coach'].includes(feature);
  return HP_ROLE_PERMISSIONS[role]?.includes(feature) ?? false;
}

// Admin access codes (set in env vars)
// HP_ACCESS_CODE       → coach access
// HP_ADMIN_ACCESS_CODE → admin access (for rollover etc.)
export function getHpRoleFromCode(code: string): HPRole | null {
  const adminCode = process.env.HP_ADMIN_ACCESS_CODE;
  const coachCode = process.env.HP_ACCESS_CODE;
  if (adminCode && code === adminCode) return 'hp-admin';
  if (coachCode && code === coachCode) return 'hp-coach';
  return null;
}
