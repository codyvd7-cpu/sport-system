import { getAdmin, adminConfigured } from './supabaseAdmin';

// ─── Athlete events ────────────────────────────────────────────────────────────
// Records meaningful moments in an athlete's history, so the app can answer
// "what changed with this athlete?" — previously impossible, because state was
// overwritten in place (change availability and yesterday's value was gone).
//
// Design rule: recording an event must NEVER break the thing that caused it.
// If a coach saves attendance and the event write fails, the attendance still
// saves. Every function here swallows its own errors deliberately.
//
// This does not replace the existing tables. attendance, hp_test_results and
// coach_notes remain the source of truth for their own data; these are thin
// pointers marking that something notable happened.

export type AthleteEventType =
  | 'availability_changed'
  | 'injury_reported'
  | 'injury_cleared'
  | 'test_completed'
  | 'personal_best'
  | 'attendance_concern'
  | 'note_added'
  | 'goal_set'
  | 'goal_achieved'
  | 'programme_assigned'
  | 'programme_completed'
  | 'checkin'
  | 'workout_logged'
  | 'award';

export interface AthleteEventInput {
  athleteId: string;
  schoolId: string | null;
  type: AthleteEventType;
  summary: string;
  detail?: Record<string, unknown>;
  sourceTable?: string;
  sourceId?: string;
  actor?: string;
  occurredAt?: string;
}

/**
 * Record one athlete event. Fire-and-forget: callers should not await this in
 * a way that delays their response, and must not fail if it fails.
 */
export async function recordAthleteEvent(e: AthleteEventInput): Promise<void> {
  if (!adminConfigured() || !e.athleteId || !e.schoolId) return;
  try {
    await getAdmin().from('athlete_events').insert([{
      athlete_id: e.athleteId,
      school_id: e.schoolId,
      event_type: e.type,
      summary: e.summary,
      detail: e.detail ?? {},
      source_table: e.sourceTable ?? null,
      source_id: e.sourceId ?? null,
      actor: e.actor ?? 'system',
      occurred_at: e.occurredAt ?? new Date().toISOString(),
    }]);
  } catch {
    /* history is valuable but never worth failing a real action over */
  }
}

/** Record several at once (e.g. a squad-wide session). Same failure policy. */
export async function recordAthleteEvents(events: AthleteEventInput[]): Promise<void> {
  const valid = events.filter(e => e.athleteId && e.schoolId);
  if (!adminConfigured() || valid.length === 0) return;
  try {
    await getAdmin().from('athlete_events').insert(valid.map(e => ({
      athlete_id: e.athleteId,
      school_id: e.schoolId,
      event_type: e.type,
      summary: e.summary,
      detail: e.detail ?? {},
      source_table: e.sourceTable ?? null,
      source_id: e.sourceId ?? null,
      actor: e.actor ?? 'system',
      occurred_at: e.occurredAt ?? new Date().toISOString(),
    })));
  } catch {
    /* as above */
  }
}

export interface AthleteEvent {
  id: string;
  athlete_id: string;
  event_type: AthleteEventType;
  summary: string;
  detail: Record<string, unknown>;
  source_table: string | null;
  source_id: string | null;
  actor: string | null;
  occurred_at: string;
}

/** One athlete's timeline, newest first. */
export async function getAthleteTimeline(athleteId: string, limit = 50): Promise<AthleteEvent[]> {
  if (!adminConfigured()) return [];
  try {
    const { data } = await getAdmin()
      .from('athlete_events')
      .select('id,athlete_id,event_type,summary,detail,source_table,source_id,actor,occurred_at')
      .eq('athlete_id', athleteId)
      .order('occurred_at', { ascending: false })
      .limit(limit);
    return (data as AthleteEvent[]) || [];
  } catch {
    return [];
  }
}

/**
 * Recent events across a school — the data behind "what's changed?".
 * Optionally filtered to specific athletes (e.g. a coach's own teams).
 */
export async function getRecentSchoolEvents(
  schoolId: string,
  opts: { since?: string; athleteIds?: string[]; types?: AthleteEventType[]; limit?: number } = {}
): Promise<AthleteEvent[]> {
  if (!adminConfigured() || !schoolId) return [];
  try {
    let q = getAdmin()
      .from('athlete_events')
      .select('id,athlete_id,event_type,summary,detail,source_table,source_id,actor,occurred_at')
      .eq('school_id', schoolId)
      .order('occurred_at', { ascending: false })
      .limit(opts.limit ?? 100);
    if (opts.since) q = q.gte('occurred_at', opts.since);
    if (opts.athleteIds?.length) q = q.in('athlete_id', opts.athleteIds);
    if (opts.types?.length) q = q.in('event_type', opts.types);
    const { data } = await q;
    return (data as AthleteEvent[]) || [];
  } catch {
    return [];
  }
}
