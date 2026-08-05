import { getAdmin, adminConfigured } from './supabaseAdmin';

// ─── School branding ───────────────────────────────────────────────────────────
// Per-school identity (name, logo, colours) loaded from the `schools` table
// rather than hardcoded. This is what makes "add a school and it just looks
// like their school" work — previously the name and logo were baked into 32
// separate files.
//
// HP_SCHOOL in lib/hpConfig.ts remains as the fallback for anything that
// can't resolve a school (a logged-out page, a server render with no session),
// so nothing renders blank while multi-school rolls out.

export interface SchoolBranding {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  slug: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const DEFAULT_BRANDING: SchoolBranding = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Altus Performance',
  shortName: 'Altus',
  abbreviation: 'AP',
  logoUrl: '/school-logo.png',
  primaryColor: '#38bdf8',
  accentColor: '#a78bfa',
  slug: 'default',
  latitude: -26.2041,
  longitude: 28.0473,
  timezone: 'Africa/Johannesburg',
};

function rowToBranding(row: Record<string, any>): SchoolBranding {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    abbreviation: row.abbreviation,
    logoUrl: row.logo_url || DEFAULT_BRANDING.logoUrl,
    primaryColor: row.primary_color || DEFAULT_BRANDING.primaryColor,
    accentColor: row.accent_color || DEFAULT_BRANDING.accentColor,
    slug: row.slug,
    latitude: row.latitude != null ? Number(row.latitude) : DEFAULT_BRANDING.latitude,
    longitude: row.longitude != null ? Number(row.longitude) : DEFAULT_BRANDING.longitude,
    timezone: row.timezone || DEFAULT_BRANDING.timezone,
  };
}

/** Branding for a specific school id. Falls back to defaults if not found. */
export async function getSchoolBranding(schoolId: string | null | undefined): Promise<SchoolBranding> {
  if (!schoolId || !adminConfigured()) return DEFAULT_BRANDING;
  try {
    const { data } = await getAdmin()
      .from('schools')
      .select('id,name,short_name,abbreviation,logo_url,primary_color,accent_color,slug,latitude,longitude,timezone')
      .eq('id', schoolId).maybeSingle();
    return data ? rowToBranding(data) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

/** Branding by URL slug — used for public portal routes like /portal/ridgemont. */
export async function getSchoolBrandingBySlug(slug: string): Promise<SchoolBranding | null> {
  if (!adminConfigured()) return null;
  try {
    const { data } = await getAdmin()
      .from('schools')
      .select('id,name,short_name,abbreviation,logo_url,primary_color,accent_color,slug,latitude,longitude,timezone')
      .eq('slug', slug).eq('is_active', true).maybeSingle();
    return data ? rowToBranding(data) : null;
  } catch {
    return null;
  }
}
