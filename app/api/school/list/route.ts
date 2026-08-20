import { NextResponse } from 'next/server';
import { getAdmin, adminConfigured } from '@/lib/supabaseAdmin';

// ─── /api/school/list ─────────────────────────────────────────────────────────
// The schools using Altus, for the "find your school" picker on the bare
// landing page.
//
// Deliberately public and deliberately minimal: name, slug, abbreviation and
// colour only. A parent who lands on the root domain rather than their
// school's own link needs to find their way in, and that has to work before
// they have any account or code.
//
// No counts, no contact details, no athlete data — nothing here that isn't
// already on a school's public portal.

export const revalidate = 300;

export async function GET() {
  if (!adminConfigured()) return NextResponse.json({ schools: [] });
  try {
    const { data } = await getAdmin()
      .from('schools')
      .select('name,short_name,abbreviation,slug,primary_color,logo_url')
      .eq('is_active', true)
      .order('name');
    return NextResponse.json({ schools: data || [] });
  } catch {
    return NextResponse.json({ schools: [] });
  }
}
