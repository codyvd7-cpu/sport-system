import { Fixture } from '../types';

type Props = {
  fixtures: Fixture[];
  busy: boolean;
  newFixtureTeams: string[]; setNewFixtureTeams: (v: string[]) => void;
  teamOptions: string[];
  newFixtureOpponent: string; setNewFixtureOpponent: (v: string) => void;
  newFixtureDate: string; setNewFixtureDate: (v: string) => void;
  newFixtureTime: string; setNewFixtureTime: (v: string) => void;
  newFixtureVenue: string; setNewFixtureVenue: (v: string) => void;
  newFixtureCoach: string; setNewFixtureCoach: (v: string) => void;
  newFixtureUmpire: string; setNewFixtureUmpire: (v: string) => void;
  newFixtureNotes: string; setNewFixtureNotes: (v: string) => void;
  newFixtureHomeAway: string; setNewFixtureHomeAway: (v: string) => void;
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

export function FixturesSection({ fixtures, busy, newFixtureTeams, setNewFixtureTeams, newFixtureOpponent, setNewFixtureOpponent, newFixtureDate, setNewFixtureDate, newFixtureTime, setNewFixtureTime, newFixtureVenue, setNewFixtureVenue, newFixtureCoach, setNewFixtureCoach, newFixtureUmpire, setNewFixtureUmpire, newFixtureNotes, setNewFixtureNotes, newFixtureHomeAway, setNewFixtureHomeAway, newFixturePublished, setNewFixturePublished, handleCreateFixture, editingFixtureId, editFixtureTeam, setEditFixtureTeam, editFixtureOpponent, setEditFixtureOpponent, editFixtureDate, setEditFixtureDate, editFixtureTime, setEditFixtureTime, editFixtureVenue, setEditFixtureVenue, editFixtureCoach, setEditFixtureCoach, editFixtureUmpire, setEditFixtureUmpire, editFixtureNotes, setEditFixtureNotes, editFixtureHomeAway, setEditFixtureHomeAway, editFixturePublished, setEditFixturePublished, handleSaveFixture, cancelEditFixture, startEditFixture, handleDeleteFixture, moveItem, formatDate, teamOptions }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Create */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Fixture</h2>
        <form onSubmit={handleCreateFixture} className="space-y-4">

          {/* Teams playing — tick every team facing this opponent, e.g. when the
              whole school plays St John's on the same day */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-slate-400">Teams Playing</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setNewFixtureTeams(teamOptions)}
                  className="text-[11px] font-bold text-sky-400 hover:text-sky-300">Select all</button>
                <button type="button" onClick={() => setNewFixtureTeams([])}
                  className="text-[11px] font-bold text-slate-500 hover:text-slate-400">Clear</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/8 bg-[rgba(255,255,255,0.02)] p-3 sm:grid-cols-3">
              {teamOptions.map(t => {
                const checked = newFixtureTeams.includes(t);
                return (
                  <label key={t} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-semibold transition ${checked ? 'border-sky-500 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-950 text-slate-400'}`}>
                    <input type="checkbox" checked={checked} className="h-3.5 w-3.5 accent-sky-500"
                      onChange={(e) => setNewFixtureTeams(e.target.checked ? [...newFixtureTeams, t] : newFixtureTeams.filter(x => x !== t))} />
                    {t}
                  </label>
                );
              })}
            </div>
            {newFixtureTeams.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Will create <span className="font-bold text-sky-400">{newFixtureTeams.length}</span> fixture{newFixtureTeams.length===1?'':'s'} — one per selected team, same opponent/date/venue.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input value={newFixtureOpponent} onChange={(e) => setNewFixtureOpponent(e.target.value)} placeholder="Opponent" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input type="date" value={newFixtureDate} onChange={(e) => setNewFixtureDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input type="time" value={newFixtureTime} onChange={(e) => setNewFixtureTime(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newFixtureVenue} onChange={(e) => setNewFixtureVenue(e.target.value)} placeholder="Venue" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <select value={newFixtureHomeAway} onChange={(e) => setNewFixtureHomeAway(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
              <option value="home">Home</option>
              <option value="away">Away</option>
              <option value="neutral">Neutral</option>
            </select>
            <input value={newFixtureCoach} onChange={(e) => setNewFixtureCoach(e.target.value)} placeholder="Coach" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newFixtureUmpire} onChange={(e) => setNewFixtureUmpire(e.target.value)} placeholder="Umpire" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newFixtureNotes} onChange={(e) => setNewFixtureNotes(e.target.value)} placeholder="Notes (optional)" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={newFixturePublished} onChange={(e) => setNewFixturePublished(e.target.checked)} className="h-4 w-4" /> Published
          </label>
          <button type="submit" disabled={busy || newFixtureTeams.length === 0} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">
            {newFixtureTeams.length > 1 ? `Add ${newFixtureTeams.length} Fixtures` : 'Add Fixture'}
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