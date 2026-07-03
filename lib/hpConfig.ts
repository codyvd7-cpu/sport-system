// ─── HP school config ──────────────────────────────────────────────────────────
// Bennies-specific for now. Move to DB table (hp_school_config) for multi-school.
// All HP pages should import from here — never hardcode grades or classes.

export const HP_SCHOOL = {
  name:      "St Benedict's College",
  shortName: 'Bennies',
  location:  'Bedfordview',
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
