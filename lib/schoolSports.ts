import { getAdmin, adminConfigured } from './supabaseAdmin';
import { SPORTS, type SportConfig } from './sports';

// ─── Per-school sports ─────────────────────────────────────────────────────────
// Which sports a school actually runs, from the school_sports table. Previously
// every school saw all seven sports defined in lib/sports.ts whether they
// offered them or not.
//
// The sport DEFINITIONS (labels, icons, terminology — "Crew" vs "Team",
// "Regatta" vs "Fixture") still live in lib/sports.ts. This only controls which
// of them a given school sees, plus optional per-school overrides.

export interface SchoolSport {
  key: string;
  label: string;
  color: string;
  icon: string;
  config: SportConfig | undefined;
}

/** Enabled sports for a school, in the school's own display order. */
export async function getSchoolSports(schoolId: string | null | undefined): Promise<SchoolSport[]> {
  if (!schoolId || !adminConfigured()) return fallbackSports();

  try {
    const { data } = await getAdmin()
      .from('school_sports')
      .select('sport_key,display_name,color_override,sort_order')
      .eq('school_id', schoolId).eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (!data?.length) return fallbackSports();

    return data.map(row => {
      const cfg = SPORTS[row.sport_key];
      return {
        key: row.sport_key,
        label: row.display_name || cfg?.label || row.sport_key,
        color: row.color_override || cfg?.color || '#38bdf8',
        icon: cfg?.icon || '🏆',
        config: cfg,
      };
    });
  } catch {
    return fallbackSports();
  }
}

/**
 * Used when a school has no sports configured yet, or the lookup fails.
 * Returns the full built-in list rather than an empty one — a school seeing
 * too many sports is a cosmetic problem; a school seeing none looks broken.
 */
function fallbackSports(): SchoolSport[] {
  return Object.entries(SPORTS).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    color: cfg.color,
    icon: cfg.icon,
    config: cfg,
  }));
}
