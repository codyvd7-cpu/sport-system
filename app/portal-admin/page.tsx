'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type WeekPlan = {
  id: string;
  created_at: string;
  week_label: string;
  published: boolean;
};

type WeekPlanItem = {
  id: string;
  created_at: string;
  week_plan_id: string;
  day_label: string;
  title: string;
  details: string;
  sort_order: number;
};

type Fixture = {
  id: string;
  created_at: string;
  team: string;
  opponent: string;
  fixture_date: string;
  venue: string;
  is_published: boolean;
  sort_order: number;
};

type Result = {
  id: string;
  created_at: string;
  team: string;
  opponent: string;
  result_date: string;
  score: string;
  summary: string;
  is_published: boolean;
  sort_order: number;
};

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

function normalizeWeekPlan(row: GenericRow): WeekPlan {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at),
    week_label: firstString(row.week_label) || 'Untitled Week',
    published: firstBoolean(row.published),
  };
}

function normalizeWeekPlanItem(row: GenericRow): WeekPlanItem {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at),
    week_plan_id: firstValue(row.week_plan_id),
    day_label: firstString(row.day_label),
    title: firstString(row.title),
    details: firstString(row.details),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeFixture(row: GenericRow): Fixture {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at),
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    fixture_date: firstString(row.fixture_date),
    venue: firstString(row.venue),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeResult(row: GenericRow): Result {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at),
    team: firstString(row.team),
    opponent: firstString(row.opponent),
    result_date: firstString(row.result_date),
    score: firstString(row.score),
    summary: firstString(row.summary),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
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

