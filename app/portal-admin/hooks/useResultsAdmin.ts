import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Result } from '../types';

export interface UseResultsAdminDeps {
  supabase: SupabaseClient;
  activeSport: string;
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useResultsAdmin({ supabase, activeSport, runAction, showToast, setError, refetch }: UseResultsAdminDeps) {
  const [newResultTeam, setNewResultTeam] = useState('');
  const [newResultOpponent, setNewResultOpponent] = useState('');
  const [newResultDate, setNewResultDate] = useState('');
  const [newResultFinalScore, setNewResultFinalScore] = useState('');
  const [newResultGoalScorers, setNewResultGoalScorers] = useState('');
  const [newResultPublished, setNewResultPublished] = useState(true);
  const [newResultSortOrder, setNewResultSortOrder] = useState('1');

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
          sport: activeSport,
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
      await refetch();
    });
  }

  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [editResultTeam, setEditResultTeam] = useState('');
  const [editResultOpponent, setEditResultOpponent] = useState('');
  const [editResultDate, setEditResultDate] = useState('');
  const [editResultFinalScore, setEditResultFinalScore] = useState('');
  const [editResultGoalScorers, setEditResultGoalScorers] = useState('');
  const [editResultPublished, setEditResultPublished] = useState(true);
  const [editResultSortOrder, setEditResultSortOrder] = useState('1');

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
      await refetch();
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
      await refetch();
    });
  }

  return {
    newResultTeam, setNewResultTeam, newResultOpponent, setNewResultOpponent,
    newResultDate, setNewResultDate, newResultFinalScore, setNewResultFinalScore,
    newResultGoalScorers, setNewResultGoalScorers, newResultPublished, setNewResultPublished,
    handleCreateResult,
    editingResultId, editResultTeam, setEditResultTeam, editResultOpponent, setEditResultOpponent,
    editResultDate, setEditResultDate, editResultFinalScore, setEditResultFinalScore,
    editResultGoalScorers, setEditResultGoalScorers, editResultPublished, setEditResultPublished,
    handleSaveResult, cancelEditResult, startEditResult, handleDeleteResult,
  };
}
