'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';

type GenericRow = Record<string, any>;

type Athlete = {
  id: string;
  name: string;
  team: string;
  ageGroup: string;
  raw: GenericRow;
};

function firstString(...values: any[]) {
  for (const v of values) {
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

function firstValue(...values: any[]) {
  for (const v of values) {
    if (v !== null && v !== undefined && v !== '') return String(v);
  }
  return '';
}

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstValue(row.id, row.athlete_id, safeUUID()),
    name:
      firstString(
        row.name, row.full_name, row.athlete_name, row.player_name,
        row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '',
        row.first_name
      ) || 'Unknown Athlete',
    team: firstString(row.team, row.team_name, row.squad, row.group_name) || 'Unassigned',
    ageGroup: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
    raw: row,
  };
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

const AGE_GROUPS = ['U14', 'U16', 'U18', 'U19', 'U21', 'Senior'];

export default function AthletesPage() {
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [ageGroup, setAgeGroup] = useState('');
  const [teamFilter, setTeamFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeam, setEditTeam] = useState('');
  const [editAgeGroup, setEditAgeGroup] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  async function loadAthletes() {
    setLoading(true);
    const { data, error: err } = await supabase.from('athletes').select('id, full_name, first_name, last_name, team, age_group, availability, position, player_code, is_active').order('full_name');
    if (err) { setError(err.message); setLoading(false); return; }
    setAthleteRows((data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadAthletes(); }, []);

  const athletes = useMemo(() =>
    athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name)),
    [athleteRows]
  );

  const uniqueTeams = useMemo(() =>
    Array.from(new Set(athletes.map((a) => a.team).filter((t) => t && t !== 'Unassigned'))).sort(),
    [athletes]
  );

  const filteredAthletes = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return athletes.filter((a) => {
      const matchesTeam = teamFilter === 'All' || a.team === teamFilter;
      const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.team.toLowerCase().includes(q) || a.ageGroup.toLowerCase().includes(q);
      return matchesTeam && matchesSearch;
    });
  }, [athletes, teamFilter, searchTerm]);

  async function handleAddAthlete(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setSubmitting(true); setError('');
    const insertAttempts = [
      { name: name.trim(), team: team.trim(), age_group: ageGroup || null },
      { full_name: name.trim(), team: team.trim(), age_group: ageGroup || null },
      { athlete_name: name.trim(), team: team.trim(), age_group: ageGroup || null },
      { name: name.trim(), team_name: team.trim(), age_group: ageGroup || null },
    ];
    let insertErr: any = null;
    for (const payload of insertAttempts) {
      const result = await supabase.from('athletes').insert([payload]);
      if (!result.error) { insertErr = null; break; }
      insertErr = result.error;
    }
    if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }
    setName(''); setTeam(''); setAgeGroup('');
    setSuccessMessage('Athlete added.');
    await loadAthletes();
    setSubmitting(false);
  }

  function startEdit(athlete: Athlete) {
    setEditingId(athlete.id);
    setEditName(athlete.name);
    setEditTeam(athlete.team === 'Unassigned' ? '' : athlete.team);
    setEditAgeGroup(athlete.ageGroup === '—' ? '' : athlete.ageGroup);
  }

  function cancelEdit() { setEditingId(null); setEditName(''); setEditTeam(''); setEditAgeGroup(''); }

  async function handleSaveEdit(id: string) {
    if (!editName.trim()) { setError('Name is required.'); return; }
    setEditSaving(true);
    const updateAttempts = [
      { name: editName.trim(), team: editTeam.trim() || 'Unassigned', age_group: editAgeGroup || null },
      { full_name: editName.trim(), team: editTeam.trim() || 'Unassigned', age_group: editAgeGroup || null },
      { athlete_name: editName.trim(), team: editTeam.trim() || 'Unassigned', age_group: editAgeGroup || null },
    ];
    let updateErr: any = null;
    for (const payload of updateAttempts) {
      const result = await supabase.from('athletes').update(payload).eq('id', id);
      if (!result.error) { updateErr = null; break; }
      updateErr = result.error;
    }
    const err = updateErr;
    if (err) { setError(err.message); setEditSaving(false); return; }
    setSuccessMessage('Athlete updated.');
    cancelEdit();
    await loadAthletes();
    setEditSaving(false);
  }

  async function handleDelete(athlete: Athlete) {
    if (!confirm(`Delete ${athlete.name}? This cannot be undone.`)) return;
    const { error: err } = await supabase.from('athletes').delete().eq('id', athlete.id);
    if (err) { setError(err.message); return; }
    setSuccessMessage('Athlete removed.');
    await loadAthletes();
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Roster Management</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Athletes</h1>
          <p className="mt-1 text-sm text-slate-500">{athletes.length} players across {uniqueTeams.length} teams</p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {successMessage && <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{successMessage}</div>}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Add Athlete */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">New Player</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Add Athlete</h2>
            </div>
            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Full Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Liam van der Berg"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Team</label>
                <input value={team} onChange={(e) => setTeam(e.target.value)} list="team-opts" placeholder="e.g. 1st XI"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
                <datalist id="team-opts">{uniqueTeams.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Age Group</label>
                <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500">
                  <option value="">Select...</option>
                  {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-black text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add Athlete'}
              </button>
            </form>
          </div>

          {/* Directory */}
          <div className="xl:col-span-2">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, team or age group..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
              <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500 sm:w-44">
                <option value="All">All Teams</option>
                {uniqueTeams.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-800/60" />
                ))}
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-sm text-slate-400">No athletes found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredAthletes.map((athlete) => {
                  const isEditing = editingId === athlete.id;
                  const avail = athlete.raw?.availability || 'Available';
                  const availDot = avail === 'Available' ? 'bg-emerald-500' : avail === 'Injured' ? 'bg-red-500' : avail === 'Modified' ? 'bg-amber-500' : 'bg-sky-500';
                  return (
                    <div key={athlete.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700 cursor-pointer">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Full name"
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                            <input value={editTeam} onChange={(e) => setEditTeam(e.target.value)} list="team-opts-edit" placeholder="Team"
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />
                            <datalist id="team-opts-edit">{uniqueTeams.map((t) => <option key={t} value={t} />)}</datalist>
                            <select value={editAgeGroup} onChange={(e) => setEditAgeGroup(e.target.value)}
                              className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500">
                              <option value="">Age group...</option>
                              {AGE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveEdit(athlete.id)} disabled={editSaving}
                              className="rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-2 text-sm font-black text-sky-300 disabled:opacity-50">
                              {editSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button onClick={cancelEdit}
                              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <Link href={`/athletes/${athlete.id}`} className="flex flex-1 min-w-0 items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/30 to-sky-500/10 text-sm font-black text-sky-300">
                              {initials(athlete.name)}
                              <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${availDot}`} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white leading-tight">{athlete.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                {athlete.team && athlete.team !== '—' && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black text-sky-300">{athlete.team}</span>}
                                {athlete.ageGroup !== '—' && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-500">{athlete.ageGroup}</span>}
                              </div>
                            </div>
                          </Link>
                          <div className="flex shrink-0 gap-1">
                            <button onClick={(e) => { e.stopPropagation(); startEdit(athlete); }}
                              className="rounded-xl border border-slate-700 bg-slate-800/60 p-2 text-slate-400 transition hover:text-white hover:border-sky-500">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(athlete); }}
                              className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && filteredAthletes.length > 0 && (
              <p className="mt-3 text-center text-xs text-slate-600">
                Showing {filteredAthletes.length} of {athletes.length} athletes
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}