const DAY_OPTIONS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export default function PortalAdminPage() {
  const [weekPlanRows, setWeekPlanRows] = useState<GenericRow[]>([]);
  const [weekPlanItemRows, setWeekPlanItemRows] = useState<GenericRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<GenericRow[]>([]);
  const [resultRows, setResultRows] = useState<GenericRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [creatingWeekPlan, setCreatingWeekPlan] = useState(false);
  const [newWeekLabel, setNewWeekLabel] = useState('Week at a Glance');
  const [newWeekPublished, setNewWeekPublished] = useState(true);

  const [selectedWeekPlanId, setSelectedWeekPlanId] = useState('');

  const [creatingWeekItem, setCreatingWeekItem] = useState(false);
  const [newDayLabel, setNewDayLabel] = useState('Monday');
  const [newWeekItemTitle, setNewWeekItemTitle] = useState('');
  const [newWeekItemDetails, setNewWeekItemDetails] = useState('');
  const [newWeekItemSortOrder, setNewWeekItemSortOrder] = useState('1');

  const [creatingFixture, setCreatingFixture] = useState(false);
  const [newFixtureTeam, setNewFixtureTeam] = useState('');
  const [newFixtureOpponent, setNewFixtureOpponent] = useState('');
  const [newFixtureDate, setNewFixtureDate] = useState('');
  const [newFixtureVenue, setNewFixtureVenue] = useState('');
  const [newFixturePublished, setNewFixturePublished] = useState(true);
  const [newFixtureSortOrder, setNewFixtureSortOrder] = useState('1');

  const [creatingResult, setCreatingResult] = useState(false);
  const [newResultTeam, setNewResultTeam] = useState('');
  const [newResultOpponent, setNewResultOpponent] = useState('');
  const [newResultDate, setNewResultDate] = useState('');
  const [newResultScore, setNewResultScore] = useState('');
  const [newResultSummary, setNewResultSummary] = useState('');
  const [newResultPublished, setNewResultPublished] = useState(true);
  const [newResultSortOrder, setNewResultSortOrder] = useState('1');

  const [editingWeekPlanId, setEditingWeekPlanId] = useState<string | null>(null);
  const [editWeekLabel, setEditWeekLabel] = useState('');
  const [editWeekPublished, setEditWeekPublished] = useState(true);

  const [editingWeekItemId, setEditingWeekItemId] = useState<string | null>(null);
  const [editDayLabel, setEditDayLabel] = useState('Monday');
  const [editWeekItemTitle, setEditWeekItemTitle] = useState('');
  const [editWeekItemDetails, setEditWeekItemDetails] = useState('');
  const [editWeekItemSortOrder, setEditWeekItemSortOrder] = useState('1');

  const [editingFixtureId, setEditingFixtureId] = useState<string | null>(null);
  const [editFixtureTeam, setEditFixtureTeam] = useState('');
  const [editFixtureOpponent, setEditFixtureOpponent] = useState('');
  const [editFixtureDate, setEditFixtureDate] = useState('');
  const [editFixtureVenue, setEditFixtureVenue] = useState('');
  const [editFixturePublished, setEditFixturePublished] = useState(true);
  const [editFixtureSortOrder, setEditFixtureSortOrder] = useState('1');

  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editResultTeam, setEditResultTeam] = useState('');
  const [editResultOpponent, setEditResultOpponent] = useState('');
  const [editResultDate, setEditResultDate] = useState('');
  const [editResultScore, setEditResultScore] = useState('');
  const [editResultSummary, setEditResultSummary] = useState('');
  const [editResultPublished, setEditResultPublished] = useState(true);
  const [editResultSortOrder, setEditResultSortOrder] = useState('1');

  async function loadPortalAdminData() {
    setLoading(true);
    setError('');

    const [weekPlansRes, weekPlanItemsRes, fixturesRes, resultsRes] = await Promise.all([
      supabase.from('PortalWeekPlan').select('*').order('created_at', { ascending: false }),
      supabase.from('PortalWeekPlanItems').select('*').order('sort_order', { ascending: true }),
      supabase.from('PortalFixtures').select('*').order('fixture_date', { ascending: true }).order('sort_order', { ascending: true }),
      supabase.from('PortalResults').select('*').order('result_date', { ascending: false }).order('sort_order', { ascending: true }),
    ]);

    if (weekPlansRes.error || weekPlanItemsRes.error || fixturesRes.error || resultsRes.error) {
      setError(
        weekPlansRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          'Failed to load portal admin data.'
      );
      setLoading(false);
      return;
    }

    setWeekPlanRows((weekPlansRes.data as GenericRow[]) || []);
    setWeekPlanItemRows((weekPlanItemsRes.data as GenericRow[]) || []);
    setFixtureRows((fixturesRes.data as GenericRow[]) || []);
    setResultRows((resultsRes.data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadPortalAdminData();
  }, []);

  const weekPlans = useMemo(
    () => weekPlanRows.map(normalizeWeekPlan).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [weekPlanRows]
  );

  const weekPlanItems = useMemo(
    () => weekPlanItemRows.map(normalizeWeekPlanItem).sort((a, b) => a.sort_order - b.sort_order),
    [weekPlanItemRows]
  );

  const fixtures = useMemo(
    () => fixtureRows.map(normalizeFixture).sort((a, b) => new Date(a.fixture_date).getTime() - new Date(b.fixture_date).getTime() || a.sort_order - b.sort_order),
    [fixtureRows]
  );

  const results = useMemo(
    () => resultRows.map(normalizeResult).sort((a, b) => new Date(b.result_date).getTime() - new Date(a.result_date).getTime() || a.sort_order - b.sort_order),
    [resultRows]
  );

  const selectedWeekPlan = useMemo(() => {
    if (!selectedWeekPlanId && weekPlans.length > 0) return weekPlans[0];
    return weekPlans.find((plan) => plan.id === selectedWeekPlanId) || null;
  }, [selectedWeekPlanId, weekPlans]);

  useEffect(() => {
    if (!selectedWeekPlanId && weekPlans.length > 0) {
      setSelectedWeekPlanId(weekPlans[0].id);
    }
  }, [selectedWeekPlanId, weekPlans]);

  const selectedWeekItems = useMemo(() => {
    if (!selectedWeekPlan) return [];
    return weekPlanItems
      .filter((item) => item.week_plan_id === selectedWeekPlan.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedWeekPlan, weekPlanItems]);

  async function handleCreateWeekPlan(e: React.FormEvent) {
    e.preventDefault();
    setCreatingWeekPlan(true);
    setError('');
    setSuccessMessage('');

    if (!newWeekLabel.trim()) {
      setError('Week label is required.');
      setCreatingWeekPlan(false);
      return;
    }

    const { error: insertError } = await supabase.from('PortalWeekPlan').insert([
      {
        week_label: newWeekLabel.trim(),
        published: newWeekPublished,
      },
    ]);

    if (insertError) {
      setError(insertError.message || 'Failed to create week plan.');
      setCreatingWeekPlan(false);
      return;
    }

    setNewWeekLabel('Week at a Glance');
    setNewWeekPublished(true);
    setSuccessMessage('Week plan created.');
    await loadPortalAdminData();
    setCreatingWeekPlan(false);
  }

  async function handleCreateWeekItem(e: React.FormEvent) {
    e.preventDefault();
    setCreatingWeekItem(true);
    setError('');
    setSuccessMessage('');

    if (!selectedWeekPlan) {
      setError('Select a week plan first.');
      setCreatingWeekItem(false);
      return;
    }

    if (!newWeekItemTitle.trim()) {
      setError('Week item title is required.');
      setCreatingWeekItem(false);
      return;
    }

    const { error: insertError } = await supabase.from('PortalWeekPlanItems').insert([
      {
        week_plan_id: selectedWeekPlan.id,
        day_label: newDayLabel,
        title: newWeekItemTitle.trim(),
        details: newWeekItemDetails.trim(),
        sort_order: Number(newWeekItemSortOrder) || 0,
      },
    ]);

    if (insertError) {
      setError(insertError.message || 'Failed to create week plan item.');
      setCreatingWeekItem(false);
      return;
    }

    setNewDayLabel('Monday');
    setNewWeekItemTitle('');
    setNewWeekItemDetails('');
    setNewWeekItemSortOrder(String(selectedWeekItems.length + 1));
    setSuccessMessage('Week item created.');
    await loadPortalAdminData();
    setCreatingWeekItem(false);
  }

  async function handleCreateFixture(e: React.FormEvent) {
    e.preventDefault();
    setCreatingFixture(true);
    setError('');
    setSuccessMessage('');

    if (!newFixtureTeam.trim() || !newFixtureOpponent.trim() || !newFixtureDate) {
      setError('Team, opponent, and fixture date are required.');
      setCreatingFixture(false);
      return;
    }

    const { error: insertError } = await supabase.from('PortalFixtures').insert([
      {
        team: newFixtureTeam.trim(),
        opponent: newFixtureOpponent.trim(),
        fixture_date: newFixtureDate,
        venue: newFixtureVenue.trim(),
        is_published: newFixturePublished,
        sort_order: Number(newFixtureSortOrder) || 0,
      },
    ]);

    if (insertError) {
      setError(insertError.message || 'Failed to create fixture.');
      setCreatingFixture(false);
      return;
    }

    setNewFixtureTeam('');
    setNewFixtureOpponent('');
    setNewFixtureDate('');
    setNewFixtureVenue('');
    setNewFixturePublished(true);
    setNewFixtureSortOrder('1');
    setSuccessMessage('Fixture created.');
    await loadPortalAdminData();
    setCreatingFixture(false);
  }

  async function handleCreateResult(e: React.FormEvent) {
    e.preventDefault();
    setCreatingResult(true);
    setError('');
    setSuccessMessage('');

    if (!newResultTeam.trim() || !newResultOpponent.trim() || !newResultDate || !newResultScore.trim()) {
      setError('Team, opponent, result date, and score are required.');
      setCreatingResult(false);
      return;
    }

    const { error: insertError } = await supabase.from('PortalResults').insert([
      {
        team: newResultTeam.trim(),
        opponent: newResultOpponent.trim(),
        result_date: newResultDate,
        score: newResultScore.trim(),
        summary: newResultSummary.trim(),
        is_published: newResultPublished,
        sort_order: Number(newResultSortOrder) || 0,
      },
    ]);

    if (insertError) {
      setError(insertError.message || 'Failed to create result.');
      setCreatingResult(false);
      return;
    }

    setNewResultTeam('');
    setNewResultOpponent('');
    setNewResultDate('');
    setNewResultScore('');
    setNewResultSummary('');
    setNewResultPublished(true);
    setNewResultSortOrder('1');
    setSuccessMessage('Result created.');
    await loadPortalAdminData();
    setCreatingResult(false);
  }

  function startEditWeekPlan(plan: WeekPlan) {
    setEditingWeekPlanId(plan.id);
    setEditWeekLabel(plan.week_label);
    setEditWeekPublished(plan.published);
  }

  function cancelEditWeekPlan() {
    setEditingWeekPlanId(null);
    setEditWeekLabel('');
    setEditWeekPublished(true);
  }

  async function handleSaveWeekPlan(id: string) {
    setError('');
    setSuccessMessage('');

    if (!editWeekLabel.trim()) {
      setError('Week label is required.');
      return;
    }

    const { error: updateError } = await supabase
      .from('PortalWeekPlan')
      .update({
        week_label: editWeekLabel.trim(),
        published: editWeekPublished,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message || 'Failed to update week plan.');
      return;
    }

    setSuccessMessage('Week plan updated.');
    cancelEditWeekPlan();
    await loadPortalAdminData();
  }

  async function handleDeleteWeekPlan(id: string) {
    const confirmed = window.confirm('Delete this week plan and all of its items?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error: deleteError } = await supabase.from('PortalWeekPlan').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete week plan.');
      return;
    }

    setSuccessMessage('Week plan deleted.');
    await loadPortalAdminData();
  }

  function startEditWeekItem(item: WeekPlanItem) {
    setEditingWeekItemId(item.id);
    setEditDayLabel(item.day_label || 'Monday');
    setEditWeekItemTitle(item.title);
    setEditWeekItemDetails(item.details);
    setEditWeekItemSortOrder(String(item.sort_order));
  }

  function cancelEditWeekItem() {
    setEditingWeekItemId(null);
    setEditDayLabel('Monday');
    setEditWeekItemTitle('');
    setEditWeekItemDetails('');
    setEditWeekItemSortOrder('1');
  }

  async function handleSaveWeekItem(id: string) {
    setError('');
    setSuccessMessage('');

    if (!editWeekItemTitle.trim()) {
      setError('Week item title is required.');
      return;
    }

    const { error: updateError } = await supabase
      .from('PortalWeekPlanItems')
      .update({
        day_label: editDayLabel,
        title: editWeekItemTitle.trim(),
        details: editWeekItemDetails.trim(),
        sort_order: Number(editWeekItemSortOrder) || 0,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message || 'Failed to update week item.');
      return;
    }

    setSuccessMessage('Week item updated.');
    cancelEditWeekItem();
    await loadPortalAdminData();
  }

  async function handleDeleteWeekItem(id: string) {
    const confirmed = window.confirm('Delete this week item?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error: deleteError } = await supabase.from('PortalWeekPlanItems').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete week item.');
      return;
    }

    setSuccessMessage('Week item deleted.');
    await loadPortalAdminData();
  }

  function startEditFixture(fixture: Fixture) {
    setEditingFixtureId(fixture.id);
    setEditFixtureTeam(fixture.team);
    setEditFixtureOpponent(fixture.opponent);
    setEditFixtureDate(fixture.fixture_date);
    setEditFixtureVenue(fixture.venue);
    setEditFixturePublished(fixture.is_published);
    setEditFixtureSortOrder(String(fixture.sort_order));
  }

  function cancelEditFixture() {
    setEditingFixtureId(null);
    setEditFixtureTeam('');
    setEditFixtureOpponent('');
    setEditFixtureDate('');
    setEditFixtureVenue('');
    setEditFixturePublished(true);
    setEditFixtureSortOrder('1');
  }

  async function handleSaveFixture(id: string) {
    setError('');
    setSuccessMessage('');

    if (!editFixtureTeam.trim() || !editFixtureOpponent.trim() || !editFixtureDate) {
      setError('Team, opponent, and fixture date are required.');
      return;
    }

    const { error: updateError } = await supabase
      .from('PortalFixtures')
      .update({
        team: editFixtureTeam.trim(),
        opponent: editFixtureOpponent.trim(),
        fixture_date: editFixtureDate,
        venue: editFixtureVenue.trim(),
        is_published: editFixturePublished,
        sort_order: Number(editFixtureSortOrder) || 0,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message || 'Failed to update fixture.');
      return;
    }

    setSuccessMessage('Fixture updated.');
    cancelEditFixture();
    await loadPortalAdminData();
  }

  async function handleDeleteFixture(id: string) {
    const confirmed = window.confirm('Delete this fixture?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error: deleteError } = await supabase.from('PortalFixtures').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete fixture.');
      return;
    }

    setSuccessMessage('Fixture deleted.');
    await loadPortalAdminData();
  }

  function startEditResult(result: Result) {
    setEditingResultId(result.id);
    setEditResultTeam(result.team);
    setEditResultOpponent(result.opponent);
    setEditResultDate(result.result_date);
    setEditResultScore(result.score);
    setEditResultSummary(result.summary);
    setEditResultPublished(result.is_published);
    setEditResultSortOrder(String(result.sort_order));
  }

  function cancelEditResult() {
    setEditingResultId(null);
    setEditResultTeam('');
    setEditResultOpponent('');
    setEditResultDate('');
    setEditResultScore('');
    setEditResultSummary('');
    setEditResultPublished(true);
    setEditResultSortOrder('1');
  }

  async function handleSaveResult(id: string) {
    setError('');
    setSuccessMessage('');

    if (!editResultTeam.trim() || !editResultOpponent.trim() || !editResultDate || !editResultScore.trim()) {
      setError('Team, opponent, result date, and score are required.');
      return;
    }

    const { error: updateError } = await supabase
      .from('PortalResults')
      .update({
        team: editResultTeam.trim(),
        opponent: editResultOpponent.trim(),
        result_date: editResultDate,
        score: editResultScore.trim(),
        summary: editResultSummary.trim(),
        is_published: editResultPublished,
        sort_order: Number(editResultSortOrder) || 0,
      })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message || 'Failed to update result.');
      return;
    }

    setSuccessMessage('Result updated.');
    cancelEditResult();
    await loadPortalAdminData();
  }

  async function handleDeleteResult(id: string) {
    const confirmed = window.confirm('Delete this result?');
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error: deleteError } = await supabase.from('PortalResults').delete().eq('id', id);

    if (deleteError) {
      setError(deleteError.message || 'Failed to delete result.');
      return;
    }

    setSuccessMessage('Result deleted.');
    await loadPortalAdminData();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Portal Management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Portal Admin</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage the public parent and player portal content: weekly plans, fixtures, and results.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/portal"
              className="rounded-xl border border-emerald-500 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20"
            >
              Open Public Portal
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Back to Coach Dashboard
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
            Loading portal admin...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Create Week Plan</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Create a new public week structure.
                  </p>
                </div>

                <form onSubmit={handleCreateWeekPlan} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Week Label</label>
                    <input
                      value={newWeekLabel}
                      onChange={(e) => setNewWeekLabel(e.target.value)}
                      placeholder="e.g. Week at a Glance"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={newWeekPublished}
                      onChange={(e) => setNewWeekPublished(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Publish immediately
                  </label>

                  <button
                    type="submit"
                    disabled={creatingWeekPlan}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingWeekPlan ? 'Creating...' : 'Create Week Plan'}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Create Week Plan Item</h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Add daily content under the selected week plan.
                  </p>
                </div>

                <form onSubmit={handleCreateWeekItem} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Week Plan</label>
                    <select
                      value={selectedWeekPlanId}
                      onChange={(e) => setSelectedWeekPlanId(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    >
                      {weekPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.week_label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Day</label>
                      <select
                        value={newDayLabel}
                        onChange={(e) => setNewDayLabel(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      >
                        {DAY_OPTIONS.map((day) => (
                          <option key={day} value={day}>
                            {day}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                      <input
                        type="number"
                        value={newWeekItemSortOrder}
                        onChange={(e) => setNewWeekItemSortOrder(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                    <input
                      value={newWeekItemTitle}
                      onChange={(e) => setNewWeekItemTitle(e.target.value)}
                      placeholder="e.g. Match Preparation"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Details</label>
                    <textarea
                      rows={3}
                      value={newWeekItemDetails}
                      onChange={(e) => setNewWeekItemDetails(e.target.value)}
                      placeholder="Optional extra details"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creatingWeekItem}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creatingWeekItem ? 'Creating...' : 'Add Week Item'}
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Week Plans</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Edit or delete public week plans.
                </p>
              </div>

              {weekPlans.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No week plans yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {weekPlans.map((plan) => {
                    const isEditing = editingWeekPlanId === plan.id;

                    return (
                      <div key={plan.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Week Label</label>
                              <input
                                value={editWeekLabel}
                                onChange={(e) => setEditWeekLabel(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                              <input
                                type="checkbox"
                                checked={editWeekPublished}
                                onChange={(e) => setEditWeekPublished(e.target.checked)}
                                className="h-4 w-4"
                              />
                              Published
                            </label>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleSaveWeekPlan(plan.id)}
                                className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditWeekPlan}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">{plan.week_label}</p>
                              <p className="mt-1 text-sm text-slate-400">
                                Created {formatDate(plan.created_at)} • {plan.published ? 'Published' : 'Draft'}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => startEditWeekPlan(plan)}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWeekPlan(plan.id)}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">Week Plan Items</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Edit the daily week items under the selected plan.
                </p>
              </div>

              {selectedWeekItems.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No items under this week plan yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedWeekItems.map((item) => {
                    const isEditing = editingWeekItemId === item.id;

                    return (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                        {isEditing ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Day</label>
                                <select
                                  value={editDayLabel}
                                  onChange={(e) => setEditDayLabel(e.target.value)}
                                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                >
                                  {DAY_OPTIONS.map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                                <input
                                  type="number"
                                  value={editWeekItemSortOrder}
                                  onChange={(e) => setEditWeekItemSortOrder(e.target.value)}
                                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                              <input
                                value={editWeekItemTitle}
                                onChange={(e) => setEditWeekItemTitle(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div>
                              <label className="mb-2 block text-sm font-medium text-slate-200">Details</label>
                              <textarea
                                rows={3}
                                value={editWeekItemDetails}
                                onChange={(e) => setEditWeekItemDetails(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleSaveWeekItem(item.id)}
                                className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                              >
                                Save
                              </button>
                              <button
                                onClick={cancelEditWeekItem}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {item.sort_order}. {item.day_label} • {item.title}
                              </p>
                              <p className="mt-1 text-sm text-slate-400">{item.details || 'No details'}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => startEditWeekItem(item)}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteWeekItem(item.id)}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Create Fixture</h2>
                  <p className="mt-1 text-sm text-slate-400">Add a new portal fixture.</p>
                </div>

                <form onSubmit={handleCreateFixture} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
                      <input
                        value={newFixtureTeam}
                        onChange={(e) => setNewFixtureTeam(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Opponent</label>
                      <input
                        value={newFixtureOpponent}
                        onChange={(e) => setNewFixtureOpponent(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                      <input
                        type="date"
                        value={newFixtureDate}
                        onChange={(e) => setNewFixtureDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Venue</label>
                      <input
                        value={newFixtureVenue}
                        onChange={(e) => setNewFixtureVenue(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                      <input
                        type="number"
                        value={newFixtureSortOrder}
                        onChange={(e) => setNewFixtureSortOrder(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={newFixturePublished}
                      onChange={(e) => setNewFixturePublished(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Publish fixture
                  </label>

                  <button
                    type="submit"
                    disabled={creatingFixture}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    {creatingFixture ? 'Creating...' : 'Create Fixture'}
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Create Result</h2>
                  <p className="mt-1 text-sm text-slate-400">Add a new portal result.</p>
                </div>

                <form onSubmit={handleCreateResult} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
                      <input
                        value={newResultTeam}
                        onChange={(e) => setNewResultTeam(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Opponent</label>
                      <input
                        value={newResultOpponent}
                        onChange={(e) => setNewResultOpponent(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Date</label>
                      <input
                        type="date"
                        value={newResultDate}
                        onChange={(e) => setNewResultDate(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Score</label>
                      <input
                        value={newResultScore}
                        onChange={(e) => setNewResultScore(e.target.value)}
                        placeholder="e.g. 3 - 1 W"
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                      <input
                        type="number"
                        value={newResultSortOrder}
                        onChange={(e) => setNewResultSortOrder(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Summary</label>
                    <textarea
                      rows={3}
                      value={newResultSummary}
                      onChange={(e) => setNewResultSummary(e.target.value)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={newResultPublished}
                      onChange={(e) => setNewResultPublished(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Publish result
                  </label>

                  <button
                    type="submit"
                    disabled={creatingResult}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    {creatingResult ? 'Creating...' : 'Create Result'}
                  </button>
                </form>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Fixtures</h2>
                  <p className="mt-1 text-sm text-slate-400">Edit or remove published fixtures.</p>
                </div>

                {fixtures.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No fixtures yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {fixtures.map((fixture) => {
                      const isEditing = editingFixtureId === fixture.id;

                      return (
                        <div key={fixture.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input
                                  value={editFixtureTeam}
                                  onChange={(e) => setEditFixtureTeam(e.target.value)}
                                  placeholder="Team"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  value={editFixtureOpponent}
                                  onChange={(e) => setEditFixtureOpponent(e.target.value)}
                                  placeholder="Opponent"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <input
                                  type="date"
                                  value={editFixtureDate}
                                  onChange={(e) => setEditFixtureDate(e.target.value)}
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  value={editFixtureVenue}
                                  onChange={(e) => setEditFixtureVenue(e.target.value)}
                                  placeholder="Venue"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  type="number"
                                  value={editFixtureSortOrder}
                                  onChange={(e) => setEditFixtureSortOrder(e.target.value)}
                                  placeholder="Sort"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={editFixturePublished}
                                  onChange={(e) => setEditFixturePublished(e.target.checked)}
                                  className="h-4 w-4"
                                />
                                Published
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveFixture(fixture.id)}
                                  className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditFixture}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {fixture.team} vs {fixture.opponent}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  {formatDate(fixture.fixture_date)} • {fixture.venue || 'Venue TBC'} • {fixture.is_published ? 'Published' : 'Draft'}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => startEditFixture(fixture)}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteFixture(fixture.id)}
                                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Results</h2>
                  <p className="mt-1 text-sm text-slate-400">Edit or remove public results.</p>
                </div>

                {results.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No results yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {results.map((result) => {
                      const isEditing = editingResultId === result.id;

                      return (
                        <div key={result.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <input
                                  value={editResultTeam}
                                  onChange={(e) => setEditResultTeam(e.target.value)}
                                  placeholder="Team"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  value={editResultOpponent}
                                  onChange={(e) => setEditResultOpponent(e.target.value)}
                                  placeholder="Opponent"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <input
                                  type="date"
                                  value={editResultDate}
                                  onChange={(e) => setEditResultDate(e.target.value)}
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  value={editResultScore}
                                  onChange={(e) => setEditResultScore(e.target.value)}
                                  placeholder="Score"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                                <input
                                  type="number"
                                  value={editResultSortOrder}
                                  onChange={(e) => setEditResultSortOrder(e.target.value)}
                                  placeholder="Sort"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <textarea
                                rows={3}
                                value={editResultSummary}
                                onChange={(e) => setEditResultSummary(e.target.value)}
                                placeholder="Summary"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />

                              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={editResultPublished}
                                  onChange={(e) => setEditResultPublished(e.target.checked)}
                                  className="h-4 w-4"
                                />
                                Published
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveResult(result.id)}
                                  className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditResult}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">
                                  {result.team} vs {result.opponent}
                                </p>
                                <p className="mt-1 text-sm text-slate-400">
                                  {formatDate(result.result_date)} • {result.score} • {result.is_published ? 'Published' : 'Draft'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{result.summary || 'No summary'}</p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => startEditResult(result)}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteResult(result.id)}
                                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}