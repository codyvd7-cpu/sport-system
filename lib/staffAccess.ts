import { supabase } from '@/lib/supabase';

export type StaffRole = 'owner' | 'head_of_hockey' | 'coach' | 'viewer';

export type StaffAccessResult = {
  allowed: boolean;
  role: StaffRole | null;
  email: string | null;
  reason?: string;
};

export async function checkStaffAccess(
  allowedRoles: StaffRole[]
): Promise<StaffAccessResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.email) {
    return {
      allowed: false,
      role: null,
      email: null,
      reason: 'No active login session found.',
    };
  }

  const email = session.user.email.toLowerCase();

  const { data: staffRole, error: roleError } = await supabase
    .from('staff_roles')
    .select('role, is_active, email')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();

  if (roleError || !staffRole) {
    return {
      allowed: false,
      role: null,
      email,
      reason: 'No active staff role found for this account.',
    };
  }

  const role = staffRole.role as StaffRole;

  return {
    allowed: allowedRoles.includes(role),
    role,
    email,
  };
}