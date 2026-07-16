'use client';
import * as React from 'react';
import { Fixture } from '../types';

type TeamSlot = { _key: string; team: string; time: string; coach: string; umpire: string; durationOverride: string };
type FixtureBlock = {
  _key: string; date: string; venue: string; homeAway: string; duration: string; note: string;
  slots: TeamSlot[];
};

type Props = {
  fixtures: Fixture[];
  busy: boolean;
  teamOptions: string[];
  newFixtureOpponent: string; setNewFixtureOpponent: (v: string) => void;
  newFixtureBlocks: FixtureBlock[];
  addFixtureBlock: () => void;
  removeFixtureBlock: (key: string) => void;
  updateFixtureBlock: (key: string, field: 'date'|'venue'|'homeAway'|'duration'|'note', value: string) => void;
  addTeamSlot: (blockKey: string) => void;
  updateTeamSlot: (blockKey: string, slotKey: string, field: keyof TeamSlot, value: string) => void;
  removeTeamSlot: (blockKey: string, slotKey: string) => void;
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

const inputCls = "rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500";
const inputClsAlt = "rounded-lg border border-white/8 bg-[rgba(255,255,255,0.02)] px-2.5 py-2 text-xs text-white outline-none focus:border-sky-500";

export function FixturesSection({
  fixtures, busy, newFixtureOpponent, setNewFixtureOpponent,
  newFixtureBlocks, addFixtureBlock, removeFixtureBlock, updateFixtureBlock,
  addTeamSlot, updateTeamSlot, removeTeamSlot,
  newFixturePublished, setNewFixturePublished, handleCreateFixture,
  editingFixtureId, editFixtureTeam, setEditFixtureTeam, editFixtureOpponent, setEditFixtureOpponent,
  editFixtureDate, setEditFixtureDate, editFixtureTime, setEditFixtureTime, editFixtureVenue, setEditFixtureVenue,
  editFixtureCoach, setEditFixtureCoach, editFixtureUmpire, setEditFixtureUmpire, editFixtureNotes, setEditFixtureNotes,
  editFixtureHomeAway, setEditFixtureHomeAway, editFixturePublished, setEditFixturePublished,
  handleSaveFixture, cancelEditFixture, startEditFixture, handleDeleteFixture, moveItem, formatDate, teamOptions,
}: Props) {

  // Total team slots that actually have a team picked, across all blocks —
  // drives the submit button label ("Add 9 Fixtures").
  const totalSlots = newFixtureBlocks.reduce((n, b) => n + b.slots.filter(s => s.team.trim()).length, 0);

  // Group the existing fixture list by opponent + date + venue, so one tie
  // (e.g. 9 fixtures vs St David's across 3 dates/venues) reads as a few
  // labelled blocks instead of a wall of near-identical cards.
  const groups = React.useMemo(() => {
    const out: { key: string; opponent: string; date: string; venue: string; items: { fixture: Fixture; index: number }[] }[] = [];
    fixtures.forEach((f, index) => {
      const key = `${f.opponent}__${f.fixture_date}__${f.venue}`;
      const g = out.find(g => g.key === key);
      if (g) g.items.push({ fixture: f, index });
      else out.push({ key, opponent: f.opponent, date: f.fixture_date, venue: f.venue, items: [{ fixture: f, index }] });
    });
    return out;
  }, [fixtures]);
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {/* ── CREATE — block builder ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-1 text-lg font-semibold">Add Fixtures</h2>
        <p className="mb-4 text-[11px] text-slate-500">
          One opponent tie, e.g. &quot;vs St David&apos;s&quot;, laid out the way the real fixture sheet is: a <strong className="text-slate-300">block</strong> per date+venue (edit it once, applies to every team inside), each block holding the <strong className="text-slate-300">teams</strong> playing there.
        </p>
        <form onSubmit={handleCreateFixture} className="space-y-4">

          <input value={newFixtureOpponent} onChange={(e) => setNewFixtureOpponent(e.target.value)}
            placeholder="Opponent (e.g. St David's)"
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-sky-500" />

          <div className="space-y-3">
            {newFixtureBlocks.map((block, bi) => (
              <div key={block._key} className="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-3">
                {/* Block header — shared date/venue/home-away/duration/note */}
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sky-400">
                    Block {bi + 1}{block.date ? ` · ${formatDate(block.date)}` : ''}{block.venue ? ` · ${block.venue}` : ''}
                  </span>
                  <button type="button" onClick={() => removeFixtureBlock(block._key)} disabled={newFixtureBlocks.length === 1}
                    className="text-[11px] font-bold text-red-400 hover:text-red-300 disabled:opacity-20">Remove block</button>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <input type="date" value={block.date} onChange={(e) => updateFixtureBlock(block._key, 'date', e.target.value)} className={inputCls} />
                  <select value={block.homeAway} onChange={(e) => updateFixtureBlock(block._key, 'homeAway', e.target.value)} className={inputCls}>
                    <option value="home">Home</option>
                    <option value="away">Away</option>
                    <option value="neutral">Neutral</option>
                  </select>
                  <input value={block.venue} onChange={(e) => updateFixtureBlock(block._key, 'venue', e.target.value)} placeholder="Venue / field (e.g. SBC Astro)"
                    className={`col-span-2 ${inputCls}`} />
                  <input value={block.duration} onChange={(e) => updateFixtureBlock(block._key, 'duration', e.target.value)} placeholder="Default duration (e.g. 4 x 12 min Chukkas)"
                    className={`col-span-2 ${inputCls}`} />
                  <input value={block.note} onChange={(e) => updateFixtureBlock(block._key, 'note', e.target.value)} placeholder="Day note, e.g. bus times (optional, shown on every fixture in this block)"
                    className={`col-span-2 ${inputCls}`} />
                </div>

                {/* Team slots within this block */}
                <div className="space-y-1.5">
                  {block.slots.map(slot => (
                    <div key={slot._key} className="rounded-lg border border-white/6 bg-black/20 p-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <select value={slot.team} onChange={(e) => updateTeamSlot(block._key, slot._key, 'team', e.target.value)} className={`col-span-1 ${inputClsAlt}`}>
                          <option value="">Team…</option>
                          {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input type="time" value={slot.time} onChange={(e) => updateTeamSlot(block._key, slot._key, 'time', e.target.value)} className={inputCls} />
                        <input value={slot.coach} onChange={(e) => updateTeamSlot(block._key, slot._key, 'coach', e.target.value)} placeholder="Coach" className={inputCls} />
                        <input value={slot.umpire} onChange={(e) => updateTeamSlot(block._key, slot._key, 'umpire', e.target.value)} placeholder="Umpire" className={inputCls} />
                        <input value={slot.durationOverride} onChange={(e) => updateTeamSlot(block._key, slot._key, 'durationOverride', e.target.value)}
                          placeholder={block.duration ? `Override (default: ${block.duration})` : 'Duration override (optional)'}
                          className={`col-span-2 ${inputCls} placeholder:text-slate-600`} />
                      </div>
                      <div className="mt-1 flex justify-end">
                        <button type="button" onClick={() => removeTeamSlot(block._key, slot._key)} disabled={block.slots.length === 1}
                          className="text-[10px] font-bold text-red-400/80 hover:text-red-300 disabled:opacity-20">Remove team</button>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addTeamSlot(block._key)}
                  className="mt-2 w-full rounded-lg border border-dashed border-sky-700/40 py-1.5 text-[11px] font-bold text-sky-400/80 hover:border-sky-500/60 hover:text-sky-300">
                  + Add Team to this block
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addFixtureBlock}
            className="w-full rounded-xl border border-dashed border-slate-700 py-2 text-xs font-bold text-slate-400 hover:border-sky-500/50 hover:text-sky-300">
            + Add Block (new date / venue)
          </button>

          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input type="checkbox" checked={newFixturePublished} onChange={(e) => setNewFixturePublished(e.target.checked)} className="h-4 w-4" /> Published
          </label>
          <button type="submit" disabled={busy || totalSlots === 0} className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-2.5 text-sm font-black text-sky-300 disabled:opacity-50">
            {totalSlots > 1 ? `Add ${totalSlots} Fixtures` : totalSlots === 1 ? 'Add Fixture' : 'Add at least one team'}
          </button>
        </form>
      </div>

      {/* ── LIST — grouped by opponent + date + venue ───────────────────────── */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="mb-4 text-lg font-semibold">Fixtures ({fixtures.length})</h2>
        {fixtures.length === 0 ? <p className="text-sm text-slate-500">No fixtures yet.</p> : (
          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {groups.map(group => {
              const isCollapsed = collapsed[group.key] ?? group.items.length > 3; // big groups start collapsed
              return (
                <div key={group.key} className="rounded-xl border border-slate-700/60 bg-slate-950/60">
                  <button type="button" onClick={() => setCollapsed(c => ({ ...c, [group.key]: !isCollapsed }))}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">vs {group.opponent}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(group.date)} · {group.venue || 'Venue TBC'} · {group.items.length} team{group.items.length === 1 ? '' : 's'}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </button>

                  {!isCollapsed && (
                    <div className="space-y-2 border-t border-slate-800 px-3 pb-3 pt-2.5">
                      {group.items.map(({ fixture, index }) => {
                        const isEditing = editingFixtureId === fixture.id;
                        return (
                          <div key={fixture.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <select value={editFixtureTeam} onChange={(e) => setEditFixtureTeam(e.target.value)} className={inputClsAlt}>
                                    <option value="">Select Team</option>
                                    {teamOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                  <input value={editFixtureOpponent} onChange={(e) => setEditFixtureOpponent(e.target.value)} placeholder="Opponent" className={inputCls} />
                                  <input type="date" value={editFixtureDate} onChange={(e) => setEditFixtureDate(e.target.value)} className={inputCls} />
                                  <input type="time" value={editFixtureTime} onChange={(e) => setEditFixtureTime(e.target.value)} className={inputCls} />
                                  <input value={editFixtureVenue} onChange={(e) => setEditFixtureVenue(e.target.value)} placeholder="Venue" className={`col-span-2 ${inputCls}`} />
                                  <select value={editFixtureHomeAway} onChange={(e) => setEditFixtureHomeAway(e.target.value)} className={inputCls}>
                                    <option value="home">Home</option>
                                    <option value="away">Away</option>
                                    <option value="neutral">Neutral</option>
                                  </select>
                                  <input value={editFixtureCoach} onChange={(e) => setEditFixtureCoach(e.target.value)} placeholder="Coach" className={inputCls} />
                                  <input value={editFixtureUmpire} onChange={(e) => setEditFixtureUmpire(e.target.value)} placeholder="Umpire" className={inputCls} />
                                  <input value={editFixtureNotes} onChange={(e) => setEditFixtureNotes(e.target.value)} placeholder="Notes" className={`col-span-2 ${inputCls}`} />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={editFixturePublished} onChange={(e) => setEditFixturePublished(e.target.checked)} className="h-4 w-4" /> Published</label>
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveFixture(fixture.id)} className="rounded-lg border border-sky-500 bg-sky-500/15 px-3 py-1.5 text-xs font-black text-sky-300">Save</button>
                                  <button onClick={cancelEditFixture} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-300">Cancel</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-white">{fixture.team}</p>
                                  <p className="text-[11px] text-slate-400">{fixture.fixture_time || 'Time TBC'}{fixture.notes ? ` · ${fixture.notes}` : ''}</p>
                                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[9px] font-black ${fixture.is_published ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-700 text-slate-400'}`}>{fixture.is_published ? 'Published' : 'Draft'}</span>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
