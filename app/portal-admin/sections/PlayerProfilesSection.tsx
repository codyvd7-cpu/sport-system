'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Profile = {
  id: string; user_id: string; full_name: string;
  grade: string; sports: string[]; athlete_id: string | null; created_at: string;
};
type Athlete = { id: string; full_name: string; team: string; sport: string; };

export function PlayerProfilesSection() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [linking, setLinking]   = useState<string | null>(null);
  const [athleteSearch, setAthleteSearch] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('player_profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('athletes').select('id,full_name,team,sport').order('full_name'),
    ]).then(([p, a]) => {
      setProfiles(p.data || []);
      setAthletes(a.data || []);
      setLoading(false);
    });
  }, []);

  async function linkAthlete(profileId: string, athleteId: string | null) {
    await supabase.from('player_profiles').update({ athlete_id: athleteId }).eq('id', profileId);
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, athlete_id: athleteId } : p));
    setLinking(null);
    setAthleteSearch('');
  }

  const filteredProfiles = profiles.filter(p =>
    !search || (p.full_name || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredAthletes = athletes.filter(a =>
    !athleteSearch || a.full_name.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Player Accounts</h2>
          <p className="text-sm text-slate-400 mt-0.5">Link player accounts to athlete records to unlock personal stats</p>
        </div>
        <span className="text-sm text-slate-500">{profiles.length} accounts</span>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name..."
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500" />

      {loading ? (
        <p className="text-sm text-slate-500 text-center py-8">Loading...</p>
      ) : filteredProfiles.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">No player accounts yet.</p>
      ) : (
        <div className="space-y-3">
          {filteredProfiles.map(profile => {
            const linked = athletes.find(a => a.id === profile.athlete_id);
            const isLinking = linking === profile.id;
            return (
              <div key={profile.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-bold text-white">{profile.full_name || 'Unnamed'}</p>
                      {profile.grade && <span className="text-xs text-slate-500">{profile.grade}</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(profile.sports || []).map(s => (
                        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">{s}</span>
                      ))}
                    </div>
                    {linked ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <p className="text-xs text-emerald-400 font-semibold">
                          {linked.full_name} · {linked.team} · {linked.sport}
                        </p>
                        <button onClick={() => linkAthlete(profile.id, null)} className="text-xs text-red-400 hover:text-red-300">Unlink</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <p className="text-xs text-amber-400">No athlete linked</p>
                      </div>
                    )}
                  </div>
                  <button onClick={() => { setLinking(isLinking ? null : profile.id); setAthleteSearch(''); }}
                    className={`shrink-0 text-xs font-black px-3 py-1.5 rounded-lg border transition-colors ${isLinking ? 'border-sky-500 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-600'}`}>
                    {isLinking ? 'Cancel' : linked ? 'Re-link' : 'Link Athlete'}
                  </button>
                </div>

                {isLinking && (
                  <div className="mt-3 border-t border-slate-800 pt-3">
                    <input value={athleteSearch} onChange={e => setAthleteSearch(e.target.value)}
                      placeholder="Search athletes..." autoFocus
                      className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500 mb-2" />
                    <div className="max-h-52 overflow-y-auto space-y-1 rounded-xl border border-slate-800 bg-slate-950 p-1">
                      {filteredAthletes.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-3">No athletes found</p>
                      ) : filteredAthletes.slice(0, 30).map(a => (
                        <button key={a.id} onClick={() => linkAthlete(profile.id, a.id)}
                          className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group">
                          <div>
                            <p className="text-sm font-semibold text-white">{a.full_name}</p>
                            <p className="text-xs text-slate-400">{a.team} · {a.sport}</p>
                          </div>
                          <svg className="w-4 h-4 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                      ))}
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
}
