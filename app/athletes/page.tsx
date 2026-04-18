'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Athlete = {
  id: string;
  name: string;
  team: string;
  sport: string;
  ageGroup: string;
  raw: GenericRow;
};

function firstString(...values: any[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
  }
  return '';
}

function firstValue(...values: any[]) {
  for (const value of values) {
    if (value !== null && value !== undefined && value !== '') return String(value);
  }
  return '';
}

function normalizeAthlete(row: GenericRow): Athlete {
  return {
    id: firstValue(row.id, row.athlete_id, crypto.randomUUID()),
    name:
      firstString(
        row.name,
        row.full_name,
        row.athlete_name,
        row.player_name,
        row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : '',
        row.first_name
      ) || 'Unknown Athlete',
    team: firstString(row.team, row.team_name, row.squad, row.group_name) || 'Unassigned',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    ageGroup: firstString(row.age_group, row.agegroup, row.grade_group, row.group) || '—',
    raw: row,
  };
}

async function tryInsertAthlete(input: {
  name: string;
  team: string;
  sport: string;
  ageGroup: string;
}) {
  const attempts = [
    {
      name: input.name,
      team: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      full_name: input.name,
      team: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      athlete_name: input.name,
      team: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      name: input.name,
      team_name: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      full_name: input.name,
      team_name: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      athlete_name: input.name,
      team_name: input.team,
      sport: input.sport,
      age_group: input.ageGroup,
    },
    {
      name: input.name,
      team: input.team,
      sport: input.sport,
    },
    {
      full_name: input.name,
      team: input.team,
      sport: input.sport,
    },
    {
      athlete_name: input.name,
      team: input.team,
      sport: input.sport,
    },
    {
      name: input.name,
      team: input.team,
    },
    {
      full_name: input.name,
      team: input.team,
    },
    {
      athlete_name: input.name,
      team: input.team,
    },
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    const result = await supabase.from('athletes').insert([payload]).select('*').single();
    if (!result.error) return result;
    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export default function AthletesPage() {
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [sport, setSport] = useState('');
  const [ageGroup, setAgeGroup] = useState('');

  const [teamFilter, setTeamFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  async function loadAthletes() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase.from('athletes').select('*').order('id', { ascending: true });

    if (error) {
      setError(error.message || 'Failed to load athletes.');
      setAthleteRows([]);
      setLoading(false);
      return;
    }

    setAthleteRows((data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  const athletes = useMemo(() => {
    return athleteRows.map(normalizeAthlete).sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteRows]);

  const uniqueTeams = useMemo(() => {
    return Array.from(
      new Set(
        athletes
          .map((athlete) => athlete.team)
          .filter((value) => value && value !== 'Unassigned')
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return athletes.filter((athlete) => {
      const matchesTeam = teamFilter === 'All' || athlete.team === teamFilter;
      const matchesSearch =
        !normalizedSearch ||
        athlete.name.toLowerCase().includes(normalizedSearch) ||
        athlete.team.toLowerCase().includes(normalizedSearch) ||
        athlete.sport.toLowerCase().includes(normalizedSearch) ||
        athlete.ageGroup.toLowerCase().includes(normalizedSearch);

      return matchesTeam && matchesSearch;
    });
  }, [athletes, teamFilter, searchTerm]);

  const summary = useMemo(() => {
    const totalAthletes = athletes.length;
    const totalTeams = uniqueTeams.length;
    const unassignedAthletes = athletes.filter((athlete) => athlete.team === 'Unassigned').length;

    const sportBreakdown = Array.from(
      athletes.reduce((map, athlete) => {
        const key = athlete.sport || '—';
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalAthletes,
      totalTeams,
      unassignedAthletes,
      filteredCount: filteredAthletes.length,
      topSports: sportBreakdown,
    };
  }, [athletes, uniqueTeams, filteredAthletes]);

  async function handleAddAthlete(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!name.trim()) {
      setError('Athlete name is required.');
      setSubmitting(false);
      return;
    }

    const result = await tryInsertAthlete({
      name: name.trim(),
      team: team.trim(),
      sport: sport.trim(),
      ageGroup: ageGroup.trim(),
    });

    if (result.error) {
      setError(result.error.message || 'Failed to add athlete.');
      setSubmitting(false);
      return;
    }

    setName('');
    setTeam('');
    setSport('');
    setAgeGroup('');
    setSuccessMessage('Athlete added successfully.');
    await loadAthletes();
    setSubmitting(false);
  }

  async function handleDeleteAthlete(athlete: Athlete) {
    const confirmed = window.confirm(`Delete ${athlete.name}? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const result = await supabase.from('athletes').delete().eq('id', athlete.id);

    if (result.error) {
      setError(result.error.message || 'Failed to delete athlete.');
      return;
    }

    setSuccessMessage('Athlete deleted successfully.');
    await loadAthletes();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Athlete Management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Athletes</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage your athlete roster, assign athletes to teams, and jump straight into each athlete
              profile for attendance and performance tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/teams"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Teams
            </Link>
            <Link
              href="/attendance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Attendance
            </Link>
            <Link
              href="/performance"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Performance
            </Link>
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {successMessage ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {successMessage}
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Athletes</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalAthletes}</p>
            <p className="mt-2 text-sm text-slate-300">All athletes currently in the system.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Teams Represented</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalTeams}</p>
            <p className="mt-2 text-sm text-slate-300">Unique teams linked to athletes.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Unassigned</p>
            <p className="mt-3 text-3xl font-bold">{summary.unassignedAthletes}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes without a clear team allocation.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Filtered View</p>
            <p className="mt-3 text-3xl font-bold">{summary.filteredCount}</p>
            <p className="mt-2 text-sm text-slate-300">Athletes currently matching filters.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Top Sports</p>
            <div className="mt-3 space-y-2">
              {summary.topSports.length === 0 ? (
                <p className="text-sm text-slate-300">No sport data yet.</p>
              ) : (
                summary.topSports.map(([sportName, count]) => (
                  <div key={sportName} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{sportName}</span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                      {count}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-1">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add Athlete</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create a new athlete record and place them into the system.
              </p>
            </div>

            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Athlete Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cody Van Dyk"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Team</label>
                <input
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  placeholder="e.g. 1st XI Hockey"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Sport</label>
                <input
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  placeholder="e.g. Hockey"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Age Group</label>
                <input
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  placeholder="e.g. U16"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Adding Athlete...' : 'Add Athlete'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-4">
              <div>
                <h2 className="text-lg font-semibold">Athlete Directory</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Search athletes by name and filter by team before opening their profile.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Search</label>
                  <input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search athlete, team, sport, or age group"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-200">Filter by Team</label>
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                  >
                    <option value="All">All Teams</option>
                    {uniqueTeams.map((teamName) => (
                      <option key={teamName} value={teamName}>
                        {teamName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Loading athletes...
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
                No athletes found for the current search/filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-4">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Athlete</p>
                          <Link
                            href={`/athletes/${athlete.id}`}
                            className="mt-1 block text-sm font-semibold text-white transition hover:text-sky-400"
                          >
                            {athlete.name}
                          </Link>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
                          <p className="mt-1 text-sm text-slate-300">{athlete.team}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
                          <p className="mt-1 text-sm text-slate-300">{athlete.sport}</p>
                        </div>

                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Age Group</p>
                          <p className="mt-1 text-sm text-slate-300">{athlete.ageGroup}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/athletes/${athlete.id}`}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800 hover:text-white"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => handleDeleteAthlete(athlete)}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}