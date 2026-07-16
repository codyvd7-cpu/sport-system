import { Fixture } from '../types';

type FixtureRow = {
  _key: string; team: string; date: string; time: string; venue: string;
  homeAway: string; duration: string; coach: string; umpire: string; notes: string;
};

type Props = {
  fixtures: Fixture[];
  busy: boolean;
  teamOptions: string[];
  newFixtureOpponent: string; setNewFixtureOpponent: (v: string) => void;
  newFixtureRows: FixtureRow[];
  addFixtureRow: () => void;
  updateFixtureRow: (key: string, field: keyof FixtureRow, value: string) => void;
  removeFixtureRow: (key: string) => void;
  newFixturePublished: boolean; setNewFixturePublished: (v: boolean) => void;
  handleCreateFixture: (e: React.FormEvent) => void;
  editingFixtureId: string | null;
  editFixtureTeam: string; setEditFixtureTeam: (v: string) => void;
  editFixtureOpponent: string; setEditFixtureOpponent: (v: string) => void;
  editFixtureDate: string; setEditFixtureDate: (v: string) => void;
  editFixtureTime: string; setEditFixtureTime: (v: string) => void;
  editFixtureVenue: string; setEditFixtureVenue: (v: string) => void;
  editFixtureCoach: string; setEditFixtureCoach: (v: string) => void;
  editFixtureUmpire: string; setEditFixtureUmpire: (v: string) => void;
  editFixtureNotes: string; setEditFixtureNotes: (v: string) => void;
  editFixtureHomeAway: string; setEditFixtureHomeAway: (v: string) => void;
  editFixturePublished: boolean; setEditFixturePublished: (v: boolean) => void;
  handleSaveFixture: (id: string) => void;
  cancelEditFixture: () => void;
  startEditFixture: (f: Fixture) => void;
  handleDeleteFixture: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
  formatDate: (d?: string | null) => string;
};

