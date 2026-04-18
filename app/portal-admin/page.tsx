'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type WeekPlan = {
  id: string;
  created_at: string | null;
  week_label: string;
  published: boolean;
};

type WeekPlanItem = {
  id: string;
  created_at: string | null;
  week_plan_id: string;
  day_label: string;
  title: string;
  details: string;
  sort_order: number;
};

type Reminder = {
  id: string;
  created_at: string | null;
  title: string;
  details: string;
  is_published: boolean;
  sort_order: number;
};

type Fixture = {
  id: string;
  created_at: string | null;
  team: string;
  opponent: string;
  fixture_date: string;
  venue: string;
  is_published: boolean;
  sort_order: number;
};

type Result = {
  id: string;
  created_at: string | null;
  team: string;
  opponent: string;
  result_date: string;
  final_score: string;
  goal_scorers: string;
  is_published: boolean;
  sort_order: number;
};

type Program = {
  id: string;
  created_at: string | null;
  title: string;
  category: string;
  day_label: string;
  details: string;
  is_published: boolean;
  sort_order: number;
};

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const PROGRAM_CATEGORIES = ['Gym', 'Mobility', 'Recovery'];

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
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    week_label: firstString(row.week_label) || 'Week at a Glance',
    published: firstBoolean(row.published),
  };
}

