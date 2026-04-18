'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Team = {
  id: string;
  name: string;
  sport: string;
  season: string;
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

function normalizeTeam(row: GenericRow): Team {
  return {
    id: firstValue(row.id, row.team_id, crypto.randomUUID()),
    name: firstString(row.name, row.team, row.team_name) || 'Unnamed Team',
    sport: firstString(row.sport, row.code, row.discipline) || '—',
    season: firstString(row.season, row.year, row.phase) || '—',
    raw: row,
  };
}

async function tryInsertTeam(input: { name: string; sport: string; season: string }) {
  const attempts = [
    {
      name: input.name,
      sport: input.sport,
      season: input.season,
    },
    {
      team_name: input.name,
      sport: input.sport,
      season: input.season,
    },
    {
      team: input.name,
      sport: input.sport,
      season: input.season,
    },
    {
      name: input.name,
      sport: input.sport,
    },
    {
      team_name: input.name,
      sport: input.sport,
    },
    {
      team: input.name,
      sport: input.sport,
    },
    {
      name: input.name,
    },
    {
      team_name: input.name,
    },
    {
      team: input.name,
    },
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    const result = await supabase.from('Teams').insert([payload]).select('*').single();
    if (!result.error) return result;
    lastError = result.error;
  }

  return { data: null, error: lastError };
}

export default function TeamsPage() {
  const [teamRows, setTeamRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [teamName, setTeamName] = useState('');
  const [sport, setSport] = useState('');
  const [season, setSeason] = useState('');

  const [sportFilter, setSportFilter] = useState('All');

  async function loadTeams() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase.from('Teams').select('*').order('id', { ascending: true });

    if (error) {
      setError(error.message || 'Failed to load teams.');
      setTeamRows([]);
      setLoading(false);
      return;
    }

    setTeamRows((data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadTeams();
  }, []);

  const teams = useMemo(() => {
    return teamRows.map(normalizeTeam).sort((a, b) => a.name.localeCompare(b.name));
  }, [teamRows]);

  const uniqueSports = useMemo(() => {
    return Array.from(new Set(teams.map((team) => team.sport).filter((value) => value && value !== '—'))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (sportFilter === 'All') return teams;
    return teams.filter((team) => team.sport === sportFilter);
  }, [teams, sportFilter]);

  const summary = useMemo(() => {
    const totalTeams = teams.length;
    const sportsRepresented = uniqueSports.length;
    const filteredCount = filteredTeams.length;

    const seasonBreakdown = Array.from(
      teams.reduce((map, team) => {
        const key = team.season || '—';
        map.set(key, (map.get(key) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return {
      totalTeams,
      sportsRepresented,
      filteredCount,
      topSeasons: seasonBreakdown,
    };
  }, [teams, uniqueSports, filteredTeams]);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMessage('');

    if (!teamName.trim()) {
      setError('Team name is required.');
      setSubmitting(false);
      return;
    }

    const result = await tryInsertTeam({
      name: teamName.trim(),
      sport: sport.trim(),
      season: season.trim(),
    });

    if (result.error) {
      setError(result.error.message || 'Failed to add team.');
      setSubmitting(false);
      return;
    }

    setTeamName('');
    setSport('');
    setSeason('');
    setSuccessMessage('Team added successfully.');
    await loadTeams();
    setSubmitting(false);
  }

  async function handleDeleteTeam(team: Team) {
    const confirmed = window.confirm(`Delete ${team.name}? This cannot be undone.`);
    if (!confirmed) return;

    setError('');
    setSuccessMessage('');

    const result = await supabase.from('Teams').delete().eq('id', team.id);

    if (result.error) {
      setError(result.error.message || 'Failed to delete team.');
      return;
    }

    setSuccessMessage('Team deleted successfully.');
    await loadTeams();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">
              Team Management
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white">Teams</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              Manage team environments, create new squads, and jump directly into team pages for roster,
              attendance, and performance oversight.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/athletes"
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:border-sky-500 hover:bg-slate-800"
            >
              Open Athletes
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

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Total Teams</p>
            <p className="mt-3 text-3xl font-bold">{summary.totalTeams}</p>
            <p className="mt-2 text-sm text-slate-300">All team groups currently in the system.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Sports Represented</p>
            <p className="mt-3 text-3xl font-bold">{summary.sportsRepresented}</p>
            <p className="mt-2 text-sm text-slate-300">Unique sports currently represented.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Filtered Teams</p>
            <p className="mt-3 text-3xl font-bold">{summary.filteredCount}</p>
            <p className="mt-2 text-sm text-slate-300">Teams matching the current filter.</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-400">Top Seasons</p>
            <div className="mt-3 space-y-2">
              {summary.topSeasons.length === 0 ? (
                <p className="text-sm text-slate-300">No season data yet.</p>
              ) : (
                summary.topSeasons.map(([seasonName, count]) => (
                  <div key={String(seasonName)} className="flex items-center justify-between text-sm">
                    <span className="text-slate-200">{String(seasonName)}</span>
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
              <h2 className="text-lg font-semibold">Add Team</h2>
              <p className="mt-1 text-sm text-slate-400">Create a new team environment in the system.</p>
            </div>

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">Team Name</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
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
                <label className="mb-2 block text-sm font-medium text-slate-200">Season</label>
                <input
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 px-4 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'Adding Team...' : 'Add Team'}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 xl:col-span-2">
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Team Directory</h2>
                <p className="mt-1 text-sm text-slate-400">Filter teams by sport and open the full team page.</p>
              </div>

              <div className="w-full md:w-72">
                <label className="mb-2 block text-sm font-medium text-slate-200">Filter by Sport</label>
                <select
                  value={sportFilter}
                  onChange={(e) => setSportFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-500"
                >
                  <option value="All">All Sports</option>
                  {uniqueSports.map((sportName) => (
                    <option key={sportName} value={sportName}>
                      {sportName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 text-sm text-slate-300">
                Loading teams...
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-300">
                No teams found for the selected filter.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTeams.map((team) => (
                  <div
                    key={team.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Team</p>
                          <p className="mt-1 text-sm font-semibold text-white">{team.name}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Sport</p>
                          <p className="mt-1 text-sm text-slate-300">{team.sport}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-slate-500">Season</p>
                          <p className="mt-1 text-sm text-slate-300">{team.season}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/teams/${encodeURIComponent(team.name)}`}
                          className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-800 hover:text-white"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => handleDeleteTeam(team)}
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