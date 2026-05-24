'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

type Coach = { id: string; email: string; full_name: string; role: string; teams?: string[]; is_active?: boolean };

const TEAM_GROUPS = [
  { group: 'Senior', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    teams: ['U14A','U14B','U14C','U14D','U14E'] },
];

export default function CoachesPage() {
  const { showToast } = useToast();
  const [coaches, setCoaches] = React.useState<Coach[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteTeams, setInviteTeams] = React.useState<string[]>([]);
  const [inviteRole, setInviteRole] = React.useState<'coach'|'head_of_hockey'>('coach');
  const [inviting, setInviting] = React.useState(false);

  function toggleTeam(t: string) {
    setInviteTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function load() {
    const { data } = await supabase.from('staff_roles').select('*').order('full_name');
    setCoaches(data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) { showToast('Email and name are required.', 'error'); return; }
    if (inviteRole === 'coach' && inviteTeams.length === 0) { showToast('Assign at least one team to this coach.', 'error'); return; }
    setInviting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/admin/invite-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          name: inviteName.trim(),
          role: inviteRole,
          teams: inviteRole === 'head_of_hockey' ? [] : inviteTeams,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        showToast(`Failed: ${result.error}`, 'error');
      } else {
        showToast(`Invite sent to ${inviteEmail} ✓`);
        setInviteEmail(''); setInviteName(''); setInviteTeams([]); setInviteRole('coach');
        load();
      }
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }

    setInviting(false);
  }

  async function removeCoach(id: string, name: string) {
    if (!confirm(`Remove ${name}? They will lose access immediately.`)) return;
    await supabase.from('staff_roles').update({ is_active: false }).eq('id', id);
    showToast(`${name} removed`);
    load();
  }

  async function updateTeams(id: string, teams: string[]) {
    await supabase.from('staff_roles').update({ teams }).eq('id', id);
    showToast('Teams updated ✓');
    load();
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-20 text-white md:pb-0">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">Head of Hockey</p>
          <h1 className="mt-1 text-3xl font-black text-white">Coaching Staff</h1>
          <p className="mt-1 text-sm text-slate-500">Invite coaches and assign their teams. Each coach only sees their own squad.</p>
        </div>

        {/* Invite form */}
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-amber-400">Invite a Coach</p>
          <div className="grid gap-3 sm:grid-cols-2 mb-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Full Name</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Smith"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"/>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Email</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="coach@stbenedicts.co.za"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500"/>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-slate-500">Role</label>
            <div className="flex gap-2">
              {(['coach','head_of_hockey'] as const).map(r => (
                <button key={r} onClick={() => setInviteRole(r)}
                  className={`rounded-xl border px-4 py-2 text-xs font-black transition ${inviteRole === r ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'}`}>
                  {r === 'coach' ? 'Coach' : 'Head of Hockey'}
                </button>
              ))}
            </div>
          </div>

          {inviteRole === 'coach' && (
            <div className="mb-4">
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                Assign Teams <span className="text-slate-700">(select all that apply)</span>
              </label>
              <div className="space-y-2">
                {TEAM_GROUPS.map(g => (
                  <div key={g.group}>
                    <p className="mb-1.5 text-[9px] font-black uppercase tracking-wide text-slate-700">{g.group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.teams.map(t => (
                        <button key={t} onClick={() => toggleTeam(t)}
                          className={`rounded-lg border px-2.5 py-1.5 text-xs font-black transition ${inviteTeams.includes(t) ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-slate-700 bg-slate-900 text-slate-500 hover:text-white'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {inviteTeams.length > 0 && (
                <p className="mt-2 text-[11px] text-sky-400 font-semibold">{inviteTeams.join(', ')}</p>
              )}
            </div>
          )}

          <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
            className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 text-sm font-black text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50">
            {inviting ? 'Sending...' : 'Send Invite →'}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-600">They'll receive an email to set their password.</p>
        </div>

        {/* Staff list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Coaching Staff</p>
            <span className="text-xs text-slate-600">{coaches.length} member{coaches.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"/>
            </div>
          ) : coaches.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-600">No staff added yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {coaches.filter(c => c.is_active !== false).map(c => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                      {(c.full_name || c.email || '?').split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{c.full_name || c.email}</p>
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${c.role === 'owner' ? 'bg-rose-500/15 text-rose-300' : c.role === 'head_of_hockey' ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                        {c.role === 'head_of_hockey' ? 'HOH' : c.role === 'owner' ? 'Owner' : 'Coach'}
                      </span>
                      {c.role === 'coach' && (
                        <button onClick={() => removeCoach(c.id, c.full_name || c.email)}
                          className="rounded-lg border border-red-500/20 bg-red-500/5 px-2 py-1 text-[10px] font-black text-red-400 hover:bg-red-500/15 transition">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Teams display + edit for coaches */}
                  {c.role === 'coach' && (
                    <div className="ml-12">
                      <p className="text-[10px] text-slate-600 mb-1">Assigned teams:</p>
                      <div className="flex flex-wrap gap-1">
                        {TEAM_GROUPS.flatMap(g => g.teams).map(t => {
                          const assigned = (c.teams || []).includes(t);
                          return (
                            <button key={t} onClick={async () => {
                              const current = c.teams || [];
                              const next = current.includes(t) ? current.filter(x => x !== t) : [...current, t];
                              await updateTeams(c.id, next);
                            }}
                              className={`rounded-lg border px-2 py-0.5 text-[9px] font-black transition ${assigned ? 'border-sky-500/30 bg-sky-500/10 text-sky-300' : 'border-slate-800 bg-slate-950 text-slate-700 hover:text-slate-500'}`}>
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {(c.role === 'head_of_hockey' || c.role === 'owner') && (
                    <div className="ml-12">
                      <span className="text-[10px] text-slate-600">Access to all teams</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}