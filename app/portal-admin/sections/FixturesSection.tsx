import { Fixture } from '../types';

type Props = {
  fixtures: Fixture[];
  busy: boolean;
  newFixtureTeam: string; setNewFixtureTeam: (v: string) => void;
  newFixtureOpponent: string; setNewFixtureOpponent: (v: string) => void;
  newFixtureDate: string; setNewFixtureDate: (v: string) => void;
  newFixtureTime: string; setNewFixtureTime: (v: string) => void;
  newFixtureVenue: string; setNewFixtureVenue: (v: string) => void;
  newFixturePublished: boolean; setNewFixturePublished: (v: boolean) => void;
  handleCreateFixture: (e: React.FormEvent) => void;
  editingFixtureId: string | null;
  editFixtureTeam: string; setEditFixtureTeam: (v: string) => void;
  editFixtureOpponent: string; setEditFixtureOpponent: (v: string) => void;
  editFixtureDate: string; setEditFixtureDate: (v: string) => void;
  editFixtureTime: string; setEditFixtureTime: (v: string) => void;
  editFixtureVenue: string; setEditFixtureVenue: (v: string) => void;
  editFixturePublished: boolean; setEditFixturePublished: (v: boolean) => void;
  handleSaveFixture: (id: string) => void;
  cancelEditFixture: () => void;
  startEditFixture: (f: Fixture) => void;
  handleDeleteFixture: (id: string) => void;
  moveItem: (table: string, items: any[], index: number, dir: 'up' | 'down') => void;
  formatDate: (d?: string | null) => string;
};

export function FixturesSection({ fixtures, busy, newFixtureTeam, setNewFixtureTeam, newFixtureOpponent, setNewFixtureOpponent, newFixtureDate, setNewFixtureDate, newFixtureTime, setNewFixtureTime, newFixtureVenue, setNewFixtureVenue, newFixturePublished, setNewFixturePublished, handleCreateFixture, editingFixtureId, editFixtureTeam, setEditFixtureTeam, editFixtureOpponent, setEditFixtureOpponent, editFixtureDate, setEditFixtureDate, editFixtureTime, setEditFixtureTime, editFixtureVenue, setEditFixtureVenue, editFixturePublished, setEditFixturePublished, handleSaveFixture, cancelEditFixture, startEditFixture, handleDeleteFixture, moveItem, formatDate }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* Create */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Add Fixture</h2>
        <form onSubmit={handleCreateFixture} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input value={newFixtureTeam} onChange={(e) => setNewFixtureTeam(e.target.value)} placeholder="Team" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newFixtureOpponent} onChange={(e) => setNewFixtureOpponent(e.target.value)} placeholder="Opponent" className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input type="date" value={newFixtureDate} onChange={(e) => setNewFixtureDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input type="time" value={newFixtureTime} onChange={(e) => setNewFixtureTime(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
            <input value={newFixtureVenue} onChange={(e) => setNewFixtureVenue(e.target.value)} placeholder="Venue" className="col-span-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={newFixturePublished} onChange={(e) => setNewFixturePublished(e.target.checked)} className="h-4 w-4" /> Published
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">Add Fixture</button>
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
                        <input value={editFixtureTeam} onChange={(e) => setEditFixtureTeam(e.target.value)} placeholder="Team" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editFixtureOpponent} onChange={(e) => setEditFixtureOpponent(e.target.value)} placeholder="Opponent" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input type="date" value={editFixtureDate} onChange={(e) => setEditFixtureDate(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input type="time" value={editFixtureTime} onChange={(e) => setEditFixtureTime(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
                        <input value={editFixtureVenue} onChange={(e) => setEditFixtureVenue(e.target.value)} placeholder="Venue" className="col-span-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none" />
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
