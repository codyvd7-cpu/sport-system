import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Reminder } from '../types';

export interface UseRemindersAdminDeps {
  supabase: SupabaseClient;
  reminders: Reminder[];
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useRemindersAdmin({ supabase, reminders, runAction, showToast, setError, refetch }: UseRemindersAdminDeps) {
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderDetails, setNewReminderDetails] = useState('');
  const [newReminderPublished, setNewReminderPublished] = useState(true);
  const [newReminderSortOrder, setNewReminderSortOrder] = useState('1');

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
      await refetch();
    });
  }

  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  const [editReminderTitle, setEditReminderTitle] = useState('');
  const [editReminderDetails, setEditReminderDetails] = useState('');
  const [editReminderPublished, setEditReminderPublished] = useState(true);
  const [editReminderSortOrder, setEditReminderSortOrder] = useState('1');

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
      await refetch();
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
      await refetch();
    });
  }

  return {
    newReminderTitle, setNewReminderTitle, newReminderDetails, setNewReminderDetails,
    newReminderPublished, setNewReminderPublished, handleCreateReminder,
    editingReminderId, editReminderTitle, setEditReminderTitle,
    editReminderDetails, setEditReminderDetails, editReminderPublished, setEditReminderPublished,
    handleSaveReminder, cancelEditReminder, startEditReminder, handleDeleteReminder,
  };
}
