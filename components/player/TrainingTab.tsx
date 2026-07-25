'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Exercise = { id: string; name: string; target_sets: number | null; target_reps: string | null };
type Program = { id: string; title: string; team: string | null; sport: string | null; exercises: Exercise[] };
type Diagnostic = { athleteLinked: boolean; athleteTeam: string | null; totalActivePrograms: number; programTeams: (string | null)[] };
type LogEntry = { id: string; program_exercise_id: string; exerciseName: string; sets: number; reps: number; weight_kg: number | null; logged_date: string };
type PersonalBest = { exerciseName: string; weightKg: number };
type LeaderboardRow = { athleteId: string; name: string; sessionsThisWeek: number };

async function authedFetch(path: string, opts: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Signed out — please log in again.');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, ...(opts.headers || {}) },
  });
}

export default function TrainingTab({ C }: { C: string }) {
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = React.useState('');
  const [streak, setStreak] = React.useState(0);
  const [personalBests, setPersonalBests] = React.useState<PersonalBest[]>([]);
  const [recent, setRecent] = React.useState<LogEntry[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [entries, setEntries] = React.useState<Record<string, { sets: string; reps: string; weight: string }>>({});
  const [saving, setSaving] = React.useState<string | null>(null);
  const [celebrate, setCelebrate] = React.useState('');
  const [loadErr, setLoadErr] = React.useState('');
  const [diagnostic, setDiagnostic] = React.useState<Diagnostic | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [progRes, meRes, teamRes] = await Promise.all([
        authedFetch('/api/workout/programs'),
        authedFetch('/api/workout/me'),
        authedFetch('/api/workout/team'),
      ]);
      const progData = await progRes.json();
      const meData = await meRes.json();
      const teamData = await teamRes.json();
      setPrograms(progData.programs || []);
      setDiagnostic(progData.diagnostic || null);
      if (!selectedProgramId && progData.programs?.[0]) setSelectedProgramId(progData.programs[0].id);
      setStreak(meData.streak || 0);
      setPersonalBests(meData.personalBests || []);
      setRecent(meData.recent || []);
      setLeaderboard(teamData.leaderboard || []);
      if (!progRes.ok) setLoadErr(progData.error || 'Could not load workout programs.');
    } catch {
      setLoadErr('Could not load training data — check your connection and pull to refresh.');
    }
    setLoading(false);
  }, [selectedProgramId]);

  React.useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const program = programs.find(p => p.id === selectedProgramId) || null;

  function setField(exId: string, field: 'sets' | 'reps' | 'weight', val: string) {
    setEntries(prev => ({ ...prev, [exId]: { ...prev[exId], [field]: val } as any }));
  }

  async function logExercise(ex: Exercise) {
    const e = entries[ex.id];
    if (!e?.sets || !e?.reps) return;
    setSaving(ex.id);
    try {
      const res = await authedFetch('/api/workout/log', {
        method: 'POST',
        body: JSON.stringify({ program_exercise_id: ex.id, sets: Number(e.sets), reps: Number(e.reps), weight_kg: e.weight ? Number(e.weight) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log.');
      setEntries(prev => { const n = { ...prev }; delete n[ex.id]; return n; });
      setStreak(data.streak ?? streak);
      if (data.isNewPb) {
        setCelebrate(`🎉 New PB — ${ex.name}!`);
        setTimeout(() => setCelebrate(''), 3000);
      }
      load();
    } catch {}
    setSaving(null);
  }

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {loadErr && (
        <div style={{ borderRadius: 14, border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)', padding: '12px 16px', fontSize: 12, color: '#fca5a5' }}>
          {loadErr}
        </div>
      )}
      {celebrate && (
        <div style={{ borderRadius: 14, border: `1px solid ${C}50`, background: `${C}15`, padding: '14px 16px', textAlign: 'center', fontWeight: 800, fontSize: 14, color: C }}>
          {celebrate}
        </div>
      )}

      {/* Streak */}
      <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 28 }}>🔥</div>
        <div>
          <p style={{ fontSize: 18, fontWeight: 900, color: 'white', margin: 0 }}>{streak} day{streak === 1 ? '' : 's'}</p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Current streak</p>
        </div>
      </div>

      {/* Program picker + logging */}
      {programs.length === 0 ? (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', margin: 0 }}>No workout programs published yet — check back once your coach sets one up.</p>
          {diagnostic && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              {diagnostic.totalActivePrograms === 0 ? (
                <p style={{ margin: 0 }}>Why: no active programs exist in the system at all right now.</p>
              ) : (
                <>
                  <p style={{ margin: 0 }}>Why: {diagnostic.totalActivePrograms} program{diagnostic.totalActivePrograms === 1 ? ' exists' : 's exist'}, but none match your team.</p>
                  <p style={{ margin: 0 }}>Your team: <b style={{ color: 'rgba(255,255,255,0.55)' }}>{diagnostic.athleteTeam || (diagnostic.athleteLinked ? '(not set)' : '(no linked athlete record)')}</b></p>
                  <p style={{ margin: 0 }}>Program team(s): <b style={{ color: 'rgba(255,255,255,0.55)' }}>{diagnostic.programTeams.map(t => t || '(blank/all teams)').join(', ')}</b></p>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          {programs.length > 1 && (
            <select value={selectedProgramId} onChange={e => setSelectedProgramId(e.target.value)}
              style={{ width: '100%', marginBottom: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', color: 'white', fontSize: 13 }}>
              {programs.map(p => <option key={p.id} value={p.id} style={{ background: '#0a0f24' }}>{p.title}</option>)}
            </select>
          )}
          {program && (
            <>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 12 }}>{program.title}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {program.exercises.map(ex => (
                  <div key={ex.id} style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)', padding: 12 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{ex.name}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>
                      {[ex.target_sets ? `Target: ${ex.target_sets} sets` : null, ex.target_reps].filter(Boolean).join(' · ') || 'No target set'}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 6 }}>
                      <input type="number" placeholder="Sets" value={entries[ex.id]?.sets || ''} onChange={e => setField(ex.id, 'sets', e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 6px', color: 'white', fontSize: 12, textAlign: 'center' }} />
                      <input type="number" placeholder="Reps" value={entries[ex.id]?.reps || ''} onChange={e => setField(ex.id, 'reps', e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 6px', color: 'white', fontSize: 12, textAlign: 'center' }} />
                      <input type="number" placeholder="kg" value={entries[ex.id]?.weight || ''} onChange={e => setField(ex.id, 'weight', e.target.value)}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 6px', color: 'white', fontSize: 12, textAlign: 'center' }} />
                      <button onClick={() => logExercise(ex)} disabled={saving === ex.id || !entries[ex.id]?.sets || !entries[ex.id]?.reps}
                        style={{ border: 'none', borderRadius: 8, padding: '8px 12px', background: C, color: 'white', fontSize: 12, fontWeight: 800, cursor: 'pointer', opacity: saving === ex.id ? 0.5 : 1 }}>
                        {saving === ex.id ? '…' : 'Log'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Personal bests */}
      {personalBests.length > 0 && (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 10 }}>Your Personal Bests</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {personalBests.map((pb, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{pb.exerciseName}</span>
                <span style={{ fontWeight: 800, color: C }}>{pb.weightKg}kg</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team activity (light social) */}
      {leaderboard.length > 0 && (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 10 }}>This Week — Team</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {leaderboard.map((row, i) => (
              <div key={row.athleteId} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12 }}>
                <span style={{ width: 18, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>{i + 1}</span>
                <span style={{ flex: 1, color: 'white' }}>{row.name}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>{row.sessionsThisWeek} session{row.sessionsThisWeek === 1 ? '' : 's'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent log */}
      {recent.length > 0 && (
        <div style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: 'white', marginBottom: 10 }}>Recent</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recent.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>{r.exerciseName}</span>
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>{r.sets}×{r.reps}{r.weight_kg ? ` @ ${r.weight_kg}kg` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
