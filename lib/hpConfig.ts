// ─── School config ──────────────────────────────────────────────────────────────
// Single source of truth for school branding. ALL pages should import from here —
// never hardcode the school name, abbreviation, or logo path directly.
//
// Currently a placeholder identity ("Ridgemont College") — the original pilot school is no longer
// the client, so real school branding/logo was removed. Change the values below
// and every page picks it up automatically; no more hunting across 39 files.

export const HP_SCHOOL = {
  name:         "Ridgemont College",
  shortName:    'Ridgemont',
  abbreviation: 'RC',
  location:     'Bedfordview',
  logo:         '/school-logo.png',
} as const;

export const HP_GRADES = [
  { label: 'Grade 8', short: '8' },
  { label: 'Grade 9', short: '9' },
] as const;

export const HP_CLASSES = ['B', 'E', 'F', 'J', 'M'] as const;

export const HP_CLASS_IDS = HP_GRADES.flatMap(g =>
  HP_CLASSES.map(c => `${g.short}${c}`)
) as string[];
// → ['8B','8E','8F','8J','8M','9B','9E','9F','9J','9M']

export const HP_CLASS_MAP = HP_CLASS_IDS.map(id => ({
  id,
  grade:     `Grade ${id[0]}` as 'Grade 8' | 'Grade 9',
  gradeNum:  id[0] as '8' | '9',
  cls:       id[1] as typeof HP_CLASSES[number],
  gradeLabel: HP_GRADES.find(g => g.short === id[0])!.label,
}));

export const HP_TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'] as const;
export type  HPTerm  = typeof HP_TERMS[number];

export const HP_CURRENT_YEAR = new Date().getFullYear();
