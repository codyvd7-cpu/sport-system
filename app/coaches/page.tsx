'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';

type Coach = {
  id: string;
  email: string;
  full_name: string;
  team: string;
  role: string;
  created_at: string;
};

export default function CoachesPage() {
  const [coaches, setCoaches] = React.useState<Coach[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteTeam, setInviteTeam] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'coach' | 'head_of_hockey'>('coach');
  const [inviting, setInviting] = React.useState(false);
  const [toast, setToast] = React.useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  }

  async function load() {
    const { data, error } = await supabase.from('coaches').select('*').order('full_name');
    if (error) { showToast(`Error loading coaches: ${error.message}`); setLoading(false); return; }
    setCoaches(data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) { showToast('Email and name are required.'); return; }
    setInviting(true);

    // Create auth user via Supabase admin invite
    const { data, error } = await supabase.auth.signUp({
      email: inviteEmail.trim().toLowerCase(),
      password: Math.random().toString(36).slice(-12) + 'A1!',
      options: {
        data: { role: inviteRole, full_name: inviteName.trim() },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    if (error) { showToast(`Invite failed: ${error.message}`); setInviting(false); return; }

    // Save to coaches table
    const { error: dbError } = await supabase.from('coaches').insert([{
      id: data.user?.id,
      email: inviteEmail.trim().toLowerCase(),
      full_name: inviteName.trim(),
      team: inviteTeam.trim(),
      role: inviteRole,
    }]);

    if (dbError) { showToast(`Invite sent but coach record failed: ${dbError.message}`); }
    else { showToast(`Invite sent to ${inviteEmail} ✓`); }

    setInviteEmail('');
    setInviteName('');
    setInviteTeam('');
    setInviteRole('coach');
    setInviting(false);
    load();
  }

  async function removeCoach(id: string, name: string) {
    if (!confirm(`Remove ${name} from the coaching staff?`)) return;
    const { error } = await supabase.from('coaches').delete().eq('id', id);
    if (error) { showToast(`Error: ${error.message}`); return; }
    showToast(`${name} removed.`);
    load();
  }

  const TEAMS = ['1sts','2nds','3rds','4ths','5ths','U16A','U16B','U16C','U16D','U16E','U15A','U15B','U15C','U15D','U15E','U14A','U14B','U14C','U14D','U14E','Multiple','All Teams'];

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-8 text-white">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-5 py-3 text-sm font-semibold text-sky-200 shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-400">Head of Hockey</p>
          <h1 className="mt-1 text-3xl font-black text-white">Manage Coaches</h1>
          <p className="mt-1 text-sm text-slate-500">Invite and manage coaching staff access.</p>
        </div>

        {/* Invite form */}
        <div className="mb-8 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="mb-4 text-xs font-black uppercase tracking-wide text-amber-400">Invite a Coach</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Full Name</label>
              <input value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="John Smith"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Email</label>
              <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="coach@stbenedicts.co.za"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Team</label>
              <select value={inviteTeam} onChange={e => setInviteTeam(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                <option value="">Select team...</option>
                {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">Role</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'coach' | 'head_of_hockey')}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500">
                <option value="coach">Coach</option>
                <option value="head_of_hockey">Head of Hockey</option>
              </select>
            </div>
          </div>
          <button onClick={handleInvite} disabled={inviting}
            className="mt-4 w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-2.5 text-sm font-black text-amber-300 transition hover:bg-amber-500/25 disabled:opacity-50">
            {inviting ? 'Sending invite...' : 'Send Invite Email →'}
          </button>
          <p className="mt-2 text-center text-[10px] text-slate-600">They'll receive an email to set their password and log in.</p>
        </div>

        {/* Coach list */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Coaching Staff</p>
            <span className="text-xs text-slate-600">{coaches.length} member{coaches.length !== 1 ? 's' : ''}</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            </div>
          ) : coaches.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-2xl mb-2">👤</p>
              <p className="text-slate-500 text-sm">No coaches added yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {coaches.map(c => (
                <div key={c.id} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-slate-300">
                    {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white text-sm">{c.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.email}{c.team ? ` · ${c.team}` : ''}</p>
                  </div>
                  <span className={`shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    c.role === 'head_of_hockey'
                      ? 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border border-slate-700 bg-slate-800 text-slate-400'
                  }`}>
                    {c.role === 'head_of_hockey' ? 'HOH' : 'Coach'}
                  </span>
                  <button onClick={() => removeCoach(c.id, c.full_name)}
                    className="shrink-0 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-[11px] font-semibold text-red-400 hover:bg-red-500/15 transition">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}