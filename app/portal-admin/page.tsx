'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/Toast';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';
import { useRouter } from 'next/navigation';
import { FixturesSection } from './sections/FixturesSection';
import { ResultsSection } from './sections/ResultsSection';
import { WeekSection } from './sections/WeekSection';
import { ProgramsSection } from './sections/ProgramsSection';
import { RemindersSection } from './sections/RemindersSection';
import { SponsorsSection } from './sections/SponsorsSection';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

type GenericRow = Record<string, any>;
type WeekPlan = { id: string; created_at: string | null; week_label: string; published: boolean; };
type WeekPlanItem = { id: string; created_at: string | null; week_plan_id: string; day_label: string; title: string; details: string; sort_order: number; };
type Reminder = { id: string; created_at: string | null; title: string; details: string; is_published: boolean; sort_order: number; };
type Fixture = { id: string; created_at: string | null; team: string; opponent: string; fixture_date: string; fixture_time: string; venue: string; is_published: boolean; sort_order: number; };
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
const PROGRAM_BUCKET = 'portal-programs';
const SPONSOR_BUCKET = 'portal-sponsors';

export default function PortalAdminPage() {
const router = useRouter();
  const { showToast } = useToast();

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

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('fixtures');
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
  const [newFixtureTime, setNewFixtureTime] = useState('');
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
  const [newProgramFile, setNewProgramFile] = useState<File | null>(null);

  const [newSponsorName, setNewSponsorName] = useState('');
  const [newSponsorLink, setNewSponsorLink] = useState('');
  const [newSponsorPublished, setNewSponsorPublished] = useState(true);
  const [newSponsorSortOrder, setNewSponsorSortOrder] = useState('1');
  const [newSponsorImage, setNewSponsorImage] = useState<File | null>(null);

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
  const [editFixtureTime, setEditFixtureTime] = useState('');
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
  const [editProgramFile, setEditProgramFile] = useState<File | null>(null);

  const [editingSponsorId, setEditingSponsorId] = useState<string | null>(null);
  const [editSponsorName, setEditSponsorName] = useState('');
  const [editSponsorLink, setEditSponsorLink] = useState('');
  const [editSponsorPublished, setEditSponsorPublished] = useState(true);
  const [editSponsorSortOrder, setEditSponsorSortOrder] = useState('1');
  const [editSponsorImage, setEditSponsorImage] = useState<File | null>(null);

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
    ] = await Promise.all([
      supabase.from('portal_week_plans').select('*').order('created_at', { ascending: false }),
      supabase.from('portal_week_plan_items').select('*').order('sort_order', { ascending: true }),
      supabase.from('portal_reminders').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('portal_fixtures')
        .select('*')
        .order('fixture_date', { ascending: true })
        .order('sort_order', { ascending: true }),
      supabase
        .from('portal_results')
        .select('*')
        .order('result_date', { ascending: false })
        .order('sort_order', { ascending: true }),
      supabase.from('portal_programs').select('*').order('sort_order', { ascending: true }),
      supabase.from('portal_sponsors').select('*').order('sort_order', { ascending: true }),
    ]);

    if (
      weekPlansRes.error ||
      weekPlanItemsRes.error ||
      remindersRes.error ||
      fixturesRes.error ||
      resultsRes.error ||
      programsRes.error ||
      sponsorsRes.error
    ) {
      setError(
        weekPlansRes.error?.message ||
          weekPlanItemsRes.error?.message ||
          remindersRes.error?.message ||
          fixturesRes.error?.message ||
          resultsRes.error?.message ||
          programsRes.error?.message ||
          sponsorsRes.error?.message ||
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

  const sponsors = useMemo(
    () => sponsorRows.map(normalizeSponsor).sort((a, b) => a.sort_order - b.sort_order),
    [sponsorRows]
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
    try {
      await action();
    } finally {
      setBusy(false);
    }
  }

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

  function resetProgramCreateFields() {
    setNewProgramTitle('');
    setNewProgramCategory('Gym');
    setNewProgramDayLabel('Monday');
    setNewProgramDetails('');
    setNewProgramPublished(true);
    setNewProgramSortOrder(String(programs.length + 1));
    setNewProgramFile(null);
  }

  function resetProgramEditFields() {
    setEditingProgramId(null);
    setEditProgramTitle('');
    setEditProgramCategory('Gym');
    setEditProgramDayLabel('Monday');
    setEditProgramDetails('');
    setEditProgramPublished(true);
    setEditProgramSortOrder('1');
    setEditProgramFile(null);
  }

  function resetSponsorCreateFields() {
    setNewSponsorName('');
    setNewSponsorLink('');
    setNewSponsorPublished(true);
    setNewSponsorSortOrder(String(sponsors.length + 1));
    setNewSponsorImage(null);
  }

  function resetSponsorEditFields() {
    setEditingSponsorId(null);
    setEditSponsorName('');
    setEditSponsorLink('');
    setEditSponsorPublished(true);
    setEditSponsorSortOrder('1');
    setEditSponsorImage(null);
  }

  function validatePdf(file: File | null) {
    if (!file) return true;
    const isPdf =
      file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

    if (!isPdf) {
      setError('Only PDF files can be uploaded for programs.');
      return false;
    }

    return true;
  }

  function validateImage(file: File | null) {
    if (!file) return true;
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      setError('Only image files can be uploaded for sponsors.');
      return false;
    }
    return true;
  }

  async function uploadProgramPdf(file: File, programTitle: string) {
    const safeTitle = programTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const extension = file.name.split('.').pop() || 'pdf';
    const path = `programs/${Date.now()}-${safeTitle || 'program'}.${extension}`;

    const uploadRes = await supabase.storage.from(PROGRAM_BUCKET).upload(path, file, {
      upsert: false,
      contentType: 'application/pdf',
    });

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message || 'Failed to upload PDF.');
    }

    const publicRes = supabase.storage.from(PROGRAM_BUCKET).getPublicUrl(path);
    const fileUrl = publicRes.data.publicUrl || '';

    return {
      file_name: file.name,
      file_path: path,
      file_url: fileUrl,
    };
  }

  async function uploadSponsorImage(file: File, sponsorName: string) {
    const safeName = sponsorName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const extension = file.name.split('.').pop() || 'png';
    const path = `sponsors/${Date.now()}-${safeName || 'sponsor'}.${extension}`;

    const uploadRes = await supabase.storage.from(SPONSOR_BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || 'image/png',
    });

    if (uploadRes.error) {
      throw new Error(uploadRes.error.message || 'Failed to upload sponsor image.');
    }

    const publicRes = supabase.storage.from(SPONSOR_BUCKET).getPublicUrl(path);
    const imageUrl = publicRes.data.publicUrl || '';

    return {
      image_name: file.name,
      image_path: path,
      image_url: imageUrl,
    };
  }

  async function tryRemoveStoredFile(bucket: string, filePath?: string) {
    if (!filePath) return;
    await supabase.storage.from(bucket).remove([filePath]);
  }

  async function handleCreateWeekPlan(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newWeekLabel.trim()) {
        setError('Week label is required.');
        return;
      }

      const { error: insertError } = await supabase.from('portal_week_plans').insert([
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
      showToast('Week plan created.');
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

      const { error: insertError } = await supabase.from('portal_week_plan_items').insert([
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
      showToast('Week item created.');
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

      const { error: insertError } = await supabase.from('portal_reminders').insert([
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
      showToast('Reminder created.');
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

      const { error: insertError } = await supabase.from('portal_fixtures').insert([
        {
          team: newFixtureTeam.trim(),
          opponent: newFixtureOpponent.trim(),
          fixture_date: newFixtureDate,
          fixture_time: newFixtureTime.trim(),
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
      setNewFixtureTime('');
      setNewFixtureVenue('');
      setNewFixturePublished(true);
      setNewFixtureSortOrder('1');
      showToast('Fixture created.');
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

      const { error: insertError } = await supabase.from('portal_results').insert([
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
      showToast('Result created.');
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

      if (!validatePdf(newProgramFile)) return;

      let fileData: Partial<Program> = {};

      if (newProgramFile) {
        fileData = await uploadProgramPdf(newProgramFile, newProgramTitle.trim());
      }

      const { error: insertError } = await supabase.from('portal_programs').insert([
        {
          title: newProgramTitle.trim(),
          category: newProgramCategory,
          day_label: newProgramDayLabel,
          details: newProgramDetails.trim(),
          is_published: newProgramPublished,
          sort_order: Number(newProgramSortOrder) || 0,
          ...fileData,
        },
      ]);

      if (insertError) {
        if ('file_path' in fileData && fileData.file_path) {
          await tryRemoveStoredFile(PROGRAM_BUCKET, fileData.file_path);
        }
        setError(insertError.message || 'Failed to create program.');
        return;
      }

      resetProgramCreateFields();
      showToast('Program created.');
      await loadPortalAdminData();
    });
  }

  async function handleCreateSponsor(e: React.FormEvent) {
    e.preventDefault();

    await runAction(async () => {
      if (!newSponsorName.trim()) {
        setError('Sponsor name is required.');
        return;
      }

      if (!validateImage(newSponsorImage)) return;

      let imageData: Partial<Sponsor> = {};

      if (newSponsorImage) {
        imageData = await uploadSponsorImage(newSponsorImage, newSponsorName.trim());
      }

      const { error: insertError } = await supabase.from('portal_sponsors').insert([
        {
          name: newSponsorName.trim(),
          sponsor_link: newSponsorLink.trim(),
          is_published: newSponsorPublished,
          sort_order: Number(newSponsorSortOrder) || 0,
          ...imageData,
        },
      ]);

      if (insertError) {
        if ('image_path' in imageData && imageData.image_path) {
          await tryRemoveStoredFile(SPONSOR_BUCKET, imageData.image_path);
        }
        setError(insertError.message || 'Failed to create sponsor.');
        return;
      }

      resetSponsorCreateFields();
      showToast('Sponsor created.');
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
        .from('portal_week_plans')
        .update({
          week_label: editWeekLabel.trim(),
          published: editWeekPublished,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message || 'Failed to update week plan.');
        return;
      }

      showToast('Week plan updated.');
      cancelEditWeekPlan();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteWeekPlan(id: string) {
    const confirmed = window.confirm('Delete this week plan and all its items?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_week_plans').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete week plan.');
        return;
      }

      showToast('Week plan deleted.');
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
        .from('portal_week_plan_items')
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

      showToast('Week item updated.');
      cancelEditWeekItem();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteWeekItem(id: string) {
    const confirmed = window.confirm('Delete this week item?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_week_plan_items').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete week item.');
        return;
      }

      showToast('Week item deleted.');
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
        .from('portal_reminders')
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

      showToast('Reminder updated.');
      cancelEditReminder();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteReminder(id: string) {
    const confirmed = window.confirm('Delete this reminder?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_reminders').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete reminder.');
        return;
      }

      showToast('Reminder deleted.');
      await loadPortalAdminData();
    });
  }

  function startEditFixture(fixture: Fixture) {
    setEditingFixtureId(fixture.id);
    setEditFixtureTeam(fixture.team);
    setEditFixtureOpponent(fixture.opponent);
    setEditFixtureDate(fixture.fixture_date);
    setEditFixtureTime(fixture.fixture_time);
    setEditFixtureVenue(fixture.venue);
    setEditFixturePublished(fixture.is_published);
    setEditFixtureSortOrder(String(fixture.sort_order));
  }

  function cancelEditFixture() {
    setEditingFixtureId(null);
    setEditFixtureTeam('');
    setEditFixtureOpponent('');
    setEditFixtureDate('');
    setEditFixtureTime('');
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
        .from('portal_fixtures')
        .update({
          team: editFixtureTeam.trim(),
          opponent: editFixtureOpponent.trim(),
          fixture_date: editFixtureDate,
          fixture_time: editFixtureTime.trim(),
          venue: editFixtureVenue.trim(),
          is_published: editFixturePublished,
          sort_order: Number(editFixtureSortOrder) || 0,
        })
        .eq('id', id);

      if (updateError) {
        setError(updateError.message || 'Failed to update fixture.');
        return;
      }

      showToast('Fixture updated.');
      cancelEditFixture();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteFixture(id: string) {
    const confirmed = window.confirm('Delete this fixture?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_fixtures').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete fixture.');
        return;
      }

      showToast('Fixture deleted.');
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
        .from('portal_results')
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

      showToast('Result updated.');
      cancelEditResult();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteResult(id: string) {
    const confirmed = window.confirm('Delete this result?');
    if (!confirmed) return;

    await runAction(async () => {
      const { error: deleteError } = await supabase.from('portal_results').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete result.');
        return;
      }

      showToast('Result deleted.');
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
    setEditProgramFile(null);
  }

  async function handleSaveProgram(id: string) {
    await runAction(async () => {
      if (!editProgramTitle.trim()) {
        setError('Program title is required.');
        return;
      }

      if (!validatePdf(editProgramFile)) return;

      const currentProgram = programs.find((program) => program.id === id);
      if (!currentProgram) {
        setError('Program not found.');
        return;
      }

      let fileData: Partial<Program> = {
        file_name: currentProgram.file_name,
        file_path: currentProgram.file_path,
        file_url: currentProgram.file_url,
      };

      if (editProgramFile) {
        const uploaded = await uploadProgramPdf(editProgramFile, editProgramTitle.trim());
        fileData = uploaded;
      }

      const { error: updateError } = await supabase
        .from('portal_programs')
        .update({
          title: editProgramTitle.trim(),
          category: editProgramCategory,
          day_label: editProgramDayLabel,
          details: editProgramDetails.trim(),
          is_published: editProgramPublished,
          sort_order: Number(editProgramSortOrder) || 0,
          ...fileData,
        })
        .eq('id', id);

      if (updateError) {
        if (editProgramFile && 'file_path' in fileData && fileData.file_path && fileData.file_path !== currentProgram.file_path) {
          await tryRemoveStoredFile(PROGRAM_BUCKET, fileData.file_path);
        }
        setError(updateError.message || 'Failed to update program.');
        return;
      }

      if (editProgramFile && currentProgram.file_path && currentProgram.file_path !== fileData.file_path) {
        await tryRemoveStoredFile(PROGRAM_BUCKET, currentProgram.file_path);
      }

      showToast('Program updated.');
      resetProgramEditFields();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteProgram(id: string) {
    const confirmed = window.confirm('Delete this program?');
    if (!confirmed) return;

    await runAction(async () => {
      const currentProgram = programs.find((program) => program.id === id);

      const { error: deleteError } = await supabase.from('portal_programs').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete program.');
        return;
      }

      if (currentProgram?.file_path) {
        await tryRemoveStoredFile(PROGRAM_BUCKET, currentProgram.file_path);
      }

      showToast('Program deleted.');
      await loadPortalAdminData();
    });
  }

  function startEditSponsor(sponsor: Sponsor) {
    setEditingSponsorId(sponsor.id);
    setEditSponsorName(sponsor.name);
    setEditSponsorLink(sponsor.sponsor_link);
    setEditSponsorPublished(sponsor.is_published);
    setEditSponsorSortOrder(String(sponsor.sort_order));
    setEditSponsorImage(null);
  }

  async function handleSaveSponsor(id: string) {
    await runAction(async () => {
      if (!editSponsorName.trim()) {
        setError('Sponsor name is required.');
        return;
      }

      if (!validateImage(editSponsorImage)) return;

      const currentSponsor = sponsors.find((sponsor) => sponsor.id === id);
      if (!currentSponsor) {
        setError('Sponsor not found.');
        return;
      }

      let imageData: Partial<Sponsor> = {
        image_name: currentSponsor.image_name,
        image_path: currentSponsor.image_path,
        image_url: currentSponsor.image_url,
      };

      if (editSponsorImage) {
        const uploaded = await uploadSponsorImage(editSponsorImage, editSponsorName.trim());
        imageData = uploaded;
      }

      const { error: updateError } = await supabase
        .from('portal_sponsors')
        .update({
          name: editSponsorName.trim(),
          sponsor_link: editSponsorLink.trim(),
          is_published: editSponsorPublished,
          sort_order: Number(editSponsorSortOrder) || 0,
          ...imageData,
        })
        .eq('id', id);

      if (updateError) {
        if (editSponsorImage && 'image_path' in imageData && imageData.image_path && imageData.image_path !== currentSponsor.image_path) {
          await tryRemoveStoredFile(SPONSOR_BUCKET, imageData.image_path);
        }
        setError(updateError.message || 'Failed to update sponsor.');
        return;
      }

      if (editSponsorImage && currentSponsor.image_path && currentSponsor.image_path !== imageData.image_path) {
        await tryRemoveStoredFile(SPONSOR_BUCKET, currentSponsor.image_path);
      }

      showToast('Sponsor updated.');
      resetSponsorEditFields();
      await loadPortalAdminData();
    });
  }

  async function handleDeleteSponsor(id: string) {
    const confirmed = window.confirm('Delete this sponsor?');
    if (!confirmed) return;

    await runAction(async () => {
      const currentSponsor = sponsors.find((sponsor) => sponsor.id === id);

      const { error: deleteError } = await supabase.from('portal_sponsors').delete().eq('id', id);

      if (deleteError) {
        setError(deleteError.message || 'Failed to delete sponsor.');
        return;
      }

      if (currentSponsor?.image_path) {
        await tryRemoveStoredFile(SPONSOR_BUCKET, currentSponsor.image_path);
      }

      showToast('Sponsor deleted.');
      await loadPortalAdminData();
    });
  }


  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">St Benedict's College Hockey</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight text-white">Portal Admin</h1>
            <p className="mt-1 text-sm text-slate-500">Manage fixtures, results, week plan, programs, reminders and sponsors.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/portal" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-black text-emerald-300 hover:bg-emerald-500/20 transition">Portal</Link>
            <button onClick={handleLogout} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-black text-red-300 hover:bg-red-500/20 transition">Logout</button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-800 pb-4">
          {['fixtures','results','week','programs','reminders','sponsors'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-2 text-sm font-black capitalize transition ${activeTab === tab ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300' : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
              {tab === 'week' ? 'Week Plan' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        ) : (
          <div>
            {activeTab === 'fixtures' && <FixturesSection fixtures={fixtures} busy={busy} newFixtureTeam={newFixtureTeam} setNewFixtureTeam={setNewFixtureTeam} newFixtureOpponent={newFixtureOpponent} setNewFixtureOpponent={setNewFixtureOpponent} newFixtureDate={newFixtureDate} setNewFixtureDate={setNewFixtureDate} newFixtureTime={newFixtureTime} setNewFixtureTime={setNewFixtureTime} newFixtureVenue={newFixtureVenue} setNewFixtureVenue={setNewFixtureVenue} newFixturePublished={newFixturePublished} setNewFixturePublished={setNewFixturePublished} handleCreateFixture={handleCreateFixture} editingFixtureId={editingFixtureId} editFixtureTeam={editFixtureTeam} setEditFixtureTeam={setEditFixtureTeam} editFixtureOpponent={editFixtureOpponent} setEditFixtureOpponent={setEditFixtureOpponent} editFixtureDate={editFixtureDate} setEditFixtureDate={setEditFixtureDate} editFixtureTime={editFixtureTime} setEditFixtureTime={setEditFixtureTime} editFixtureVenue={editFixtureVenue} setEditFixtureVenue={setEditFixtureVenue} editFixturePublished={editFixturePublished} setEditFixturePublished={setEditFixturePublished} handleSaveFixture={handleSaveFixture} cancelEditFixture={cancelEditFixture} startEditFixture={startEditFixture} handleDeleteFixture={handleDeleteFixture} moveItem={moveItem} formatDate={formatDate} />}
            {activeTab === 'results' && <ResultsSection results={results} busy={busy} newResultTeam={newResultTeam} setNewResultTeam={setNewResultTeam} newResultOpponent={newResultOpponent} setNewResultOpponent={setNewResultOpponent} newResultDate={newResultDate} setNewResultDate={setNewResultDate} newResultFinalScore={newResultFinalScore} setNewResultFinalScore={setNewResultFinalScore} newResultGoalScorers={newResultGoalScorers} setNewResultGoalScorers={setNewResultGoalScorers} newResultPublished={newResultPublished} setNewResultPublished={setNewResultPublished} handleCreateResult={handleCreateResult} editingResultId={editingResultId} editResultTeam={editResultTeam} setEditResultTeam={setEditResultTeam} editResultOpponent={editResultOpponent} setEditResultOpponent={setEditResultOpponent} editResultDate={editResultDate} setEditResultDate={setEditResultDate} editResultFinalScore={editResultFinalScore} setEditResultFinalScore={setEditResultFinalScore} editResultGoalScorers={editResultGoalScorers} setEditResultGoalScorers={setEditResultGoalScorers} editResultPublished={editResultPublished} setEditResultPublished={setEditResultPublished} handleSaveResult={handleSaveResult} cancelEditResult={cancelEditResult} startEditResult={startEditResult} handleDeleteResult={handleDeleteResult} moveItem={moveItem} formatDate={formatDate} />}
            {activeTab === 'week' && <WeekSection weekPlans={weekPlans} selectedWeekPlan={selectedWeekPlan} selectedWeekItems={selectedWeekItems} busy={busy} selectedWeekPlanId={selectedWeekPlanId} setSelectedWeekPlanId={setSelectedWeekPlanId} newWeekLabel={newWeekLabel} setNewWeekLabel={setNewWeekLabel} newWeekPublished={newWeekPublished} setNewWeekPublished={setNewWeekPublished} handleCreateWeekPlan={handleCreateWeekPlan} newDayLabel={newDayLabel} setNewDayLabel={setNewDayLabel} newWeekItemTitle={newWeekItemTitle} setNewWeekItemTitle={setNewWeekItemTitle} newWeekItemDetails={newWeekItemDetails} setNewWeekItemDetails={setNewWeekItemDetails} handleCreateWeekItem={handleCreateWeekItem} editingWeekPlanId={editingWeekPlanId} editWeekLabel={editWeekLabel} setEditWeekLabel={setEditWeekLabel} editWeekPublished={editWeekPublished} setEditWeekPublished={setEditWeekPublished} handleSaveWeekPlan={handleSaveWeekPlan} cancelEditWeekPlan={cancelEditWeekPlan} startEditWeekPlan={startEditWeekPlan} handleDeleteWeekPlan={handleDeleteWeekPlan} editingWeekItemId={editingWeekItemId} editDayLabel={editDayLabel} setEditDayLabel={setEditDayLabel} editWeekItemTitle={editWeekItemTitle} setEditWeekItemTitle={setEditWeekItemTitle} editWeekItemDetails={editWeekItemDetails} setEditWeekItemDetails={setEditWeekItemDetails} handleSaveWeekItem={handleSaveWeekItem} cancelEditWeekItem={cancelEditWeekItem} startEditWeekItem={startEditWeekItem} handleDeleteWeekItem={handleDeleteWeekItem} moveItem={moveItem} formatDate={formatDate} />}
            {activeTab === 'programs' && <ProgramsSection programs={programs} busy={busy} newProgramTitle={newProgramTitle} setNewProgramTitle={setNewProgramTitle} newProgramCategory={newProgramCategory} setNewProgramCategory={setNewProgramCategory} newProgramDayLabel={newProgramDayLabel} setNewProgramDayLabel={setNewProgramDayLabel} newProgramDetails={newProgramDetails} setNewProgramDetails={setNewProgramDetails} newProgramPublished={newProgramPublished} setNewProgramPublished={setNewProgramPublished} newProgramFile={newProgramFile} setNewProgramFile={setNewProgramFile} handleCreateProgram={handleCreateProgram} editingProgramId={editingProgramId} editProgramTitle={editProgramTitle} setEditProgramTitle={setEditProgramTitle} editProgramCategory={editProgramCategory} setEditProgramCategory={setEditProgramCategory} editProgramDayLabel={editProgramDayLabel} setEditProgramDayLabel={setEditProgramDayLabel} editProgramDetails={editProgramDetails} setEditProgramDetails={setEditProgramDetails} editProgramPublished={editProgramPublished} setEditProgramPublished={setEditProgramPublished} editProgramFile={editProgramFile} setEditProgramFile={setEditProgramFile} handleSaveProgram={handleSaveProgram} resetProgramEditFields={resetProgramEditFields} startEditProgram={startEditProgram} handleDeleteProgram={handleDeleteProgram} moveItem={moveItem} />}
            {activeTab === 'reminders' && <RemindersSection reminders={reminders} busy={busy} newReminderTitle={newReminderTitle} setNewReminderTitle={setNewReminderTitle} newReminderDetails={newReminderDetails} setNewReminderDetails={setNewReminderDetails} newReminderPublished={newReminderPublished} setNewReminderPublished={setNewReminderPublished} handleCreateReminder={handleCreateReminder} editingReminderId={editingReminderId} editReminderTitle={editReminderTitle} setEditReminderTitle={setEditReminderTitle} editReminderDetails={editReminderDetails} setEditReminderDetails={setEditReminderDetails} editReminderPublished={editReminderPublished} setEditReminderPublished={setEditReminderPublished} handleSaveReminder={handleSaveReminder} cancelEditReminder={cancelEditReminder} startEditReminder={startEditReminder} handleDeleteReminder={handleDeleteReminder} moveItem={moveItem} />}
            {activeTab === 'sponsors' && <SponsorsSection sponsors={sponsors} busy={busy} newSponsorName={newSponsorName} setNewSponsorName={setNewSponsorName} newSponsorLink={newSponsorLink} setNewSponsorLink={setNewSponsorLink} newSponsorPublished={newSponsorPublished} setNewSponsorPublished={setNewSponsorPublished} newSponsorImage={newSponsorImage} setNewSponsorImage={setNewSponsorImage} handleCreateSponsor={handleCreateSponsor} editingSponsorId={editingSponsorId} editSponsorName={editSponsorName} setEditSponsorName={setEditSponsorName} editSponsorLink={editSponsorLink} setEditSponsorLink={setEditSponsorLink} editSponsorPublished={editSponsorPublished} setEditSponsorPublished={setEditSponsorPublished} editSponsorImage={editSponsorImage} setEditSponsorImage={setEditSponsorImage} handleSaveSponsor={handleSaveSponsor} resetSponsorEditFields={resetSponsorEditFields} startEditSponsor={startEditSponsor} handleDeleteSponsor={handleDeleteSponsor} moveItem={moveItem} />}
          </div>
        )}
      </div>
    </main>
  );
}