// ─── Altus Performance — Sport Configuration ───────────────────────────────────
// Single source of truth for all sport definitions.
// Pages and API routes should import from here — never hardcode sport logic.

export type SportStructure = 'team' | 'squad' | 'event' | 'crew';

export interface SportTerminology {
  group:     string;  // e.g. "Age Group" / "Squad" / "Boat Class"
  unit:      string;  // e.g. "Team" / "Squad" / "Crew"
  fixture:   string;  // e.g. "Fixture" / "Gala" / "Regatta"
  result:    string;  // e.g. "Result" / "Times" / "Crew Result"
  athlete:   string;  // e.g. "Player" / "Swimmer" / "Rower"
  score:     string;  // e.g. "Score" / "PB" / "Time"
  session:   string;  // e.g. "Training" / "Session" / "Water Session"
}

export interface SportFeatures {
  teams:          boolean;
  fixtures:       boolean;
  results:        boolean;
  programs:       boolean;
  attendance:     boolean;
  testing:        boolean;
  playerSpotlight:boolean;
  pbTracking:     boolean;
  eventEntries:   boolean;
  crews:          boolean;
  coachNotes:     boolean;
}

export interface SportConfig {
  label:       string;
  structure:   SportStructure;
  season:      'winter' | 'summer' | 'short';
  color:       string;
  icon:        string;
  terminology: SportTerminology;
  features:    SportFeatures;
}

// ── Sport definitions ──────────────────────────────────────────────────────────
export const SPORTS: Record<string, SportConfig> = {
  hockey: {
    label: 'Hockey', structure: 'team', season: 'winter', color: '#38bdf8', icon: '🏑',
    terminology: { group:'Age Group', unit:'Team', fixture:'Fixture', result:'Result', athlete:'Player', score:'Score', session:'Training' },
    features: { teams:true, fixtures:true, results:true, programs:true, attendance:true, testing:true, playerSpotlight:true, pbTracking:false, eventEntries:false, crews:false, coachNotes:true },
  },
  rugby: {
    label: 'Rugby', structure: 'team', season: 'winter', color: '#f87171', icon: '🏉',
    terminology: { group:'Age Group', unit:'Team', fixture:'Fixture', result:'Result', athlete:'Player', score:'Score', session:'Training' },
    features: { teams:true, fixtures:true, results:true, programs:true, attendance:true, testing:true, playerSpotlight:true, pbTracking:false, eventEntries:false, crews:false, coachNotes:true },
  },
  cricket: {
    label: 'Cricket', structure: 'team', season: 'summer', color: '#fbbf24', icon: '🏏',
    terminology: { group:'Age Group', unit:'Team', fixture:'Match', result:'Scorecard', athlete:'Player', score:'Score', session:'Practice' },
    features: { teams:true, fixtures:true, results:true, programs:true, attendance:true, testing:false, playerSpotlight:true, pbTracking:false, eventEntries:false, crews:false, coachNotes:true },
  },
  swimming: {
    label: 'Swimming', structure: 'event', season: 'summer', color: '#818cf8', icon: '🏊',
    terminology: { group:'Squad', unit:'Squad', fixture:'Gala', result:'Times', athlete:'Swimmer', score:'PB', session:'Session' },
    features: { teams:false, fixtures:true, results:true, programs:true, attendance:true, testing:false, playerSpotlight:true, pbTracking:true, eventEntries:true, crews:false, coachNotes:true },
  },
  rowing: {
    label: 'Rowing', structure: 'crew', season: 'summer', color: '#34d399', icon: '🚣',
    terminology: { group:'Boat Class', unit:'Crew', fixture:'Regatta', result:'Crew Result', athlete:'Rower', score:'Time', session:'Water Session' },
    features: { teams:false, fixtures:true, results:true, programs:true, attendance:true, testing:true, playerSpotlight:true, pbTracking:true, eventEntries:false, crews:true, coachNotes:true },
  },
  waterpolo: {
    label: 'Water Polo', structure: 'team', season: 'summer', color: '#06b6d4', icon: '🤽',
    terminology: { group:'Age Group', unit:'Team', fixture:'Fixture', result:'Result', athlete:'Player', score:'Score', session:'Training' },
    features: { teams:true, fixtures:true, results:true, programs:true, attendance:true, testing:false, playerSpotlight:true, pbTracking:false, eventEntries:false, crews:false, coachNotes:true },
  },
  football: {
    label: 'Football', structure: 'team', season: 'short', color: '#a3e635', icon: '⚽',
    terminology: { group:'Age Group', unit:'Team', fixture:'Match', result:'Result', athlete:'Player', score:'Score', session:'Training' },
    features: { teams:true, fixtures:true, results:true, programs:true, attendance:true, testing:false, playerSpotlight:true, pbTracking:false, eventEntries:false, crews:false, coachNotes:true },
  },
};

export type SportKey = keyof typeof SPORTS;
export const ALL_SPORTS = Object.keys(SPORTS) as SportKey[];

// ── Season helpers ─────────────────────────────────────────────────────────────
export const WINTER_SPORTS: SportKey[] = ['hockey', 'rugby'];
export const SUMMER_SPORTS: SportKey[] = ['cricket', 'rowing', 'swimming', 'waterpolo'];
export const SHORT_SPORTS:  SportKey[] = ['football'];

export function getCurrentSeason(): 'winter' | 'summer' {
  const m = new Date().getMonth() + 1;
  return m <= 7 ? 'winter' : 'summer';
}

export function getCurrentSeasonSports(): SportKey[] {
  const season = getCurrentSeason();
  return [...(season === 'winter' ? WINTER_SPORTS : SUMMER_SPORTS), ...SHORT_SPORTS];
}

// ── Config accessors ───────────────────────────────────────────────────────────
export function getSport(key: string): SportConfig | undefined {
  return SPORTS[key as SportKey];
}

export function getSportLabel(key: string): string {
  return SPORTS[key as SportKey]?.label ?? key;
}

export function getSportColor(key: string): string {
  return SPORTS[key as SportKey]?.color ?? '#94a3b8';
}

export function getSportTerm(key: string, field: keyof SportTerminology): string {
  return SPORTS[key as SportKey]?.terminology[field] ?? field;
}

export function sportHas(key: string, feature: keyof SportFeatures): boolean {
  return SPORTS[key as SportKey]?.features[feature] ?? false;
}

// ── Team groups (kept for backward compat) ────────────────────────────────────
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

export const SWIMMING_SQUADS = [
  { group:'Squads', teams:['Senior Squad','Junior Squad','Development Squad'] },
];

export const ROWING_CREWS = [
  { group:'Senior', teams:['1st VIII','2nd VIII','U16A','U15A'] },
  { group:'Junior', teams:['U14A','U14B'] },
];

export function getTeamGroups(sport: SportKey) {
  switch (sport) {
    case 'hockey':   return HOCKEY_TEAM_GROUPS;
    case 'rugby':    return RUGBY_TEAM_GROUPS;
    case 'cricket':  return CRICKET_TEAM_GROUPS;
    case 'swimming': return SWIMMING_SQUADS;
    case 'rowing':   return ROWING_CREWS;
    default: return [];
  }
}
