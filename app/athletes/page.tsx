'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Athlete = {
  id: number | string;
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
    if (value !== null && value !== undefined && value !== '') return value;
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

    if (!result.error) {
      return result;
    }

    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export default function AthletesPage() {
  const [rows, setRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [sport, setSport] = useState('');
  const [ageGroup, setAgeGroup] = useState('');

  const [teamFilter, setTeamFilter] = useState('All');

  async function loadAthletes() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('athletes')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      setError(error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAthletes();
  }, []);

  const athletes = useMemo(() => {
    return rows.map(normalizeAthlete);
  }, [rows]);

  const uniqueTeams = useMemo(() => {
    const teams = Array.from(
      new Set(
        athletes
          .map((athlete) => athlete.team)
          .filter((value) => value && value !== 'Unassigned')
      )
    );

    return teams.sort((a, b) => a.localeCompare(b));
  }, [athletes]);

  const filteredAthletes = useMemo(() => {
    if (teamFilter === 'All') return athletes;
    return athletes.filter((athlete) => athlete.team === teamFilter);
  }, [athletes, teamFilter]);

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
      topSports: sportBreakdown,
    };
  }, [athletes, uniqueTeams]);

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

  async function handleDeleteAthlete(id: number | string, athleteName: string) {
    const confirmed = window.confirm(`Delete ${athleteName}? This action cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const { error } = await supabase.from('athletes').delete().eq('id', id);

    if (error) {
      setError(error.message || 'Failed to delete athlete.');
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
              Manage your athlete database, assign athletes to teams, and move quickly into each
              athlete profile for attendance and performance tracking.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
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
            <Link
              href="/teams"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Teams
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

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Athletes</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalAthletes}</p>
            <p className="mt-2 text-sm text-slate-300">All athletes currently in the system.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Teams Represented</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalTeams}</p>
            <p className="mt-2 text-sm text-slate-300">Unique teams currently linked to athletes.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Unassigned Athletes</p>
            <p className="mt-3 text-3xl font-bold">{summary.unassignedAthletes}</p>
            <p className="mt-2 text-sm text-slate-300">
              Athletes without a clear team allocation yet.
            </p>
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

        <section className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-1 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">Add Athlete</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create a new athlete record and place them into the system.
              </p>
            </div>

            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Athlete Name
                </label>
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

          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Athlete Directory</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Filter athletes by team and open their profile for deeper management.
                </p>
              </div>

              <div className="w-full md:w-72">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Filter by Team
                </label>
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

            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Loading athletes...
              </div>
            ) : filteredAthletes.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
                No athletes found for the selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Athlete</th>
                      <th className="px-3 py-3 font-medium">Team</th>
                      <th className="px-3 py-3 font-medium">Sport</th>
                      <th className="px-3 py-3 font-medium">Age Group</th>
                      <th className="px-3 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAthletes.map((athlete) => (
                      <tr key={String(athlete.id)} className="border-b border-slate-900">
                        <td className="px-3 py-4">
                          <Link
                            href={`/athletes/${athlete.id}`}
                            className="font-medium text-white transition hover:text-sky-400"
                          >
                            {athlete.name}
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-slate-300">{athlete.team}</td>
                        <td className="px-3 py-4 text-slate-300">{athlete.sport}</td>
                        <td className="px-3 py-4 text-slate-300">{athlete.ageGroup}</td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/athletes/${athlete.id}`}
                              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-white"
                            >
                              Open
                            </Link>
                            <button
                              onClick={() => handleDeleteAthlete(athlete.id, athlete.name)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/20"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}