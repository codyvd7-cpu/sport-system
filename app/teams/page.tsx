'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase'
import { safeUUID } from '@/lib/uuid';

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
    id: firstValue(row.id, row.team_id, safeUUID()),
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


  // Load athletes and attendance for per-team stats
  const [athleteRows, setAthleteRows] = useState<GenericRow[]>([]);
  const [attendanceRows, setAttendanceRows] = useState<GenericRow[]>([]);

  useEffect(() => {
    loadTeams();
    // Load athletes and attendance for stats
    supabase.from('athletes').select('id,name,team').then(({ data }) => { if (data) setAthleteRows(data); });
    supabase.from('Attendance').select('athlete_id,status').then(({ data }) => { if (data) setAttendanceRows(data); });
  }, []);

  // Auto-clear success
  useEffect(() => {
    if (!successMessage) return;
    const t = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(t);
  }, [successMessage]);

  function teamLabel(name: string) {
    return name.replace(/\s+/g, '').slice(0, 3).toUpperCase();
  }

  function getTeamStats(teamName: string) {
    const squad = athleteRows.filter((a) => (a.team || a.team_name) === teamName);
    const teamAttendance = attendanceRows.filter((r) => {
      const athlete = athleteRows.find((a) => String(a.id) === String(r.athlete_id));
      return (athlete?.team || athlete?.team_name) === teamName;
    });
    const present = teamAttendance.filter((r) => ['present', 'late'].includes(String(r.status).toLowerCase())).length;
    const rate = teamAttendance.length > 0 ? Math.round((present / teamAttendance.length) * 100) : null;
    return { count: squad.length, rate };
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-400">Squad Management</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Teams</h1>
          <p className="mt-1 text-sm text-slate-500">{teams.length} teams in the system</p>
        </div>

        {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        {successMessage && <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{successMessage}</div>}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">

          {/* Add Team */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">New Team</p>
              <h2 className="mt-0.5 text-lg font-black text-white">Add Team</h2>
            </div>
            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Team Name</label>
                <input value={teamName} onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. 1st XI"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-400">Season</label>
                <input value={season} onChange={(e) => setSeason(e.target.value)}
                  placeholder="e.g. 2026"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-sky-500" />
              </div>
              <button type="submit" disabled={submitting}
                className="w-full rounded-xl border border-sky-500 bg-sky-500/15 py-3 text-sm font-black text-sky-300 transition hover:bg-sky-500/20 disabled:opacity-50">
                {submitting ? 'Adding...' : 'Add Team'}
              </button>
            </form>
          </div>

          {/* Team Directory */}
          <div className="xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                {loading ? 'Loading...' : `${teams.length} teams`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <p className="text-sm text-slate-400">Loading teams...</p>
              </div>
            ) : teams.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
                <p className="text-sm text-slate-400">No teams yet — add one to get started.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {teams.map((team) => {
                  const stats = getTeamStats(team.name);
                  return (
                    <div key={team.id} className="group rounded-2xl border border-slate-800 bg-slate-900 p-4 transition hover:border-slate-700">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-xs font-black text-sky-400">
                          {teamLabel(team.name)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">{team.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {team.season !== '—' ? team.season : 'No season set'}
                          </p>
                          <div className="mt-3 flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-slate-500">
                                <circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/>
                                <path d="M2 20c0-3.314 2.686-6 6-6h8c3.314 0 6 2.686 6 6"/>
                              </svg>
                              <span className="text-xs font-semibold text-slate-300">{stats.count} players</span>
                            </div>
                            {stats.rate !== null && (
                              <div className="flex items-center gap-1.5">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 text-slate-500">
                                  <path d="M9 11l3 3L22 4"/>
                                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                </svg>
                                <span className={`text-xs font-bold ${
                                  stats.rate >= 80 ? 'text-emerald-400' :
                                  stats.rate >= 60 ? 'text-amber-400' : 'text-red-400'
                                }`}>{stats.rate}% att</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex gap-2">
                        <Link href={`/teams/${encodeURIComponent(team.name)}`}
                          className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/10 py-2 text-center text-xs font-black text-sky-300 transition hover:bg-sky-500/20">
                          Open Team →
                        </Link>
                        <button onClick={() => handleDeleteTeam(team)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/20">
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}