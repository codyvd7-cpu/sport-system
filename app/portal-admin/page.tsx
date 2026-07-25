'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';
import { useRouter } from 'next/navigation';
import { useRole } from '@/lib/useRole';
import { SPORTS, getTeamGroups, type SportKey } from '@/lib/sports';
import * as React from 'react';
import { FixturesSection } from './sections/FixturesSection';
import { ResultsSection } from './sections/ResultsSection';
import { WeekSection } from './sections/WeekSection';
import { ProgramsSection } from './sections/ProgramsSection';
import { RemindersSection } from './sections/RemindersSection';
import { SponsorsSection } from './sections/SponsorsSection';
import { WorkoutProgramsSection } from './sections/WorkoutProgramsSection';
import { SpotlightSection } from './sections/SpotlightSection';
import { PlayerProfilesSection } from './sections/PlayerProfilesSection';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

type GenericRow = Record<string, any>;
type WeekPlan = { id: string; created_at: string | null; week_label: string; published: boolean; };
type WeekPlanItem = { id: string; created_at: string | null; week_plan_id: string; day_label: string; title: string; details: string; sort_order: number; };
type Reminder = { id: string; created_at: string | null; title: string; details: string; is_published: boolean; sort_order: number; };
import type { Fixture, WorkoutProgram, WorkoutProgramExercise } from './types';
import { useFixturesAdmin } from './hooks/useFixturesAdmin';
import { useResultsAdmin } from './hooks/useResultsAdmin';
import { useRemindersAdmin } from './hooks/useRemindersAdmin';
import { useWeekPlanAdmin } from './hooks/useWeekPlanAdmin';
import { useProgramsAdmin } from './hooks/useProgramsAdmin';
import { useSponsorsAdmin } from './hooks/useSponsorsAdmin';
import { useWorkoutProgramsAdmin } from './hooks/useWorkoutProgramsAdmin';
type Result = { id: string; created_at: string | null; team: string; opponent: string; result_date: string; final_score: string; goal_scorers: string; is_published: boolean; sort_order: number; };
type Program = { id: string; created_at: string | null; title: string; category: string; day_label: string; details: string; is_published: boolean; sort_order: number; file_name: string; file_path: string; file_url: string; };
type Sponsor = { id: string; created_at: string | null; name: string; image_name: string; image_path: string; image_url: string; sponsor_link: string; is_published: boolean; sort_order: number; };

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return String(value);
  }
  return '';
}

function firstBoolean(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return false;
}

