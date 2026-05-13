import { checkStaffAccess } from '@/lib/staffAccess';
import { redirect } from 'next/navigation';

export default async function AssistantLayout({ children }: { children: React.ReactNode }) {
  const access = await checkStaffAccess(['owner', 'head_of_hockey', 'coach', 'viewer']);
  if (!access.allowed) redirect('/login?redirect=/assistant');
  return <>{children}</>;
}
