import { Program, DAY_OPTIONS, PROGRAM_CATEGORIES } from '../types';

type Props = {
  programs: Program[]; busy: boolean;
  newProgramTitle: string; setNewProgramTitle: (v: string) => void;
  newProgramCategory: string; setNewProgramCategory: (v: string) => void;
  newProgramDayLabel: string; setNewProgramDayLabel: (v: string) => void;
  newProgramDetails: string; setNewProgramDetails: (v: string) => void;
  newProgramPublished: boolean; setNewProgramPublished: (v: boolean) => void;
  newProgramFile: File | null; setNewProgramFile: (v: File | null) => void;
  handleCreateProgram: (e: React.FormEvent) => void;
  editingProgramId: string | null;
  editProgramTitle: string; setEditProgramTitle: (v: string) => void;
  editProgramCategory: string; setEditProgramCategory: (v: string) => void;
  editProgramDayLabel: string; setEditProgramDayLabel: (v: string) => void;
  editProgramDetails: string; setEditProgramDetails: (v: string) => void;
  editProgramPublished: boolean; setEditProgramPublished: (v: boolean) => void;
  editProgramFile: File | null; setEditProgramFile: (v: File | null) => void;
  handleSaveProgram: (id: string) => void; resetProgramEditFields: () => void;
  startEditProgram: (p: Program) => void; handleDeleteProgram: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
};

export function ProgramsSection({ programs, busy, newProgramTitle, setNewProgramTitle, newProgramCategory, setNewProgramCategory, newProgramDayLabel, setNewProgramDayLabel, newProgramDetails, setNewProgramDetails, newProgramPublished, setNewProgramPublished, newProgramFile, setNewProgramFile, handleCreateProgram, editingProgramId, editProgramTitle, setEditProgramTitle, editProgramCategory, setEditProgramCategory, editProgramDayLabel, setEditProgramDayLabel, editProgramDetails, setEditProgramDetails, editProgramPublished, setEditProgramPublished, editProgramFile, setEditProgramFile, handleSaveProgram, resetProgramEditFields, startEditProgram, handleDeleteProgram, moveItem }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Program</h2>
        <form onSubmit={handleCreateProgram} className="space-y-3">
          <input value={newProgramTitle} onChange={(e) => setNewProgramTitle(e.target.value)} placeholder="Program title" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <div className="grid grid-cols-2 gap-2">
            <select value={newProgramCategory} onChange={(e) => setNewProgramCategory(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
              {PROGRAM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <select value={newProgramDayLabel} onChange={(e) => setNewProgramDayLabel(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
              {DAY_OPTIONS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <textarea rows={3} value={newProgramDetails} onChange={(e) => setNewProgramDetails(e.target.value)} placeholder="Details" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          <input type="file" accept=".pdf" onChange={(e) => setNewProgramFile(e.target.files?.[0] || null)} className="block w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-200 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:text-white" />
          <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={newProgramPublished} onChange={(e) => setNewProgramPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Program</button>
        </form>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Programs ({programs.length}/4)</h2>
        {programs.length === 0 ? <p className="text-sm text-slate-500">No programs yet.</p> : (
          <div className="space-y-2">
            {programs.map((p, index) => {
              const isEditing = editingProgramId === p.id;
              return (
                <div key={p.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <input value={editProgramTitle} onChange={(e) => setEditProgramTitle(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editProgramCategory} onChange={(e) => setEditProgramCategory(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
                          {PROGRAM_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                        </select>
                        <select value={editProgramDayLabel} onChange={(e) => setEditProgramDayLabel(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
                          {DAY_OPTIONS.map((d) => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                      <textarea rows={2} value={editProgramDetails} onChange={(e) => setEditProgramDetails(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      <input type="file" accept=".pdf" onChange={(e) => setEditProgramFile(e.target.files?.[0] || null)} className="block w-full text-xs text-slate-300" />
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editProgramPublished} onChange={(e) => setEditProgramPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveProgram(p.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={resetProgramEditFields} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{p.title}</p>
                        <p className="text-xs text-slate-500">{p.category} · {p.day_label}</p>
                        {p.file_url && <a href={p.file_url} target="_blank" rel="noreferrer" className="text-[10px] text-sky-400 hover:underline">View PDF</a>}
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-black ${p.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{p.is_published ? 'Published' : 'Draft'}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_programs', programs, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_programs', programs, index, 'down')} disabled={index === programs.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditProgram(p)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteProgram(p.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