function firstNumber(...values: any[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function formatDate(dateString?: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function normalizeWeekPlan(row: GenericRow): WeekPlan {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    week_label: firstString(row.week_label) || 'Week at a Glance',
    published: firstBoolean(row.published),
  };
}

function normalizeWeekPlanItem(row: GenericRow): WeekPlanItem {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    week_plan_id: firstValue(row.week_plan_id),
    day_label: firstString(row.day_label),
    title: firstString(row.title),
    details: firstString(row.details),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeReminder(row: GenericRow): Reminder {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeFixture(row: GenericRow): Fixture {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    fixture_date: firstString(row.fixture_date),
    fixture_time: firstString(row.fixture_time),
    venue: firstString(row.venue),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
    coach: firstString(row.coach) || null,
    umpire: firstString(row.umpire) || null,
    notes: firstString(row.notes) || null,
    home_away: firstString(row.home_away) || null,
    sport: firstString(row.sport) || undefined,
  };
}

function normalizeResult(row: GenericRow): Result {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    result_date: firstString(row.result_date),
    final_score: firstString(row.final_score, row.score),
    goal_scorers: firstString(row.goal_scorers),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeProgram(row: GenericRow): Program {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    category: firstString(row.category) || 'Gym',
    day_label: firstString(row.day_label),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
    file_name: firstString(row.file_name),
    file_path: firstString(row.file_path),
    file_url: firstString(row.file_url),
  };
}

function normalizeSponsor(row: GenericRow): Sponsor {
  return {
    id: firstValue(row.id, safeUUID()),
    created_at: firstString(row.created_at) || null,
    name: firstString(row.name),
    image_name: firstString(row.image_name),
    image_path: firstString(row.image_path),
    image_url: firstString(row.image_url),
    sponsor_link: firstString(row.sponsor_link),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PROGRAM_CATEGORIES = ['Gym', 'Mobility', 'Recovery'];

export default function PortalAdminPage() {
const router = useRouter();
  const { showToast } = useToast();
  const { sport, isHOH } = useRole();
  const SPORT_COLORS: Record<string,string> = {hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
  const SCORE_TERMS: Record<string,{scorers:string;score:string}> = {
    hockey:{scorers:'Goal Scorers',score:'Goals'}, rugby:{scorers:'Try Scorers',score:'Tries'},
    cricket:{scorers:'Top Scorers',score:'Runs'}, rowing:{scorers:'Crew',score:'Time'},
    swimming:{scorers:'Swimmers',score:'Time'}, waterpolo:{scorers:'Goal Scorers',score:'Goals'},
  };
  const scoreTerm = SCORE_TERMS[sport||'hockey'] || SCORE_TERMS.hockey;
  // MICs manage their sport's portal; HOS/owner can select sport
  const [activeSport, setActiveSport] = useState<SportKey>('hockey');
  // Once role loads, set sport
  useEffect(() => { if (sport) setActiveSport(sport as SportKey); }, [sport]);

  // Team options for the active sport
  const teamOptions = React.useMemo(() => {
    const groups = getTeamGroups(activeSport);
    return groups.flatMap((g: {teams: string[]}) => g.teams);
  }, [activeSport]);

async function handleLogout() {
  await supabase.auth.signOut();
  window.location.assign('/login');
}  
  const [weekPlanRows, setWeekPlanRows] = useState<GenericRow[]>([]);
  const [weekPlanItemRows, setWeekPlanItemRows] = useState<GenericRow[]>([]);
  const [reminderRows, setReminderRows] = useState<GenericRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<GenericRow[]>([]);
  const [resultRows, setResultRows] = useState<GenericRow[]>([]);
  const [programRows, setProgramRows] = useState<GenericRow[]>([]);
  const [sponsorRows, setSponsorRows] = useState<GenericRow[]>([]);
  const [workoutProgramRows, setWorkoutProgramRows] = useState<GenericRow[]>([]);
  const [workoutExerciseRows, setWorkoutExerciseRows] = useState<GenericRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('fixtures');

  async function loadPortalAdminData() {
    setLoading(true);
    setError('');

    const [
      weekPlansRes,
      weekPlanItemsRes,
      remindersRes,
      fixturesRes,
      resultsRes,
      programsRes,
      sponsorsRes,
      workoutProgramsRes,
      workoutExercisesRes,
    ] = await Promise.all([
      supabase.from('portal_week_plans').select('*').order('created_at', { ascending: false }),
      supabase.from('portal_week_plan_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('portal_reminders').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('portal_fixtures')
        .select('*')
        .eq('sport', activeSport)
        .order('fixture_date', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('portal_results')
        .select('*')
        .eq('sport', activeSport)
        .order('result_date', { ascending: false })
        .order('sort_order', { ascending: true }),
      supabase.from('portal_programs').select('*').order('sort_order', { ascending: true }),
      supabase.from('portal_sponsors').select('*').order('sort_order', { ascending: true }),
      supabase.from('workout_programs').select('*').order('sort_order', { ascending: true }),
      supabase.from('workout_program_exercises').select('*').order('sort_order', { ascending: true }),
    ]);

    if (
      weekPlansRes.error ||
      weekPlanItemsRes.error ||
      remindersRes.error ||
      fixturesRes.error ||
      resultsRes.error ||
      programsRes.error ||
      sponsorsRes.error ||
      workoutProgramsRes.error ||
      workoutExercisesRes.error
    ) {
      setError(
        weekPlansRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          remindersRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          programsRes.error?.message ||
          sponsorsRes.error?.message ||
          workoutProgramsRes.error?.message ||
          workoutExercisesRes.error?.message ||
          'Failed to load portal admin data.'
      );
      setLoading(false);
      return;
    }

    setWeekPlanRows((weekPlansRes.data as GenericRow[]) || []);
    setWeekPlanItemRows((weekPlanItemsRes.data as GenericRow[]) || []);
    setReminderRows((remindersRes.data as GenericRow[]) || []);
    setFixtureRows((fixturesRes.data as GenericRow[]) || []);
    setResultRows((resultsRes.data as GenericRow[]) || []);
    setProgramRows((programsRes.data as GenericRow[]) || []);
    setSponsorRows((sponsorsRes.data as GenericRow[]) || []);
    setWorkoutProgramRows((workoutProgramsRes.data as GenericRow[]) || []);
    setWorkoutExerciseRows((workoutExercisesRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPortalAdminData();
  }, [activeSport]);

  const weekPlans = useMemo(
    () =>
      weekPlanRows
        .map(normalizeWeekPlan)
        .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()),
    [weekPlanRows]
  );

  const weekPlanItems = useMemo(
    () => weekPlanItemRows.map(normalizeWeekPlanItem).sort((a, b) => a.sort_order - b.sort_order),
    [weekPlanItemRows]
  );

  const reminders = useMemo(
    () => reminderRows.map(normalizeReminder).sort((a, b) => a.sort_order - b.sort_order),
    [reminderRows]
  );

  const fixtures = useMemo(
    () =>
      fixtureRows
        .map(normalizeFixture)
        .sort(
          (a, b) =>
            new Date(a.fixture_date || 0).getTime() - new Date(b.fixture_date || 0).getTime() ||
            a.sort_order - b.sort_order
        ),
    [fixtureRows]
  );

  const results = useMemo(
    () =>
      resultRows
        .map(normalizeResult)
        .sort(
          (a, b) =>
            new Date(b.result_date || 0).getTime() - new Date(a.result_date || 0).getTime() ||
            a.sort_order - b.sort_order
        ),
    [resultRows]
  );

  const programs = useMemo(
    () => programRows.map(normalizeProgram).sort((a, b) => a.sort_order - b.sort_order),
    [programRows]
  );

  const sponsors = useMemo(
    () => sponsorRows.map(normalizeSponsor).sort((a, b) => a.sort_order - b.sort_order),
    [sponsorRows]
  );

  const workoutPrograms = useMemo(
    () => (workoutProgramRows as WorkoutProgram[]).slice().sort((a, b) => a.sort_order - b.sort_order),
    [workoutProgramRows]
  );
  const workoutExercises = useMemo(
    () => workoutExerciseRows as WorkoutProgramExercise[],
    [workoutExerciseRows]
  );


  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  const fx = useFixturesAdmin({
    supabase, activeSport, runAction, showToast, setError,
    refetch: loadPortalAdminData,
  });
  const res = useResultsAdmin({ supabase, activeSport, runAction, showToast, setError, refetch: loadPortalAdminData });
  const rem = useRemindersAdmin({ supabase, reminders, runAction, showToast, setError, refetch: loadPortalAdminData });
  const wk = useWeekPlanAdmin({ supabase, weekPlans, weekPlanItems, runAction, showToast, setError, refetch: loadPortalAdminData });
  const prog = useProgramsAdmin({ supabase, programs, runAction, showToast, setError, refetch: loadPortalAdminData });
  const spon = useSponsorsAdmin({ supabase, sponsors, runAction, showToast, setError, refetch: loadPortalAdminData });
  const wpAdmin = useWorkoutProgramsAdmin({ supabase, programs: workoutPrograms, exercises: workoutExercises, runAction, showToast, setError, refetch: loadPortalAdminData });

  async function moveItem(
    table: string,
    items: { id: string; sort_order: number }[],
    index: number,
    direction: 'up' | 'down'
  ) {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= items.length) return;
    const a = items[index];
    const b = items[swapIndex];
    await runAction(async () => {
      const [res1, res2] = await Promise.all([
        supabase.from(table).update({ sort_order: b.sort_order }).eq('id', a.id),
        supabase.from(table).update({ sort_order: a.sort_order }).eq('id', b.id),
      ]);
      if (res1.error || res2.error) {
        setError('Failed to reorder.');
        return;
      }
      await loadPortalAdminData();
    });
  }





































  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:sportColor+'b3'}}>
              {SPORTS[activeSport]?.label || activeSport} · Portal Admin
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight text-white leading-none">Portal Admin</h1>
            <p className="mt-2 text-sm" style={{color:'rgba(255,255,255,0.3)'}}>Manage fixtures, results, week plan, programs, reminders and sponsors.</p>
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {/* Sport switcher — only for HOS/owner who can manage all sports */}
            {isHOH && !sport && (
              <div className="flex rounded-xl border border-white/7 bg-white/3 p-0.5">
                {(['hockey','rugby','cricket','rowing','swimming','waterpolo'] as SportKey[]).map(s => (
                  <button key={s} onClick={() => setActiveSport(s)}
                    className="rounded-lg px-3 py-2 text-[11px] font-black capitalize transition"
                    style={{background:activeSport===s?'rgba(255,255,255,0.08)':'transparent',color:activeSport===s?'white':'rgba(255,255,255,0.3)'}}>
                    {SPORTS[s]?.icon} {SPORTS[s]?.label}
                  </button>
                ))}
              </div>
            )}
            <Link href="/portal" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/20 transition">Portal</Link>
            <button onClick={handleLogout} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 transition">Logout</button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b pb-4" style={{borderColor:'rgba(255,255,255,0.06)'}}>
          {['fixtures','results','week','programs','workouts','reminders','sponsors','spotlight','players'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="rounded-xl px-4 py-2 text-sm font-black capitalize transition border"
              style={{background:activeTab===tab?sportColor+'20':'rgba(255,255,255,0.02)',borderColor:activeTab===tab?sportColor+'66':'rgba(255,255,255,0.07)',color:activeTab===tab?'white':'rgba(255,255,255,0.35)'}}>
              {tab === 'week' ? 'Week Plan' : tab === 'workouts' ? 'Workouts' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'fixtures' && <FixturesSection fixtures={fixtures} busy={busy} newFixtureOpponent={fx.newFixtureOpponent} setNewFixtureOpponent={fx.setNewFixtureOpponent} newFixtureBlocks={fx.newFixtureBlocks} addFixtureBlock={fx.addFixtureBlock} removeFixtureBlock={fx.removeFixtureBlock} updateFixtureBlock={fx.updateFixtureBlock} addTeamSlot={fx.addTeamSlot} updateTeamSlot={fx.updateTeamSlot} removeTeamSlot={fx.removeTeamSlot} newFixturePublished={fx.newFixturePublished} setNewFixturePublished={fx.setNewFixturePublished} handleCreateFixture={fx.handleCreateFixture} editingFixtureId={fx.editingFixtureId} editFixtureTeam={fx.editFixtureTeam} setEditFixtureTeam={fx.setEditFixtureTeam} editFixtureOpponent={fx.editFixtureOpponent} setEditFixtureOpponent={fx.setEditFixtureOpponent} editFixtureDate={fx.editFixtureDate} setEditFixtureDate={fx.setEditFixtureDate} editFixtureTime={fx.editFixtureTime} setEditFixtureTime={fx.setEditFixtureTime} editFixtureVenue={fx.editFixtureVenue} setEditFixtureVenue={fx.setEditFixtureVenue} editFixtureCoach={fx.editFixtureCoach} setEditFixtureCoach={fx.setEditFixtureCoach} editFixtureUmpire={fx.editFixtureUmpire} setEditFixtureUmpire={fx.setEditFixtureUmpire} editFixtureNotes={fx.editFixtureNotes} setEditFixtureNotes={fx.setEditFixtureNotes} editFixtureHomeAway={fx.editFixtureHomeAway} setEditFixtureHomeAway={fx.setEditFixtureHomeAway} editFixturePublished={fx.editFixturePublished} setEditFixturePublished={fx.setEditFixturePublished} handleSaveFixture={fx.handleSaveFixture} cancelEditFixture={fx.cancelEditFixture} startEditFixture={fx.startEditFixture} handleDeleteFixture={fx.handleDeleteFixture} moveItem={moveItem} formatDate={formatDate} teamOptions={teamOptions} />}
            {activeTab === 'results' && <ResultsSection results={results} busy={busy} newResultTeam={res.newResultTeam} setNewResultTeam={res.setNewResultTeam} newResultOpponent={res.newResultOpponent} setNewResultOpponent={res.setNewResultOpponent} newResultDate={res.newResultDate} setNewResultDate={res.setNewResultDate} newResultFinalScore={res.newResultFinalScore} setNewResultFinalScore={res.setNewResultFinalScore} newResultGoalScorers={res.newResultGoalScorers} setNewResultGoalScorers={res.setNewResultGoalScorers} newResultPublished={res.newResultPublished} setNewResultPublished={res.setNewResultPublished} handleCreateResult={res.handleCreateResult} editingResultId={res.editingResultId} editResultTeam={res.editResultTeam} setEditResultTeam={res.setEditResultTeam} editResultOpponent={res.editResultOpponent} setEditResultOpponent={res.setEditResultOpponent} editResultDate={res.editResultDate} setEditResultDate={res.setEditResultDate} editResultFinalScore={res.editResultFinalScore} setEditResultFinalScore={res.setEditResultFinalScore} editResultGoalScorers={res.editResultGoalScorers} setEditResultGoalScorers={res.setEditResultGoalScorers} editResultPublished={res.editResultPublished} setEditResultPublished={res.setEditResultPublished} handleSaveResult={res.handleSaveResult} cancelEditResult={res.cancelEditResult} startEditResult={res.startEditResult} handleDeleteResult={res.handleDeleteResult} moveItem={moveItem} formatDate={formatDate} teamOptions={teamOptions} />}
            {activeTab === 'week' && <WeekSection weekPlans={weekPlans} selectedWeekPlan={wk.selectedWeekPlan} selectedWeekItems={wk.selectedWeekItems} busy={busy} selectedWeekPlanId={wk.selectedWeekPlanId} setSelectedWeekPlanId={wk.setSelectedWeekPlanId} newWeekLabel={wk.newWeekLabel} setNewWeekLabel={wk.setNewWeekLabel} newWeekPublished={wk.newWeekPublished} setNewWeekPublished={wk.setNewWeekPublished} handleCreateWeekPlan={wk.handleCreateWeekPlan} newDayLabel={wk.newDayLabel} setNewDayLabel={wk.setNewDayLabel} newWeekItemTitle={wk.newWeekItemTitle} setNewWeekItemTitle={wk.setNewWeekItemTitle} newWeekItemDetails={wk.newWeekItemDetails} setNewWeekItemDetails={wk.setNewWeekItemDetails} handleCreateWeekItem={wk.handleCreateWeekItem} editingWeekPlanId={wk.editingWeekPlanId} editWeekLabel={wk.editWeekLabel} setEditWeekLabel={wk.setEditWeekLabel} editWeekPublished={wk.editWeekPublished} setEditWeekPublished={wk.setEditWeekPublished} handleSaveWeekPlan={wk.handleSaveWeekPlan} cancelEditWeekPlan={wk.cancelEditWeekPlan} startEditWeekPlan={wk.startEditWeekPlan} handleDeleteWeekPlan={wk.handleDeleteWeekPlan} editingWeekItemId={wk.editingWeekItemId} editDayLabel={wk.editDayLabel} setEditDayLabel={wk.setEditDayLabel} editWeekItemTitle={wk.editWeekItemTitle} setEditWeekItemTitle={wk.setEditWeekItemTitle} editWeekItemDetails={wk.editWeekItemDetails} setEditWeekItemDetails={wk.setEditWeekItemDetails} handleSaveWeekItem={wk.handleSaveWeekItem} cancelEditWeekItem={wk.cancelEditWeekItem} startEditWeekItem={wk.startEditWeekItem} handleDeleteWeekItem={wk.handleDeleteWeekItem} moveItem={moveItem} formatDate={formatDate} />}
            {activeTab === 'programs' && <ProgramsSection programs={programs} busy={busy} newProgramTitle={prog.newProgramTitle} setNewProgramTitle={prog.setNewProgramTitle} newProgramCategory={prog.newProgramCategory} setNewProgramCategory={prog.setNewProgramCategory} newProgramDayLabel={prog.newProgramDayLabel} setNewProgramDayLabel={prog.setNewProgramDayLabel} newProgramDetails={prog.newProgramDetails} setNewProgramDetails={prog.setNewProgramDetails} newProgramPublished={prog.newProgramPublished} setNewProgramPublished={prog.setNewProgramPublished} newProgramFile={prog.newProgramFile} setNewProgramFile={prog.setNewProgramFile} handleCreateProgram={prog.handleCreateProgram} editingProgramId={prog.editingProgramId} editProgramTitle={prog.editProgramTitle} setEditProgramTitle={prog.setEditProgramTitle} editProgramCategory={prog.editProgramCategory} setEditProgramCategory={prog.setEditProgramCategory} editProgramDayLabel={prog.editProgramDayLabel} setEditProgramDayLabel={prog.setEditProgramDayLabel} editProgramDetails={prog.editProgramDetails} setEditProgramDetails={prog.setEditProgramDetails} editProgramPublished={prog.editProgramPublished} setEditProgramPublished={prog.setEditProgramPublished} editProgramFile={prog.editProgramFile} setEditProgramFile={prog.setEditProgramFile} handleSaveProgram={prog.handleSaveProgram} resetProgramEditFields={prog.resetProgramEditFields} startEditProgram={prog.startEditProgram} handleDeleteProgram={prog.handleDeleteProgram} moveItem={moveItem} />}
            {activeTab === 'reminders' && <RemindersSection reminders={reminders} busy={busy} newReminderTitle={rem.newReminderTitle} setNewReminderTitle={rem.setNewReminderTitle} newReminderDetails={rem.newReminderDetails} setNewReminderDetails={rem.setNewReminderDetails} newReminderPublished={rem.newReminderPublished} setNewReminderPublished={rem.setNewReminderPublished} handleCreateReminder={rem.handleCreateReminder} editingReminderId={rem.editingReminderId} editReminderTitle={rem.editReminderTitle} setEditReminderTitle={rem.setEditReminderTitle} editReminderDetails={rem.editReminderDetails} setEditReminderDetails={rem.setEditReminderDetails} editReminderPublished={rem.editReminderPublished} setEditReminderPublished={rem.setEditReminderPublished} handleSaveReminder={rem.handleSaveReminder} cancelEditReminder={rem.cancelEditReminder} startEditReminder={rem.startEditReminder} handleDeleteReminder={rem.handleDeleteReminder} moveItem={moveItem} />}
            {activeTab === 'sponsors' && <SponsorsSection sponsors={sponsors} busy={busy} newSponsorName={spon.newSponsorName} setNewSponsorName={spon.setNewSponsorName} newSponsorLink={spon.newSponsorLink} setNewSponsorLink={spon.setNewSponsorLink} newSponsorPublished={spon.newSponsorPublished} setNewSponsorPublished={spon.setNewSponsorPublished} newSponsorImage={spon.newSponsorImage} setNewSponsorImage={spon.setNewSponsorImage} handleCreateSponsor={spon.handleCreateSponsor} editingSponsorId={spon.editingSponsorId} editSponsorName={spon.editSponsorName} setEditSponsorName={spon.setEditSponsorName} editSponsorLink={spon.editSponsorLink} setEditSponsorLink={spon.setEditSponsorLink} editSponsorPublished={spon.editSponsorPublished} setEditSponsorPublished={spon.setEditSponsorPublished} editSponsorImage={spon.editSponsorImage} setEditSponsorImage={spon.setEditSponsorImage} handleSaveSponsor={spon.handleSaveSponsor} resetSponsorEditFields={spon.resetSponsorEditFields} startEditSponsor={spon.startEditSponsor} handleDeleteSponsor={spon.handleDeleteSponsor} moveItem={moveItem} />}
            {activeTab === 'workouts' && <WorkoutProgramsSection programs={workoutPrograms} busy={busy} selectedProgramId={wpAdmin.selectedProgramId} setSelectedProgramId={wpAdmin.setSelectedProgramId} selectedProgram={wpAdmin.selectedProgram} selectedExercises={wpAdmin.selectedExercises} newProgramTitle={wpAdmin.newProgramTitle} setNewProgramTitle={wpAdmin.setNewProgramTitle} newProgramCategory={wpAdmin.newProgramCategory} setNewProgramCategory={wpAdmin.setNewProgramCategory} newProgramSport={wpAdmin.newProgramSport} setNewProgramSport={wpAdmin.setNewProgramSport} handleCreateProgram={wpAdmin.handleCreateProgram} toggleProgramActive={wpAdmin.toggleProgramActive} handleDeleteProgram={wpAdmin.handleDeleteProgram} newExerciseName={wpAdmin.newExerciseName} setNewExerciseName={wpAdmin.setNewExerciseName} newExerciseSets={wpAdmin.newExerciseSets} setNewExerciseSets={wpAdmin.setNewExerciseSets} newExerciseReps={wpAdmin.newExerciseReps} setNewExerciseReps={wpAdmin.setNewExerciseReps} handleAddExercise={wpAdmin.handleAddExercise} editingExerciseId={wpAdmin.editingExerciseId} editExerciseName={wpAdmin.editExerciseName} setEditExerciseName={wpAdmin.setEditExerciseName} editExerciseSets={wpAdmin.editExerciseSets} setEditExerciseSets={wpAdmin.setEditExerciseSets} editExerciseReps={wpAdmin.editExerciseReps} setEditExerciseReps={wpAdmin.setEditExerciseReps} startEditExercise={wpAdmin.startEditExercise} cancelEditExercise={wpAdmin.cancelEditExercise} handleSaveExercise={wpAdmin.handleSaveExercise} handleDeleteExercise={wpAdmin.handleDeleteExercise} />}
            {activeTab === 'spotlight' && <SpotlightSection sport={sport} />}
            {activeTab === 'players' && <PlayerProfilesSection />}
          </div>
        )}
      </div>
    </main>
  );
}