export function FixturesSection({ fixtures, busy, newFixtureOpponent, setNewFixtureOpponent, newFixtureRows, addFixtureRow, updateFixtureRow, removeFixtureRow, newFixturePublished, setNewFixturePublished, handleCreateFixture, editingFixtureId, editFixtureTeam, setEditFixtureTeam, editFixtureOpponent, setEditFixtureOpponent, editFixtureDate, setEditFixtureDate, editFixtureTime, setEditFixtureTime, editFixtureVenue, setEditFixtureVenue, editFixtureCoach, setEditFixtureCoach, editFixtureUmpire, setEditFixtureUmpire, editFixtureNotes, setEditFixtureNotes, editFixtureHomeAway, setEditFixtureHomeAway, editFixturePublished, setEditFixturePublished, handleSaveFixture, cancelEditFixture, startEditFixture, handleDeleteFixture, moveItem, formatDate, teamOptions }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Create — bulk row entry. One opponent tie (e.g. "vs St David's") can span
          several dates and even several venues on the same date, with different
          times/coaches/umpires/duration per team — so each row is independent. */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-1 text-lg font-semibold">Add Fixtures</h2>
        <p className="mb-4 text-[11px] text-slate-500">One opponent, as many rows as you need — each row is its own date/time/team/venue.</p>
        <form onSubmit={handleCreateFixture} className="space-y-4">

          <input value={newFixtureOpponent} onChange={(e) => setNewFixtureOpponent(e.target.value)}
            placeholder="Opponent (e.g. St David's)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-sky-500" />

          <div className="space-y-2.5">
            {newFixtureRows.map((row, i) => (
              <div key={row._key} className="rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Row {i + 1}</span>
                  <button type="button" onClick={() => removeFixtureRow(row._key)} disabled={newFixtureRows.length === 1}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 disabled:opacity-20 disabled:hover:text-red-400">Remove</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" value={row.date} onChange={(e) => updateFixtureRow(row._key, 'date', e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input type="time" value={row.time} onChange={(e) => updateFixtureRow(row._key, 'time', e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <select value={row.team} onChange={(e) => updateFixtureRow(row._key, 'team', e.target.value)}
                    className="rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500">
                    <option value="">Team…</option>
                    {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={row.homeAway} onChange={(e) => updateFixtureRow(row._key, 'homeAway', e.target.value)}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500">
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                    <option value="neutral">Neutral</option>
                  </select>
                  <input value={row.venue} onChange={(e) => updateFixtureRow(row._key, 'venue', e.target.value)} placeholder="Venue / field"
                    className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input value={row.duration} onChange={(e) => updateFixtureRow(row._key, 'duration', e.target.value)} placeholder="Duration (e.g. 4 x 12 min)"
                    className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input value={row.coach} onChange={(e) => updateFixtureRow(row._key, 'coach', e.target.value)} placeholder="Coach"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input value={row.umpire} onChange={(e) => updateFixtureRow(row._key, 'umpire', e.target.value)} placeholder="Umpire"
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                  <input value={row.notes} onChange={(e) => updateFixtureRow(row._key, 'notes', e.target.value)} placeholder="Notes (optional)"
                    className="col-span-2 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500" />
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addFixtureRow}
            className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-xs font-bold text-slate-400 hover:border-sky-500/50 hover:text-sky-300">
            + Add Row
          </button>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={newFixturePublished} onChange={(e) => setNewFixturePublished(e.target.checked)} className="h-4 w-4" /> Published
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">
            {newFixtureRows.length > 1 ? `Add ${newFixtureRows.length} Fixtures` : 'Add Fixture'}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Fixtures ({fixtures.length})</h2>
        {fixtures.length === 0 ? <p className="text-sm text-slate-500">No fixtures yet.</p> : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {fixtures.map((fixture, index) => {
              const isEditing = editingFixtureId === fixture.id;
              return (
                <div key={fixture.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <select value={editFixtureTeam} onChange={(e) => setEditFixtureTeam(e.target.value)} className="rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-3 py-2 text-sm text-white outline-none">
                          <option value="">Select Team</option>
                          {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={editFixtureOpponent} onChange={(e) => setEditFixtureOpponent(e.target.value)} placeholder="Opponent" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input type="date" value={editFixtureDate} onChange={(e) => setEditFixtureDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input type="time" value={editFixtureTime} onChange={(e) => setEditFixtureTime(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editFixtureVenue} onChange={(e) => setEditFixtureVenue(e.target.value)} placeholder="Venue" className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <select value={editFixtureHomeAway} onChange={(e) => setEditFixtureHomeAway(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none">
                          <option value="home">Home</option>
                          <option value="away">Away</option>
                          <option value="neutral">Neutral</option>
                        </select>
                        <input value={editFixtureCoach} onChange={(e) => setEditFixtureCoach(e.target.value)} placeholder="Coach" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editFixtureUmpire} onChange={(e) => setEditFixtureUmpire(e.target.value)} placeholder="Umpire" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editFixtureNotes} onChange={(e) => setEditFixtureNotes(e.target.value)} placeholder="Notes" className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editFixturePublished} onChange={(e) => setEditFixturePublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveFixture(fixture.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                        <button onClick={cancelEditFixture} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{fixture.team} vs {fixture.opponent}</p>
                        <p className="text-xs text-slate-400">{formatDate(fixture.fixture_date)}{fixture.fixture_time ? ` · ${fixture.fixture_time}` : ''} · {fixture.venue || 'Venue TBC'}</p>
                        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${fixture.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{fixture.is_published ? 'Published' : 'Draft'}</span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => moveItem('portal_fixtures', fixtures, index, 'up')} disabled={index === 0} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↑</button>
                        <button onClick={() => moveItem('portal_fixtures', fixtures, index, 'down')} disabled={index === fixtures.length - 1} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs disabled:opacity-30">↓</button>
                        <button onClick={() => startEditFixture(fixture)} className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300">Edit</button>
                        <button onClick={() => handleDeleteFixture(fixture.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300">Del</button>
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