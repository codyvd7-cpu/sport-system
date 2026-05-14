import * as React from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CoachNav from '@/components/CoachNav';

export default async function Layout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  return (
    <>
      <CoachNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </>
  );
}
