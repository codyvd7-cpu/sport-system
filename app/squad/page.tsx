'use client';

import { useEffect, useState, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { supabase } from '@/lib/supabase';

type Athlete = {
  id: string;
  full_name: string;
  age_group: string;
  team: string | null;
};

const TEAM_GROUPS = [
  { group: 'Senior', color: 'violet', teams: ['1sts', '2nds', '3rds', '4ths', '5ths'] },
  { group: 'U16', color: 'sky', teams: ['U16A', 'U16B', 'U16C', 'U16D', 'U16E'] },
  { group: 'U15', color: 'emerald', teams: ['U15A', 'U15B', 'U15C', 'U15D', 'U15E'] },
  { group: 'U14', color: 'amber', teams: ['U14A', 'U14B', 'U14C', 'U14D', 'U14E'] },
];

const ALL_TEAMS = TEAM_GROUPS.flatMap((g) => g.teams);

const COLORS: Record<string, { badge: string; text: string; border: string; bg: string }> = {
  violet: { badge: 'bg-violet-500/15 text-violet-300', text: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/8' },
  sky:    { badge: 'bg-sky-500/15 text-sky-300',       text: 'text-sky-400',    border: 'border-sky-500/30',    bg: 'bg-sky-500/8' },
  emerald:{ badge: 'bg-emerald-500/15 text-emerald-300',text: 'text-emerald-400',border: 'border-emerald-500/30',bg: 'bg-emerald-500/8' },
  amber:  { badge: 'bg-amber-500/15 text-amber-300',   text: 'text-amber-400',  border: 'border-amber-500/30',  bg: 'bg-amber-500/8' },
};

function getColor(team: string) {
  const g = TEAM_GROUPS.find((g) => g.teams.includes(team));
  return g ? COLORS[g.color] : COLORS.sky;
}

function initials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function SquadBoardPage() {
  const { showToast } = useToast();
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('All');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [view, setView] = useState<'assign' | 'overview'>('assign');

  useEffect(() => {
    supabase.from('athletes').select('id, full_name, age_group, team').order('full_name')
      .then(({ data }) => { if (data) setAthletes(data as Athlete[]); setLoading(false); });
  }, []);



  async function assignTeam(athleteId: string, team: string | null) {
    setSaving(athleteId);
    await supabase.from('athletes').update({ team }).eq('id', athleteId);
    setAthletes((prev) => prev.map((a) => (a.id === athleteId ? { ...a, team } : a)));
    setSaving(null);
    if (team) showToast(`Assigned to ${team}`);
  }

  async function bulkAssign(team: string) {
    if (!filteredUnassigned.length) return;
    if (!confirm(`Assign ${filteredUnassigned.length} players to ${team}?`)) return;
    setSaving('bulk');
    const ids = filteredUnassigned.map((a) => a.id);
    await supabase.from('athletes').update({ team }).in('id', ids);
    setAthletes((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, team } : a)));
    setSaving(null);
    showToast(`${ids.length} players assigned to ${team}`);
  }

  const unassigned = useMemo(() => athletes.filter((a) => !a.team || !ALL_TEAMS.includes(a.team)), [athletes]);

  const filteredUnassigned = useMemo(() => {
    const q = search.toLowerCase();
    return unassigned.filter((a) => {
      const matchSearch = !q || a.full_name.toLowerCase().includes(q);
      const matchAge = ageFilter === 'All' || a.age_group === ageFilter;
      return matchSearch && matchAge;
    });
  }, [unassigned, search, ageFilter]);

  const teamCounts = useMemo(() => {
    const map: Record<string, number> = {};
    ALL_TEAMS.forEach((t) => { map[t] = 0; });
    athletes.forEach((a) => { if (a.team && map[a.team] !== undefined) map[a.team]++; });
    return map;
  }, [athletes]);

  const teamPlayers = useMemo(() =>
    selectedTeam ? athletes.filter((a) => a.team === selectedTeam) : [], [athletes, selectedTeam]);

  const ageGroups = useMemo(() =>
    Array.from(new Set(athletes.map((a) => a.age_group).filter(Boolean))).sort(), [athletes]);

  const assigned = athletes.length - unassigned.length;
  const pct = athletes.length > 0 ? Math.round((assigned / athletes.length) * 100) : 0;

  return (
    <main className="min-h-screen overflow-x-hidden" style={{background:'var(--bg)' pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:"rgba(56,189,248,0.7)"}}>Team Management</p>
          <h1 className="text-4xl font-black tracking-tight text-white leading-none">Squad Board</h1>
          <p className="mt-1 text-sm text-white/35">Assign players to their teams for the season.</p>
        </div>


        {/* Progress */}
        <div className="mb-8 rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-white/35">Assignment Progress</p>
              <p className="mt-0.5 text-2xl font-black text-white">{assigned} <span className="text-base font-semibold text-white/35">of {athletes.length} assigned</span></p>
            </div>
            <p className={`text-3xl font-black ${pct === 100 ? 'text-emerald-400' : pct > 50 ? 'text-sky-400' : 'text-amber-400'}`}>{pct}%</p>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
            <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/25">{unassigned.length} players still unassigned</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          {(['assign', 'overview'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-xl px-4 py-2 text-sm font-black transition ${
                view === v ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'border border-white/8 bg-[rgba(255,255,255,0.025)] text-white/50 hover:text-white'
              }`}>
              {v === 'assign' ? 'Assign Players' : 'Team Overview'}
            </button>
          ))}
        </div>

        {/* ASSIGN VIEW */}
        {view === 'assign' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">

            {/* Left — unassigned */}
            <div className="xl:col-span-2">
              <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">Unassigned</p>
                    <h2 className="mt-0.5 text-lg font-black text-white">{filteredUnassigned.length} players</h2>
                  </div>
                  {unassigned.length === 0 && <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">All done ✓</span>}
                </div>

                {/* Search + filter */}
                <div className="mb-4 space-y-2">
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players..."
                    className="w-full rounded-xl border border-white/8 bg-[rgba(255,255,255,0.01)] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-sky-500" />
                  <div className="flex flex-wrap gap-1.5">
                    {['All', ...ageGroups].map((ag) => (
                      <button key={ag} onClick={() => setAgeFilter(ag)}
                        className={`rounded-full px-3 py-1 text-xs font-black transition ${
                          ageFilter === ag ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'border border-white/8 bg-white/5 text-white/35 hover:text-white'
                        }`}>{ag}</button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 py-4">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                    <p className="text-sm text-white/50">Loading players...</p>
                  </div>
                ) : filteredUnassigned.length === 0 ? (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 text-center">
                    <p className="text-2xl mb-1"></p>
                    <p className="text-sm font-bold text-emerald-300">All players assigned!</p>
                  </div>
                ) : (
                  <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
                    {filteredUnassigned.map((athlete) => (
                      <div key={athlete.id} className="rounded-xl border border-white/6 bg-[rgba(255,255,255,0.01)]/60 p-3">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-black text-white/70">
                            {initials(athlete.full_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-white">{athlete.full_name}</p>
                            <p className="text-[10px] text-white/35">{athlete.age_group || '—'}</p>
                          </div>
                          {saving === athlete.id && <div className="h-3 w-3 animate-spin rounded-full border border-sky-500 border-t-transparent shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {ALL_TEAMS.map((t) => {
                            const col = getColor(t);
                            return (
                              <button key={t} onClick={() => assignTeam(athlete.id, t)} disabled={saving === athlete.id}
                                className={`rounded-md border px-2 py-0.5 text-[9px] font-black transition bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white ${col.border} disabled:opacity-50`}>
                                {t}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right — team grid */}
            <div className="xl:col-span-3">
              <div className="rounded-2xl border border-white/6 bg-[rgba(255,255,255,0.025)] p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-400">Teams</p>
                    <h2 className="mt-0.5 text-lg font-black text-white">25 Teams</h2>
                  </div>
                  {saving === 'bulk' && (
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-spin rounded-full border border-sky-500 border-t-transparent" />
                      <p className="text-xs text-white/50">Saving...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  {TEAM_GROUPS.map((group) => {
                    const col = COLORS[group.color];
                    return (
                      <div key={group.group}>
                        <div className="mb-2 flex items-center justify-between">
                          <p className={`text-xs font-black uppercase tracking-[0.18em] ${col.text}`}>{group.group}</p>
                          <button onClick={() => bulkAssign(group.teams[0])} className="text-[10px] text-white/25 hover:text-white/50 transition">
                            bulk assign filtered →
                          </button>
                        </div>
                        <div className="grid grid-cols-5 gap-2">
                          {group.teams.map((team) => {
                            const count = teamCounts[team] || 0;
                            const isSelected = selectedTeam === team;
                            return (
                              <button key={team} onClick={() => setSelectedTeam(isSelected ? null : team)}
                                className={`rounded-xl border p-3 text-center transition ${
                                  isSelected ? `${col.border} ${col.bg}` :
                                  count > 0 ? 'border-white/8 bg-white/5/60 hover:border-white/10' :
                                  'border-white/6/60 bg-[rgba(255,255,255,0.01)]/40 hover:border-white/8'
                                }`}>
                                <p className={`text-xl font-black leading-none ${isSelected ? col.text : count > 0 ? 'text-white' : 'text-white/15'}`}>{count}</p>
                                <p className={`mt-1 text-[10px] font-black ${isSelected ? col.text : count > 0 ? 'text-white/50' : 'text-white/15'}`}>{team}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Selected team */}
                {selectedTeam && (
                  <div className="mt-5 border-t border-white/6 pt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${getColor(selectedTeam).badge}`}>{selectedTeam}</span>
                        <p className="text-sm text-white/50">{teamPlayers.length} players</p>
                      </div>
                      <button onClick={() => setSelectedTeam(null)} className="text-xs text-white/35 hover:text-white/70">✕ Close</button>
                    </div>
                    {teamPlayers.length === 0 ? (
                      <p className="text-sm text-white/35">No players assigned yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 max-h-48 overflow-y-auto pr-1">
                        {teamPlayers.map((athlete) => (
                          <div key={athlete.id} className="flex items-center gap-2 rounded-xl border border-white/6 bg-[rgba(255,255,255,0.01)]/50 p-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-[9px] font-black text-white/70">
                              {initials(athlete.full_name)}
                            </div>
                            <p className="flex-1 truncate text-xs font-semibold text-white">{athlete.full_name}</p>
                            <button onClick={() => assignTeam(athlete.id, null)}
                              className="shrink-0 rounded-md border border-red-500/20 bg-red-500/10 px-1.5 py-0.5 text-[9px] text-red-300 hover:bg-red-500/20">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OVERVIEW VIEW */}
        {view === 'overview' && (
          <div className="space-y-6">
            {TEAM_GROUPS.map((group) => {
              const col = COLORS[group.color];
              return (
                <div key={group.group}>
                  <p className={`mb-3 text-xs font-black uppercase tracking-[0.2em] ${col.text}`}>{group.group}</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    {group.teams.map((team) => {
                      const players = athletes.filter((a) => a.team === team);
                      const isSelected = selectedTeam === team;
                      return (
                        <div key={team} onClick={() => setSelectedTeam(isSelected ? null : team)}
                          className={`cursor-pointer rounded-2xl border p-4 transition ${
                            isSelected ? `${col.border} ${col.bg}` : 'border-white/6 bg-[rgba(255,255,255,0.025)] hover:border-white/8'
                          }`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${col.badge}`}>{team}</span>
                            <p className={`text-2xl font-black ${players.length > 0 ? col.text : 'text-white/15'}`}>{players.length}</p>
                          </div>
                          {isSelected && players.length > 0 && (
                            <div className="mt-2 space-y-1 border-t border-white/5 pt-2 max-h-40 overflow-y-auto">
                              {players.map((p) => (
                                <p key={p.id} className="truncate text-xs text-white/50">{p.full_name}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
