// St Benedict's College — Sports Configuration

export const SPORTS = {
  hockey:    { label: 'Hockey',     season: 'winter', color: '#38bdf8', icon: '🏑' },
  rugby:     { label: 'Rugby',      season: 'winter', color: '#f87171', icon: '🏉' },
  cricket:   { label: 'Cricket',    season: 'summer', color: '#fbbf24', icon: '🏏' },
  rowing:    { label: 'Rowing',     season: 'summer', color: '#34d399', icon: '🚣' },
  swimming:  { label: 'Swimming',   season: 'summer', color: '#818cf8', icon: '🏊' },
  waterpolo: { label: 'Water Polo', season: 'summer', color: '#06b6d4', icon: '🤽' },
  football:  { label: 'Football',   season: 'short',  color: '#a3e635', icon: '⚽' },
} as const;

export type SportKey = keyof typeof SPORTS;
export const ALL_SPORTS = Object.keys(SPORTS) as SportKey[];

export const WINTER_SPORTS: SportKey[] = ['hockey', 'rugby'];
export const SUMMER_SPORTS: SportKey[] = ['cricket', 'rowing', 'swimming', 'waterpolo'];
export const SHORT_SPORTS:  SportKey[] = ['football'];

// Current season based on SA school calendar
export function getCurrentSeason(): 'winter' | 'summer' {
  const m = new Date().getMonth() + 1;
  // Winter: Jan–Jul (Term 1 + Term 2)
  // Summer: Aug–Dec (Term 3)
  return m <= 7 ? 'winter' : 'summer';
}

// Sports active right now
export function getCurrentSeasonSports(): SportKey[] {
  const season = getCurrentSeason();
  return [...(season === 'winter' ? WINTER_SPORTS : SUMMER_SPORTS), ...SHORT_SPORTS];
}

export function getSport(key: SportKey) {
  return SPORTS[key];
}

export function getSportLabel(key: SportKey): string {
  return SPORTS[key]?.label ?? key;
}

export function getSportColor(key: SportKey): string {
  return SPORTS[key]?.color ?? '#94a3b8';
}

// Get hockey team groups (existing) — extend later for other sports
export const HOCKEY_TEAM_GROUPS = [
  { group:'Senior', teams:['1sts','2nds','3rds','4ths','5ths'] },
  { group:'U16',    teams:['U16A','U16B','U16C','U16D','U16E'] },
  { group:'U15',    teams:['U15A','U15B','U15C','U15D','U15E'] },
  { group:'U14',    teams:['U14A','U14B','U14C','U14D','U14E'] },
];

export const RUGBY_TEAM_GROUPS = [
  { group:'Senior', teams:['1st XV','2nd XV','3rd XV','4th XV'] },
  { group:'U16',    teams:['U16A','U16B','U16C'] },
  { group:'U15',    teams:['U15A','U15B','U15C'] },
  { group:'U14',    teams:['U14A','U14B','U14C'] },
];

export const CRICKET_TEAM_GROUPS = [
  { group:'Senior', teams:['1st XI','2nd XI','3rd XI'] },
  { group:'U16',    teams:['U16A','U16B'] },
  { group:'U15',    teams:['U15A','U15B'] },
  { group:'U14',    teams:['U14A','U14B'] },
];

export function getTeamGroups(sport: SportKey) {
  switch(sport) {
    case 'hockey':  return HOCKEY_TEAM_GROUPS;
    case 'rugby':   return RUGBY_TEAM_GROUPS;
    case 'cricket': return CRICKET_TEAM_GROUPS;
    default: return [];
  }
}
