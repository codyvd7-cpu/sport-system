import { WorkoutProgram, WorkoutProgramExercise } from '../types';

type Props = {
  programs: WorkoutProgram[]; busy: boolean;
  selectedProgramId: string; setSelectedProgramId: (v: string) => void;
  selectedProgram: WorkoutProgram | null; selectedExercises: WorkoutProgramExercise[];
  newProgramTitle: string; setNewProgramTitle: (v: string) => void;
  newProgramTeam: string; setNewProgramTeam: (v: string) => void;
  newProgramSport: string; setNewProgramSport: (v: string) => void;
  handleCreateProgram: (e: React.FormEvent) => void;
  toggleProgramActive: (p: WorkoutProgram) => void;
  handleDeleteProgram: (id: string) => void;
  newExerciseName: string; setNewExerciseName: (v: string) => void;
  newExerciseSets: string; setNewExerciseSets: (v: string) => void;
  newExerciseReps: string; setNewExerciseReps: (v: string) => void;
  handleAddExercise: (e: React.FormEvent) => void;
  editingExerciseId: string | null;
  editExerciseName: string; setEditExerciseName: (v: string) => void;
  editExerciseSets: string; setEditExerciseSets: (v: string) => void;
  editExerciseReps: string; setEditExerciseReps: (v: string) => void;
  startEditExercise: (e: WorkoutProgramExercise) => void; cancelEditExercise: () => void;
  handleSaveExercise: (id: string) => void; handleDeleteExercise: (id: string) => void;
};

export function WorkoutProgramsSection({
  programs, busy, selectedProgramId, setSelectedProgramId, selectedProgram, selectedExercises,
  newProgramTitle, setNewProgramTitle, newProgramTeam, setNewProgramTeam, newProgramSport, setNewProgramSport,
  handleCreateProgram, toggleProgramActive, handleDeleteProgram,
  newExerciseName, setNewExerciseName, newExerciseSets, setNewExerciseSets, newExerciseReps, setNewExerciseReps,
  handleAddExercise, editingExerciseId, editExerciseName, setEditExerciseName, editExerciseSets, setEditExerciseSets,
  editExerciseReps, setEditExerciseReps, startEditExercise, cancelEditExercise, handleSaveExercise, handleDeleteExercise,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      {/* Programs list + create */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
        <h2 className="mb-4 text-lg font-semibold">New Program</h2>
        <form onSubmit={handleCreateProgram} className="mb-5 space-y-3">
          <input value={newProgramTitle} onChange={(e) => setNewProgramTitle(e.target.value)} placeholder="e.g. Pre-Season Strength" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input value={newProgramTeam} onChange={(e) => setNewProgramTeam(e.target.value)} placeholder="Team (blank = all teams)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input value={newProgramSport} onChange={(e) => setNewProgramSport(e.target.value)} placeholder="Sport (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Create Program</button>
        </form>

        <h2 className="mb-3 text-sm font-semibold text-slate-400">Programs ({programs.length})</h2>
        {programs.length === 0 ? <p className="text-sm text-slate-500">No programs yet.</p> : (
          <div className="space-y-2">
            {programs.map(p => (
              <button key={p.id} onClick={() => setSelectedProgramId(p.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${selectedProgramId === p.id || (!selectedProgramId && programs[0]?.id === p.id) ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-950/40'}`}>
                <p className="text-sm font-semibold text-white">{p.title}</p>
                <p className="text-xs text-slate-500">{p.team || 'All teams'}{p.sport ? ` · ${p.sport}` : ''}</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${p.is_active ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{p.is_active ? 'Active' : 'Hidden'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected program's exercise list */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
        {!selectedProgram ? (
          <p className="text-sm text-slate-500">Create or select a program to build its exercise list.</p>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{selectedProgram.title} — Exercises</h2>
              <div className="flex gap-2">
                <button onClick={() => toggleProgramActive(selectedProgram)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">{selectedProgram.is_active ? 'Hide' : 'Show'}</button>
                <button onClick={() => handleDeleteProgram(selectedProgram.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-300">Delete Program</button>
              </div>
            </div>

            <form onSubmit={handleAddExercise} className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_100px_auto]">
              <input value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} placeholder="Exercise name (e.g. Back Squat)" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
              <input value={newExerciseSets} onChange={(e) => setNewExerciseSets(e.target.value)} placeholder="Sets" type="number" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
              <input value={newExerciseReps} onChange={(e) => setNewExerciseReps(e.target.value)} placeholder="Reps (e.g. 8-10)" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
              <button type="submit" disabled={busy} className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add</button>
            </form>

            {selectedExercises.length === 0 ? <p className="text-sm text-slate-500">No exercises in this program yet.</p> : (
              <div className="space-y-2">
                {selectedExercises.map(ex => {
                  const isEditing = editingExerciseId === ex.id;
                  return (
                    <div key={ex.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                      {isEditing ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_90px_100px_auto]">
                          <input value={editExerciseName} onChange={(e) => setEditExerciseName(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                          <input value={editExerciseSets} onChange={(e) => setEditExerciseSets(e.target.value)} type="number" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                          <input value={editExerciseReps} onChange={(e) => setEditExerciseReps(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveExercise(ex.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                            <button onClick={cancelEditExercise} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-white">{ex.name}</p>
                            <p className="text-xs text-slate-500">{[ex.target_sets ? `${ex.target_sets} sets` : null, ex.target_reps].filter(Boolean).join(' · ') || 'No target set'}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={() => startEditExercise(ex)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                            <button onClick={() => handleDeleteExercise(ex.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