function normalizeWeekPlanItem(row: GenericRow): WeekPlanItem {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
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
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

function normalizeFixture(row: GenericRow): Fixture {
  return {
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
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
    id: firstValue(row.id, crypto.randomUUID()),
    created_at: firstString(row.created_at) || null,
    title: firstString(row.title),
    category: firstString(row.category) || 'Gym',
    day_label: firstString(row.day_label),
    details: firstString(row.details),
    is_published: firstBoolean(row.is_published),
    sort_order: firstNumber(row.sort_order),
  };
}

export default function PortalAdminPage() {
  const [weekPlanRows, setWeekPlanRows] = useState<GenericRow[]>([]);
  const [weekPlanItemRows, setWeekPlanItemRows] = useState<GenericRow[]>([]);
  const [reminderRows, setReminderRows] = useState<GenericRow[]>([]);
  const [fixtureRows, setFixtureRows] = useState<GenericRow[]>([]);
  const [resultRows, setResultRows] = useState<GenericRow[]>([]);
  const [programRows, setProgramRows] = useState<GenericRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [selectedWeekPlanId, setSelectedWeekPlanId] = useState('');

  const [newWeekLabel, setNewWeekLabel] = useState('Week at a Glance');
  const [newWeekPublished, setNewWeekPublished] = useState(true);

  const [newDayLabel, setNewDayLabel] = useState('Monday');
  const [newWeekItemTitle, setNewWeekItemTitle] = useState('');
  const [newWeekItemDetails, setNewWeekItemDetails] = useState('');
  const [newWeekItemSortOrder, setNewWeekItemSortOrder] = useState('1');

  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDetails, setNewReminderDetails] = useState('');
  const [newReminderPublished, setNewReminderPublished] = useState(true);
  const [newReminderSortOrder, setNewReminderSortOrder] = useState('1');

  const [newFixtureTeam, setNewFixtureTeam] = useState('');
  const [newFixtureOpponent, setNewFixtureOpponent] = useState('');
  const [newFixtureDate, setNewFixtureDate] = useState('');
  const [newFixtureVenue, setNewFixtureVenue] = useState('');
  const [newFixturePublished, setNewFixturePublished] = useState(true);
  const [newFixtureSortOrder, setNewFixtureSortOrder] = useState('1');

  const [newResultTeam, setNewResultTeam] = useState('');
  const [newResultOpponent, setNewResultOpponent] = useState('');
  const [newResultDate, setNewResultDate] = useState('');
  const [newResultFinalScore, setNewResultFinalScore] = useState('');
  const [newResultGoalScorers, setNewResultGoalScorers] = useState('');
  const [newResultPublished, setNewResultPublished] = useState(true);
  const [newResultSortOrder, setNewResultSortOrder] = useState('1');

  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramCategory, setNewProgramCategory] = useState('Gym');
  const [newProgramDayLabel, setNewProgramDayLabel] = useState('Monday');
  const [newProgramDetails, setNewProgramDetails] = useState('');
  const [newProgramPublished, setNewProgramPublished] = useState(true);
  const [newProgramSortOrder, setNewProgramSortOrder] = useState('1');

  const [editingWeekPlanId, setEditingWeekPlanId] = useState<string | null>(null);
  const [editWeekLabel, setEditWeekLabel] = useState('');
  const [editWeekPublished, setEditWeekPublished] = useState(true);

  const [editingWeekItemId, setEditingWeekItemId] = useState<string | null>(null);
  const [editDayLabel, setEditDayLabel] = useState('Monday');
  const [editWeekItemTitle, setEditWeekItemTitle] = useState('');
  const [editWeekItemDetails, setEditWeekItemDetails] = useState('');
  const [editWeekItemSortOrder, setEditWeekItemSortOrder] = useState('1');

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderTitle, setEditReminderTitle] = useState('');
  const [editReminderDetails, setEditReminderDetails] = useState('');
  const [editReminderPublished, setEditReminderPublished] = useState(true);
  const [editReminderSortOrder, setEditReminderSortOrder] = useState('1');

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
  const [editResultFinalScore, setEditResultFinalScore] = useState('');
  const [editResultGoalScorers, setEditResultGoalScorers] = useState('');
  const [editResultPublished, setEditResultPublished] = useState(true);
  const [editResultSortOrder, setEditResultSortOrder] = useState('1');

  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [editProgramTitle, setEditProgramTitle] = useState('');
  const [editProgramCategory, setEditProgramCategory] = useState('Gym');
  const [editProgramDayLabel, setEditProgramDayLabel] = useState('Monday');
  const [editProgramDetails, setEditProgramDetails] = useState('');
  const [editProgramPublished, setEditProgramPublished] = useState(true);
  const [editProgramSortOrder, setEditProgramSortOrder] = useState('1');

  async function loadPortalAdminData() {
    setLoading(true);
    setError('');

    const [weekPlansRes, weekPlanItemsRes, remindersRes, fixturesRes, resultsRes, programsRes] =
      await Promise.all([
        supabase.from('PortalWeekPlan').select('*').order('created_at', { ascending: false }),
        supabase.from('PortalWeekPlanItems').select('*').order('sort_order', { ascending: true }),
        supabase.from('PortalReminders').select('*').order('sort_order', { ascending: true }),
        supabase
          .from('PortalFixtures')
          .select('*')
          .order('fixture_date', { ascending: true })
          .order('sort_order', { ascending: true }),
        supabase
          .from('PortalResults')
          .select('*')
          .order('result_date', { ascending: false })
          .order('sort_order', { ascending: true }),
        supabase.from('PortalPrograms').select('*').order('sort_order', { ascending: true }),
      ]);

    if (
      weekPlansRes.error ||
      weekPlanItemsRes.error ||
      remindersRes.error ||
      fixturesRes.error ||
      resultsRes.error ||
      programsRes.error
    ) {
      setError(
        weekPlansRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          remindersRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          programsRes.error?.message ||
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
    setLoading(false);
  }

  useEffect(() => {
    loadPortalAdminData();
  }, []);

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

  useEffect(() => {
    if (!selectedWeekPlanId && weekPlans.length > 0) {
      setSelectedWeekPlanId(weekPlans[0].id);
    }
  }, [selectedWeekPlanId, weekPlans]);

  const selectedWeekPlan = useMemo(() => {
    if (!selectedWeekPlanId && weekPlans.length > 0) return weekPlans[0];
    return weekPlans.find((plan) => plan.id === selectedWeekPlanId) || null;
  }, [selectedWeekPlanId, weekPlans]);

  const selectedWeekItems = useMemo(() => {
    if (!selectedWeekPlan) return [];
    return weekPlanItems
      .filter((item) => item.week_plan_id === selectedWeekPlan.id)
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedWeekPlan, weekPlanItems]);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setError('');
    setSuccessMessage('');
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateWeekPlan(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newWeekLabel.trim()) {
        setError('Week label is required.');
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
        return;
      }

      setNewWeekLabel('Week at a Glance');
      setNewWeekPublished(true);
      setSuccessMessage('Week plan created.');
      await loadPortalAdminData();
    });
  }

  async function handleCreateWeekItem(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!selectedWeekPlan) {
        setError('Select a week plan first.');
        return;
      }
      if (!newWeekItemTitle.trim()) {
        setError('Week item title is required.');
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
        setError(insertError.message || 'Failed to create week item.');
        return;
      }

      setNewDayLabel('Monday');
      setNewWeekItemTitle('');
      setNewWeekItemDetails('');
      setNewWeekItemSortOrder(String(selectedWeekItems.length + 1));
      setSuccessMessage('Week item created.');
      await loadPortalAdminData();
    });
  }

  async function handleCreateReminder(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newReminderTitle.trim()) {
        setError('Reminder title is required.');
        return;
      }

      const { error: insertError } = await supabase.from('PortalReminders').insert([
        {
          title: newReminderTitle.trim(),
          details: newReminderDetails.trim(),
          is_published: newReminderPublished,
          sort_order: Number(newReminderSortOrder) || 0,
        },
      ]);

      if (insertError) {
        setError(insertError.message || 'Failed to create reminder.');
        return;
      }

      setNewReminderTitle('');
      setNewReminderDetails('');
      setNewReminderPublished(true);
      setNewReminderSortOrder(String(reminders.length + 1));
      setSuccessMessage('Reminder created.');
      await loadPortalAdminData();
    });
  }

  async function handleCreateFixture(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newFixtureTeam.trim() || !newFixtureOpponent.trim() || !newFixtureDate) {
        setError('Team, opponent, and fixture date are required.');
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
    });
  }

  async function handleCreateResult(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newResultTeam.trim() || !newResultOpponent.trim() || !newResultDate || !newResultFinalScore.trim()) {
        setError('Team, opponent, result date, and final score are required.');
        return;
      }

      const { error: insertError } = await supabase.from('PortalResults').insert([
        {
          team: newResultTeam.trim(),
          opponent: newResultOpponent.trim(),
          result_date: newResultDate,
          final_score: newResultFinalScore.trim(),
          goal_scorers: newResultGoalScorers.trim(),
          is_published: newResultPublished,
          sort_order: Number(newResultSortOrder) || 0,
        },
      ]);

      if (insertError) {
        setError(insertError.message || 'Failed to create result.');
        return;
      }

      setNewResultTeam('');
      setNewResultOpponent('');
      setNewResultDate('');
      setNewResultFinalScore('');
      setNewResultGoalScorers('');
      setNewResultPublished(true);
      setNewResultSortOrder('1');
      setSuccessMessage('Result created.');
      await loadPortalAdminData();
    });
  }

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (programs.length >= 4) {
        setError('Maximum 4 programs at a time. Delete one first if you want another.');
        return;
      }
      if (!newProgramTitle.trim()) {
        setError('Program title is required.');
        return;
      }

      const { error: insertError } = await supabase.from('PortalPrograms').insert([
        {
          title: newProgramTitle.trim(),
          category: newProgramCategory,
          day_label: newProgramDayLabel,
          details: newProgramDetails.trim(),
          is_published: newProgramPublished,
          sort_order: Number(newProgramSortOrder) || 0,
        },
      ]);

      if (insertError) {
        setError(insertError.message || 'Failed to create program.');
        return;
      }

      setNewProgramTitle('');
      setNewProgramCategory('Gym');
      setNewProgramDayLabel('Monday');
      setNewProgramDetails('');
      setNewProgramPublished(true);
      setNewProgramSortOrder(String(programs.length + 1));
      setSuccessMessage('Program created.');
      await loadPortalAdminData();
    });
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
    await runAction(async () => {
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
    });
  }

  async function handleDeleteWeekPlan(id: string) {
    const confirmed = window.confirm('Delete this week plan and all its items?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalWeekPlan').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete week plan.');
        return;
      }

      setSuccessMessage('Week plan deleted.');
      await loadPortalAdminData();
    });
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
    await runAction(async () => {
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
    });
  }

  async function handleDeleteWeekItem(id: string) {
    const confirmed = window.confirm('Delete this week item?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalWeekPlanItems').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete week item.');
        return;
      }

      setSuccessMessage('Week item deleted.');
      await loadPortalAdminData();
    });
  }

  function startEditReminder(reminder: Reminder) {
    setEditingReminderId(reminder.id);
    setEditReminderTitle(reminder.title);
    setEditReminderDetails(reminder.details);
    setEditReminderPublished(reminder.is_published);
    setEditReminderSortOrder(String(reminder.sort_order));
  }

  function cancelEditReminder() {
    setEditingReminderId(null);
    setEditReminderTitle('');
    setEditReminderDetails('');
    setEditReminderPublished(true);
    setEditReminderSortOrder('1');
  }

  async function handleSaveReminder(id: string) {
    await runAction(async () => {
      if (!editReminderTitle.trim()) {
        setError('Reminder title is required.');
        return;
      }

      const { error: updateError } = await supabase
        .from('PortalReminders')
        .update({
          title: editReminderTitle.trim(),
          details: editReminderDetails.trim(),
          is_published: editReminderPublished,
          sort_order: Number(editReminderSortOrder) || 0,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message || 'Failed to update reminder.');
        return;
      }

      setSuccessMessage('Reminder updated.');
      cancelEditReminder();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteReminder(id: string) {
    const confirmed = window.confirm('Delete this reminder?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalReminders').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete reminder.');
        return;
      }

      setSuccessMessage('Reminder deleted.');
      await loadPortalAdminData();
    });
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
    await runAction(async () => {
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
    });
  }

  async function handleDeleteFixture(id: string) {
    const confirmed = window.confirm('Delete this fixture?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalFixtures').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete fixture.');
        return;
      }

      setSuccessMessage('Fixture deleted.');
      await loadPortalAdminData();
    });
  }

  function startEditResult(result: Result) {
    setEditingResultId(result.id);
    setEditResultTeam(result.team);
    setEditResultOpponent(result.opponent);
    setEditResultDate(result.result_date);
    setEditResultFinalScore(result.final_score);
    setEditResultGoalScorers(result.goal_scorers);
    setEditResultPublished(result.is_published);
    setEditResultSortOrder(String(result.sort_order));
  }

  function cancelEditResult() {
    setEditingResultId(null);
    setEditResultTeam('');
    setEditResultOpponent('');
    setEditResultDate('');
    setEditResultFinalScore('');
    setEditResultGoalScorers('');
    setEditResultPublished(true);
    setEditResultSortOrder('1');
  }

  async function handleSaveResult(id: string) {
    await runAction(async () => {
      if (!editResultTeam.trim() || !editResultOpponent.trim() || !editResultDate || !editResultFinalScore.trim()) {
        setError('Team, opponent, result date, and final score are required.');
        return;
      }

      const { error: updateError } = await supabase
        .from('PortalResults')
        .update({
          team: editResultTeam.trim(),
          opponent: editResultOpponent.trim(),
          result_date: editResultDate,
          final_score: editResultFinalScore.trim(),
          goal_scorers: editResultGoalScorers.trim(),
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
    });
  }

  async function handleDeleteResult(id: string) {
    const confirmed = window.confirm('Delete this result?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalResults').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete result.');
        return;
      }

      setSuccessMessage('Result deleted.');
      await loadPortalAdminData();
    });
  }

  function startEditProgram(program: Program) {
    setEditingProgramId(program.id);
    setEditProgramTitle(program.title);
    setEditProgramCategory(program.category);
    setEditProgramDayLabel(program.day_label || 'Monday');
    setEditProgramDetails(program.details);
    setEditProgramPublished(program.is_published);
    setEditProgramSortOrder(String(program.sort_order));
  }

  function cancelEditProgram() {
    setEditingProgramId(null);
    setEditProgramTitle('');
    setEditProgramCategory('Gym');
    setEditProgramDayLabel('Monday');
    setEditProgramDetails('');
    setEditProgramPublished(true);
    setEditProgramSortOrder('1');
  }

  async function handleSaveProgram(id: string) {
    await runAction(async () => {
      if (!editProgramTitle.trim()) {
        setError('Program title is required.');
        return;
      }

      const { error: updateError } = await supabase
        .from('PortalPrograms')
        .update({
          title: editProgramTitle.trim(),
          category: editProgramCategory,
          day_label: editProgramDayLabel,
          details: editProgramDetails.trim(),
          is_published: editProgramPublished,
          sort_order: Number(editProgramSortOrder) || 0,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message || 'Failed to update program.');
        return;
      }

      setSuccessMessage('Program updated.');
      cancelEditProgram();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteProgram(id: string) {
    const confirmed = window.confirm('Delete this program?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('PortalPrograms').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete program.');
        return;
      }

      setSuccessMessage('Program deleted.');
      await loadPortalAdminData();
    });
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
              Manage the public portal: week at a glance, reminders, fixtures, results, and programs.
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
                <h2 className="mb-4 text-lg font-semibold">Create Week Plan</h2>
                <form onSubmit={handleCreateWeekPlan} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Week Label</label>
                    <input
                      value={newWeekLabel}
                      onChange={(e) => setNewWeekLabel(e.target.value)}
                      placeholder="Week at a Glance"
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
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Create Week Plan
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Create Week Item</h2>
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
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add Week Item
                  </button>
                </form>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <h2 className="mb-4 text-lg font-semibold">Week Plans</h2>

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
              <h2 className="mb-4 text-lg font-semibold">Week Items</h2>

              {selectedWeekItems.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                  No week items for the selected plan.
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
                <h2 className="mb-4 text-lg font-semibold">Create Reminder</h2>
                <form onSubmit={handleCreateReminder} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                    <input
                      value={newReminderTitle}
                      onChange={(e) => setNewReminderTitle(e.target.value)}
                      placeholder="e.g. Bring full training kit"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Details</label>
                    <textarea
                      rows={3}
                      value={newReminderDetails}
                      onChange={(e) => setNewReminderDetails(e.target.value)}
                      placeholder="Reminder details"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                      <input
                        type="number"
                        value={newReminderSortOrder}
                        onChange={(e) => setNewReminderSortOrder(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>

                    <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={newReminderPublished}
                        onChange={(e) => setNewReminderPublished(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Published
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    Create Reminder
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Reminders</h2>

                {reminders.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No reminders yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reminders.map((reminder) => {
                      const isEditing = editingReminderId === reminder.id;

                      return (
                        <div key={reminder.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                                <input
                                  value={editReminderTitle}
                                  onChange={(e) => setEditReminderTitle(e.target.value)}
                                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Details</label>
                                <textarea
                                  rows={3}
                                  value={editReminderDetails}
                                  onChange={(e) => setEditReminderDetails(e.target.value)}
                                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div>
                                  <label className="mb-2 block text-sm font-medium text-slate-200">Sort Order</label>
                                  <input
                                    type="number"
                                    value={editReminderSortOrder}
                                    onChange={(e) => setEditReminderSortOrder(e.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                  />
                                </div>

                                <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                                  <input
                                    type="checkbox"
                                    checked={editReminderPublished}
                                    onChange={(e) => setEditReminderPublished(e.target.checked)}
                                    className="h-4 w-4"
                                  />
                                  Published
                                </label>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveReminder(reminder.id)}
                                  className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditReminder}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{reminder.title}</p>
                                <p className="mt-1 text-sm text-slate-400">{reminder.details || 'No details'}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sort {reminder.sort_order} • {reminder.is_published ? 'Published' : 'Draft'}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => startEditReminder(reminder)}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteReminder(reminder.id)}
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

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Create Fixture</h2>
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
                    Published
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    Create Fixture
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Fixtures</h2>

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
                                  {formatDate(fixture.fixture_date)} • {fixture.venue || 'Venue TBC'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sort {fixture.sort_order} • {fixture.is_published ? 'Published' : 'Draft'}
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
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Create Result</h2>
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
                      <label className="mb-2 block text-sm font-medium text-slate-200">Final Score</label>
                      <input
                        value={newResultFinalScore}
                        onChange={(e) => setNewResultFinalScore(e.target.value)}
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
                    <label className="mb-2 block text-sm font-medium text-slate-200">Goal Scorers</label>
                    <textarea
                      rows={3}
                      value={newResultGoalScorers}
                      onChange={(e) => setNewResultGoalScorers(e.target.value)}
                      placeholder="e.g. Smith (2), Dlamini"
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
                    Published
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    Create Result
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Results</h2>

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
                                  value={editResultFinalScore}
                                  onChange={(e) => setEditResultFinalScore(e.target.value)}
                                  placeholder="Final score"
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
                                value={editResultGoalScorers}
                                onChange={(e) => setEditResultGoalScorers(e.target.value)}
                                placeholder="Goal scorers"
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
                                  {formatDate(result.result_date)} • {result.final_score || '—'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Goal scorers: {result.goal_scorers || 'Not listed'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sort {result.sort_order} • {result.is_published ? 'Published' : 'Draft'}
                                </p>
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

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Create Program</h2>
                <form onSubmit={handleCreateProgram} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                    <input
                      value={newProgramTitle}
                      onChange={(e) => setNewProgramTitle(e.target.value)}
                      placeholder="e.g. Mobility Routine"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Category</label>
                      <select
                        value={newProgramCategory}
                        onChange={(e) => setNewProgramCategory(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      >
                        {PROGRAM_CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-200">Day</label>
                      <select
                        value={newProgramDayLabel}
                        onChange={(e) => setNewProgramDayLabel(e.target.value)}
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
                        value={newProgramSortOrder}
                        onChange={(e) => setNewProgramSortOrder(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-200">Details</label>
                    <textarea
                      rows={3}
                      value={newProgramDetails}
                      onChange={(e) => setNewProgramDetails(e.target.value)}
                      placeholder="Program details"
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                    />
                  </div>

                  <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                    <input
                      type="checkbox"
                      checked={newProgramPublished}
                      onChange={(e) => setNewProgramPublished(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Published
                  </label>

                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300"
                  >
                    Create Program
                  </button>
                </form>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h2 className="mb-4 text-lg font-semibold">Programs</h2>
                <p className="mb-4 text-sm text-slate-400">Keep this to a maximum of 4 active programs.</p>

                {programs.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                    No programs yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {programs.map((program) => {
                      const isEditing = editingProgramId === program.id;

                      return (
                        <div key={program.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                          {isEditing ? (
                            <div className="space-y-4">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-slate-200">Title</label>
                                <input
                                  value={editProgramTitle}
                                  onChange={(e) => setEditProgramTitle(e.target.value)}
                                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <select
                                  value={editProgramCategory}
                                  onChange={(e) => setEditProgramCategory(e.target.value)}
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                >
                                  {PROGRAM_CATEGORIES.map((category) => (
                                    <option key={category} value={category}>
                                      {category}
                                    </option>
                                  ))}
                                </select>

                                <select
                                  value={editProgramDayLabel}
                                  onChange={(e) => setEditProgramDayLabel(e.target.value)}
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                >
                                  {DAY_OPTIONS.map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>

                                <input
                                  type="number"
                                  value={editProgramSortOrder}
                                  onChange={(e) => setEditProgramSortOrder(e.target.value)}
                                  placeholder="Sort"
                                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                                />
                              </div>

                              <textarea
                                rows={3}
                                value={editProgramDetails}
                                onChange={(e) => setEditProgramDetails(e.target.value)}
                                placeholder="Details"
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                              />

                              <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-200">
                                <input
                                  type="checkbox"
                                  checked={editProgramPublished}
                                  onChange={(e) => setEditProgramPublished(e.target.checked)}
                                  className="h-4 w-4"
                                />
                                Published
                              </label>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleSaveProgram(program.id)}
                                  className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-300"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditProgram}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-white">{program.title}</p>
                                <p className="mt-1 text-sm text-slate-400">
                                  {program.category} • {program.day_label || '—'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{program.details || 'No details'}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  Sort {program.sort_order} • {program.is_published ? 'Published' : 'Draft'}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => startEditProgram(program)}
                                  className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProgram(program.id)}
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