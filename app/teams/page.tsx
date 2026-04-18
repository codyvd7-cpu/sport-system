'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type GenericRow = Record<string, any>;

type Team = {
  id: number | string;
  name: string;
  sport: string;
  season: string;
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
    if (v !== null && v !== undefined && v !== '') return v;
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

async function tryInsertTeam(input: {
  name: string;
  sport: string;
  season: string;
}) {
  const attempts = [
    { name: input.name, sport: input.sport, season: input.season },
    { team_name: input.name, sport: input.sport, season: input.season },
    { name: input.name, sport: input.sport },
    { team_name: input.name, sport: input.sport },
    { name: input.name },
    { team_name: input.name },
  ];

  let lastError: any = null;

  for (const payload of attempts) {
    const res = await supabase.from('Teams').insert([payload]).select('*').single();
    if (!res.error) return res;
    lastError = res.error;
  }

  return { data: null, error: lastError };
}

export default function TeamsPage() {
  const [rows, setRows] = useState<GenericRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [season, setSeason] = useState('');

  const [sportFilter, setSportFilter] = useState('All');

  async function loadTeams() {
    setLoading(true);
    setError('');

    const { data, error } = await supabase
      .from('Teams')
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
    loadTeams();
  }, []);

  const teams = useMemo(() => rows.map(normalizeTeam), [rows]);

  const sports = useMemo(() => {
    return Array.from(new Set(teams.map((t) => t.sport).filter(Boolean))).sort();
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (sportFilter === 'All') return teams;
    return teams.filter((t) => t.sport === sportFilter);
  }, [teams, sportFilter]);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Team name required');
      return;
    }

    const res = await tryInsertTeam({
      name: name.trim(),
      sport: sport.trim(),
      season: season.trim(),
    });

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setName('');
    setSport('');
    setSeason('');
    setSuccess('Team added');
    loadTeams();
  }

  async function handleDelete(id: any, name: string) {
    if (!confirm(`Delete ${name}?`)) return;

    const { error } = await supabase.from('Teams').delete().eq('id', id);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('Team deleted');
    loadTeams();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* HEADER */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.2em] text-sky-400">
            Team Management
          </p>
          <h1 className="text-3xl font-bold mt-2">Teams</h1>
          <p className="text-slate-400 mt-2">
            Manage team structures and navigate into team environments.
          </p>
        </div>

        {/* MESSAGES */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/30 p-4 rounded-xl text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-500/10 border border-green-500/30 p-4 rounded-xl text-green-200">
            {success}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="card">
            <p className="text-slate-400 text-sm">Total Teams</p>
            <p className="text-3xl font-bold">{teams.length}</p>
          </div>
          <div className="card">
            <p className="text-slate-400 text-sm">Sports</p>
            <p className="text-3xl font-bold">{sports.length}</p>
          </div>
          <div className="card">
            <p className="text-slate-400 text-sm">Filtered</p>
            <p className="text-3xl font-bold">{filteredTeams.length}</p>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ADD TEAM */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="font-semibold text-lg mb-4">Add Team</h2>

            <form onSubmit={handleAddTeam} className="space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Team Name"
                className="input"
              />
              <input
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                placeholder="Sport"
                className="input"
              />
              <input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="Season"
                className="input"
              />

              <button className="btn-primary w-full">
                Add Team
              </button>
            </form>
          </div>

          {/* TABLE */}
          <div className="xl:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">

            <div className="flex justify-between mb-4">
              <h2 className="font-semibold text-lg">Teams</h2>

              <select
                value={sportFilter}
                onChange={(e) => setSportFilter(e.target.value)}
                className="input w-48"
              >
                <option>All</option>
                {sports.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <p>Loading...</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-3 text-left">Team</th>
                    <th>Sport</th>
                    <th>Season</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTeams.map((team) => (
                    <tr key={team.id} className="border-b border-slate-900">
                      <td className="py-4">
                        <Link
                          href={`/teams/${encodeURIComponent(team.name)}`}
                          className="text-white hover:text-sky-400"
                        >
                          {team.name}
                        </Link>
                      </td>
                      <td>{team.sport}</td>
                      <td>{team.season}</td>
                      <td className="text-right space-x-2">
                        <Link
                          href={`/teams/${encodeURIComponent(team.name)}`}
                          className="btn-secondary"
                        >
                          Open
                        </Link>
                        <button
                          onClick={() => handleDelete(team.id, team.name)}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>

      {/* QUICK STYLES */}
      <style jsx>{`
        .input {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          background: #020617;
          border: 1px solid #1e293b;
          color: white;
        }

        .btn-primary {
          background: rgba(56,189,248,0.15);
          border: 1px solid #38bdf8;
          padding: 12px;
          border-radius: 12px;
        }

        .btn-secondary {
          padding: 6px 10px;
          border: 1px solid #334155;
          border-radius: 8px;
        }

        .btn-danger {
          padding: 6px 10px;
          border: 1px solid rgba(239,68,68,0.3);
          background: rgba(239,68,68,0.1);
          border-radius: 8px;
        }

        .card {
          background: #0f172a;
          border: 1px solid #1e293b;
          padding: 20px;
          border-radius: 16px;
        }
      `}</style>
    </main>
  );
}