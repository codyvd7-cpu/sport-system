import { Result } from '../types';

type Props = {
  results: Result[];
  busy: boolean;
  newResultTeam: string; setNewResultTeam: (v: string) => void;
  teamOptions: string[];
  newResultOpponent: string; setNewResultOpponent: (v: string) => void;
  newResultDate: string; setNewResultDate: (v: string) => void;
  newResultFinalScore: string; setNewResultFinalScore: (v: string) => void;
  newResultGoalScorers: string; setNewResultGoalScorers: (v: string) => void;
  newResultPublished: boolean; setNewResultPublished: (v: boolean) => void;
  handleCreateResult: (e: React.FormEvent) => void;
  editingResultId: string | null;
  editResultTeam: string; setEditResultTeam: (v: string) => void;
  editResultOpponent: string; setEditResultOpponent: (v: string) => void;
  editResultDate: string; setEditResultDate: (v: string) => void;
  editResultFinalScore: string; setEditResultFinalScore: (v: string) => void;
  editResultGoalScorers: string; setEditResultGoalScorers: (v: string) => void;
  editResultPublished: boolean; setEditResultPublished: (v: boolean) => void;
  handleSaveResult: (id: string) => void;
  cancelEditResult: () => void;
  startEditResult: (r: Result) => void;
  handleDeleteResult: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
  formatDate: (d?: string | null) => string;
};

export function ResultsSection({ results, busy, newResultTeam, setNewResultTeam, newResultOpponent, setNewResultOpponent, newResultDate, setNewResultDate, newResultFinalScore, setNewResultFinalScore, newResultGoalScorers, setNewResultGoalScorers, newResultPublished, setNewResultPublished, handleCreateResult, editingResultId, editResultTeam, setEditResultTeam, editResultOpponent, setEditResultOpponent, editResultDate, setEditResultDate, editResultFinalScore, setEditResultFinalScore, editResultGoalScorers, setEditResultGoalScorers, editResultPublished, setEditResultPublished, handleSaveResult, cancelEditResult, startEditResult, handleDeleteResult, moveItem, formatDate }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Create */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Result</h2>
        <form onSubmit={handleCreateResult} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <select value={newResultTeam} onChange={(e) => setNewResultTeam(e.target.value)} className="rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
              <option value="">Select Team</option>
              {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={newResultOpponent} onChange={(e) => setNewResultOpponent(e.target.value)} placeholder="Opponent" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input type="date" value={newResultDate} onChange={(e) => setNewResultDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newResultFinalScore} onChange={(e) => setNewResultFinalScore(e.target.value)} placeholder="Score e.g. 3-1" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newResultGoalScorers} onChange={(e) => setNewResultGoalScorers(e.target.value)} placeholder="Goal scorers" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={newResultPublished} onChange={(e) => setNewResultPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Result</button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Results ({results.length})</h2>
        {results.length === 0 ? <p className="text-sm text-slate-500">No results yet.</p> : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {results.map((result, index) => {
              const isEditing = editingResultId === result.id;
              const parts = (result.final_score || '').split(/[-–]/);
              const won = parts.length === 2 && parseInt(parts[0]) > parseInt(parts[1]);
              const drew = parts.length === 2 && parseInt(parts[0]) === parseInt(parts[1]);
              return (
                <div key={result.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editResultTeam} onChange={(e) => setEditResultTeam(e.target.value)} className="rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-white outline-none">
                          <option value="">Select Team</option>
                          {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={editResultOpponent} onChange={(e) => setEditResultOpponent(e.target.value)} placeholder="Opponent" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input type="date" value={editResultDate} onChange={(e) => setEditResultDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editResultFinalScore} onChange={(e) => setEditResultFinalScore(e.target.value)} placeholder="Score" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editResultGoalScorers} onChange={(e) => setEditResultGoalScorers(e.target.value)} placeholder="Scorers" className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editResultPublished} onChange={(e) => setEditResultPublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveResult(result.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={cancelEditResult} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${won ? 'bg-emerald-500/15 text-emerald-300' : drew ? 'bg-slate-700 text-slate-300' : 'bg-red-500/15 text-red-300'}`}>{won ? 'W' : drew ? 'D' : 'L'} {result.final_score}</span>
                          <p className="text-sm font-semibold text-white">{result.team} vs {result.opponent}</p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDate(result.result_date)}{result.goal_scorers ? ` · ${result.goal_scorers}` : ''}</p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_results', results, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_results', results, index, 'down')} disabled={index === results.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditResult(result)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteResult(result.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
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
