import { useState, useMemo } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkoutProgram, WorkoutProgramExercise } from '../types';

export interface UseWorkoutProgramsAdminDeps {
  supabase: SupabaseClient;
  programs: WorkoutProgram[];
  exercises: WorkoutProgramExercise[];
  runAction: (action: () => Promise<void>) => Promise<void>;
  showToast: (msg: string) => void;
  setError: (msg: string) => void;
  refetch: () => Promise<void>;
}

export function useWorkoutProgramsAdmin({ supabase, programs, exercises, runAction, showToast, setError, refetch }: UseWorkoutProgramsAdminDeps) {
  // ── Selection ────────────────────────────────────────────────────────────────
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const selectedProgram = useMemo(() => {
    if (!selectedProgramId && programs.length > 0) return programs[0];
    return programs.find(p => p.id === selectedProgramId) || null;
  }, [selectedProgramId, programs]);
  const selectedExercises = useMemo(() => {
    if (!selectedProgram) return [];
    return exercises.filter(e => e.program_id === selectedProgram.id).sort((a, b) => a.sort_order - b.sort_order);
  }, [selectedProgram, exercises]);

  // ── Create program ──────────────────────────────────────────────────────────
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramCategory, setNewProgramCategory] = useState<'junior'|'senior'|''>('');
  const [newProgramSport, setNewProgramSport] = useState('');

  async function handleCreateProgram(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      if (!newProgramTitle.trim()) { setError('Program title is required.'); return; }
      const { error: insertError } = await supabase.from('workout_programs').insert([{
        title: newProgramTitle.trim(),
        age_category: newProgramCategory || null,
        sport: newProgramSport.trim() || null,
        is_active: true,
        sort_order: programs.length + 1,
      }]);
      if (insertError) { setError(insertError.message || 'Failed to create program.'); return; }
      setNewProgramTitle(''); setNewProgramCategory(''); setNewProgramSport('');
      showToast('Workout program created.');
      await refetch();
    });
  }

  async function toggleProgramActive(program: WorkoutProgram) {
    await runAction(async () => {
      const { error: updateError } = await supabase.from('workout_programs')
        .update({ is_active: !program.is_active }).eq('id', program.id);
      if (updateError) { setError(updateError.message || 'Failed to update program.'); return; }
      await refetch();
    });
  }

  async function handleDeleteProgram(id: string) {
    const confirmed = window.confirm('Delete this program and its entire exercise list?');
    if (!confirmed) return;
    await runAction(async () => {
      const { error: deleteError } = await supabase.from('workout_programs').delete().eq('id', id);
      if (deleteError) { setError(deleteError.message || 'Failed to delete program.'); return; }
      if (selectedProgramId === id) setSelectedProgramId('');
      showToast('Program deleted.');
      await refetch();
    });
  }

  // ── Exercises within the selected program ───────────────────────────────────
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseSets, setNewExerciseSets] = useState('');
  const [newExerciseReps, setNewExerciseReps] = useState('');

  async function handleAddExercise(e: React.FormEvent) {
    e.preventDefault();
    await runAction(async () => {
      if (!selectedProgram) { setError('Select a program first.'); return; }
      if (!newExerciseName.trim()) { setError('Exercise name is required.'); return; }
      const { error: insertError } = await supabase.from('workout_program_exercises').insert([{
        program_id: selectedProgram.id,
        name: newExerciseName.trim(),
        target_sets: newExerciseSets ? Number(newExerciseSets) : null,
        target_reps: newExerciseReps.trim() || null,
        sort_order: selectedExercises.length + 1,
      }]);
      if (insertError) { setError(insertError.message || 'Failed to add exercise.'); return; }
      setNewExerciseName(''); setNewExerciseSets(''); setNewExerciseReps('');
      showToast('Exercise added.');
      await refetch();
    });
  }

  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExerciseName, setEditExerciseName] = useState('');
  const [editExerciseSets, setEditExerciseSets] = useState('');
  const [editExerciseReps, setEditExerciseReps] = useState('');

  function startEditExercise(ex: WorkoutProgramExercise) {
    setEditingExerciseId(ex.id);
    setEditExerciseName(ex.name);
    setEditExerciseSets(ex.target_sets != null ? String(ex.target_sets) : '');
    setEditExerciseReps(ex.target_reps || '');
  }
  function cancelEditExercise() {
    setEditingExerciseId(null); setEditExerciseName(''); setEditExerciseSets(''); setEditExerciseReps('');
  }

  async function handleSaveExercise(id: string) {
    await runAction(async () => {
      if (!editExerciseName.trim()) { setError('Exercise name is required.'); return; }
      const { error: updateError } = await supabase.from('workout_program_exercises').update({
        name: editExerciseName.trim(),
        target_sets: editExerciseSets ? Number(editExerciseSets) : null,
        target_reps: editExerciseReps.trim() || null,
      }).eq('id', id);
      if (updateError) { setError(updateError.message || 'Failed to update exercise.'); return; }
      showToast('Exercise updated.');
      cancelEditExercise();
      await refetch();
    });
  }

  async function handleDeleteExercise(id: string) {
    const confirmed = window.confirm('Delete this exercise? This also removes any logs players have recorded against it.');
    if (!confirmed) return;
    await runAction(async () => {
      const { error: deleteError } = await supabase.from('workout_program_exercises').delete().eq('id', id);
      if (deleteError) { setError(deleteError.message || 'Failed to delete exercise.'); return; }
      showToast('Exercise deleted.');
      await refetch();
    });
  }

  return {
    selectedProgramId, setSelectedProgramId, selectedProgram, selectedExercises,
    newProgramTitle, setNewProgramTitle, newProgramCategory, setNewProgramCategory, newProgramSport, setNewProgramSport,
    handleCreateProgram, toggleProgramActive, handleDeleteProgram,
    newExerciseName, setNewExerciseName, newExerciseSets, setNewExerciseSets, newExerciseReps, setNewExerciseReps,
    handleAddExercise,
    editingExerciseId, editExerciseName, setEditExerciseName, editExerciseSets, setEditExerciseSets,
    editExerciseReps, setEditExerciseReps,
    startEditExercise, cancelEditExercise, handleSaveExercise, handleDeleteExercise,
  };
}
