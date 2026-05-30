'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { safeUUID } from '@/lib/uuid';
import { useRole } from '@/lib/useRole';
import { StaggerList, StaggerItem, HoverCard } from '@/components/Motion';

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

  const [showAddForm, setShowAddForm] = useState(false);
  const { canSeeAllTeams, teams: myTeams, loading: roleLoading } = useRole();

  async function loadAthletes() {
    setLoading(true);
    let q = supabase.from('athletes').select('id, full_name, first_name, last_name, team, age_group, availability, position, player_code, is_active').order('full_name');
    if (!canSeeAllTeams && myTeams.length > 0) q = q.in('team', myTeams);
    const { data, error: err } = await q;
    if (err) { setError(err.message); setLoading(false); return; }
    setAthleteRows((data as GenericRow[]) || []);
    setLoading(false);
  }

  useEffect(() => { if (!roleLoading) loadAthletes(); }, [roleLoading, canSeeAllTeams, myTeams.join(',')]);

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


  const AVAIL_COLOR: Record<string, string> = {
    'Available': '#10b981', 'Modified': '#fbbf24', 'Injured': '#f87171', 'Resting': '#38bdf8',
  };

  return (
    <main className="min-h-screen bg-[#060812] pb-24 text-white md:pb-0 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-600/8 blur-[120px]"/>
      </div>
      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-600 mb-1">Roster</p>
            <h1 className="text-4xl font-black text-white leading-none tracking-tight">Athletes</h1>
            <p className="mt-2 text-sm text-slate-500">{athletes.length} players · {uniqueTeams.length} teams</p>
          </div>
          <button onClick={() => setShowAddForm(v => !v)}
            className="flex items-center gap-2 rounded-2xl border border-white/8 px-5 py-3 text-sm font-black text-white transition hover:bg-white/5"
            style={{background:'rgba(255,255,255,0.03)'}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {showAddForm ? 'Cancel' : 'Add Athlete'}
          </button>
        </div>

        {error && <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/6 px-5 py-3 text-sm text-red-300">{error}</div>}
        {successMessage && <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/6 px-5 py-3 text-sm text-emerald-300">{successMessage}</div>}

        {/* Add form */}
        {showAddForm && (
          <div className="mb-8 rounded-2xl border border-white/8 p-6" style={{background:'rgba(255,255,255,0.03)'}}>
            <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-500">New Athlete</p>
            <form onSubmit={handleAddAthlete} className="grid gap-3 sm:grid-cols-2">
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/50 transition"/>
              <input value={team} onChange={e => setTeam(e.target.value)} list="team-opts" placeholder="Team e.g. 1sts"
                className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/50 transition"/>
              <datalist id="team-opts">{uniqueTeams.map(t => <option key={t} value={t}/>)}</datalist>
              <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)}
                className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/50 transition">
                <option value="">Age group…</option>
                {AGE_GROUPS.map(g => <option key={g}>{g}</option>)}
              </select>
              <button type="submit" disabled={submitting}
                className="sm:col-span-3 rounded-xl border border-sky-500/30 py-3 text-sm font-black text-sky-300 transition hover:bg-sky-500/10 disabled:opacity-40"
                style={{background:'rgba(56,189,248,0.06)'}}>
                {submitting ? 'Adding…' : 'Add Athlete'}
              </button>
            </form>
          </div>
        )}

        {/* Search + filter */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search athletes…"
              className="w-full rounded-xl border border-white/6 bg-white/3 pl-11 pr-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-sky-500/40 transition"/>
          </div>
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="rounded-xl border border-white/6 bg-white/3 px-4 py-3 text-sm text-white outline-none focus:border-sky-500/40 transition sm:w-44">
            <option value="All">All Teams</option>
            {uniqueTeams.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        <p className="mb-4 text-[11px] text-slate-600">{filteredAthletes.length} athlete{filteredAthletes.length !== 1 ? 's' : ''}</p>

        {/* Athletes grid */}
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({length:9}).map((_,i) => (
              <div key={i} className="h-[72px] rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.02)'}}>
                <div className="h-full w-full" style={{background:'linear-gradient(90deg,rgba(255,255,255,0.02) 0%,rgba(255,255,255,0.05) 50%,rgba(255,255,255,0.02) 100%)',backgroundSize:'200% 100%',animation:'shimmer 1.8s infinite'}}/>
              </div>
            ))}
          </div>
        ) : filteredAthletes.length === 0 ? (
          <div className="rounded-2xl border border-white/5 py-14 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
            <p className="text-sm text-slate-500">No athletes found.</p>
          </div>
        ) : (
          <StaggerList className="grid gap-2 sm:grid-cols-2" stagger={20}>
            {filteredAthletes.map(athlete => {
              const isEditing = editingId === athlete.id;
              const avail = athlete.raw?.availability || 'Available';
              const color = AVAIL_COLOR[avail] || '#94a3b8';
              return (
                <StaggerItem key={athlete.id}>
                <div className="group rounded-2xl border border-white/5 transition-all duration-200 hover:border-white/10"
                  style={{background:'rgba(255,255,255,0.02)'}}>
                  {isEditing ? (
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Name"
                          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"/>
                        <input value={editTeam} onChange={e => setEditTeam(e.target.value)} list="team-opts-edit" placeholder="Team"
                          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50"/>
                        <datalist id="team-opts-edit">{uniqueTeams.map(t => <option key={t} value={t}/>)}</datalist>
                        <select value={editAgeGroup} onChange={e => setEditAgeGroup(e.target.value)}
                          className="rounded-xl border border-white/8 bg-white/4 px-3 py-2 text-sm text-white outline-none focus:border-sky-500/50">
                          <option value="">Age group…</option>
                          {AGE_GROUPS.map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(athlete.id)} disabled={editSaving}
                          className="rounded-xl border border-sky-500/30 bg-sky-500/8 px-4 py-1.5 text-xs font-black text-sky-300 disabled:opacity-50">
                          {editSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={cancelEdit}
                          className="rounded-xl border border-white/8 px-4 py-1.5 text-xs font-semibold text-slate-400 hover:text-white">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4">
                      <Link href={`/athletes/${athlete.id}`} className="flex flex-1 min-w-0 items-center gap-3">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white/80"
                          style={{background:`${color}18`,border:`1px solid ${color}30`}}>
                          {initials(athlete.name)}
                          <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#060812]" style={{background:color}}/>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-white leading-snug">{athlete.name}</p>
                          <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                            {athlete.team && athlete.team !== '—' && (
                              <span className="text-[10px] font-semibold" style={{color:`${color}cc`}}>{athlete.team}</span>
                            )}
                            {athlete.ageGroup !== '—' && (
                              <span className="text-[10px] text-slate-600">· {athlete.ageGroup}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                      <div className="flex shrink-0 gap-1">
                        <button onClick={e => { e.stopPropagation(); startEdit(athlete); }}
                          className="rounded-xl border border-white/8 p-2 text-slate-500 hover:text-white transition">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(athlete); }}
                          className="rounded-xl border border-red-500/15 p-2 text-red-500 hover:bg-red-500/10 transition">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
                </StaggerItem>
            })}
          </StaggerList>
        )}

      </div>
    </main>
  );
}