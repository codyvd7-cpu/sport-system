import { useState, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WeekPlan, WeekPlanItem } from '../types';

export interface UseWeekPlanAdminDeps {
  supabase: SupabaseClient;
  weekPlans: WeekPlan[];
  weekPlanItems: WeekPlanItem[];
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useWeekPlanAdmin({ supabase, weekPlans, weekPlanItems, runAction, showToast, setError, refetch }: UseWeekPlanAdminDeps) {
  // ── Selection (which plan is being viewed/edited) ──────────────────────────
  const [selectedWeekPlanId, setSelectedWeekPlanId] = useState('');
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

  // ── Create plan ──────────────────────────────────────────────────────────────
  const [newWeekLabel, setNewWeekLabel] = useState('Week at a Glance');
  const [newWeekPublished, setNewWeekPublished] = useState(true);

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
      await refetch();
    });
  }

  // ── Create item ──────────────────────────────────────────────────────────────
  const [newDayLabel, setNewDayLabel] = useState('Monday');
  const [newWeekItemTitle, setNewWeekItemTitle] = useState('');
  const [newWeekItemDetails, setNewWeekItemDetails] = useState('');
  const [newWeekItemSortOrder, setNewWeekItemSortOrder] = useState('1');

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
      await refetch();
    });
  }

  // ── Edit plan ────────────────────────────────────────────────────────────────
  const [editingWeekPlanId, setEditingWeekPlanId] = useState<string | null>(null);
  const [editWeekLabel, setEditWeekLabel] = useState('');
  const [editWeekPublished, setEditWeekPublished] = useState(true);

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
      await refetch();
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
      await refetch();
    });
  }

  // ── Edit item ────────────────────────────────────────────────────────────────
  const [editingWeekItemId, setEditingWeekItemId] = useState<string | null>(null);
  const [editDayLabel, setEditDayLabel] = useState('Monday');
  const [editWeekItemTitle, setEditWeekItemTitle] = useState('');
  const [editWeekItemDetails, setEditWeekItemDetails] = useState('');
  const [editWeekItemSortOrder, setEditWeekItemSortOrder] = useState('1');

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
      await refetch();
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
      await refetch();
    });
  }

  return {
    selectedWeekPlanId, setSelectedWeekPlanId, selectedWeekPlan, selectedWeekItems,
    newWeekLabel, setNewWeekLabel, newWeekPublished, setNewWeekPublished, handleCreateWeekPlan,
    newDayLabel, setNewDayLabel, newWeekItemTitle, setNewWeekItemTitle,
    newWeekItemDetails, setNewWeekItemDetails, handleCreateWeekItem,
    editingWeekPlanId, editWeekLabel, setEditWeekLabel, editWeekPublished, setEditWeekPublished,
    handleSaveWeekPlan, cancelEditWeekPlan, startEditWeekPlan, handleDeleteWeekPlan,
    editingWeekItemId, editDayLabel, setEditDayLabel, editWeekItemTitle, setEditWeekItemTitle,
    editWeekItemDetails, setEditWeekItemDetails,
    handleSaveWeekItem, cancelEditWeekItem, startEditWeekItem, handleDeleteWeekItem,
  };
}
