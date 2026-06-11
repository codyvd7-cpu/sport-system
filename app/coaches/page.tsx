'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRole } from '@/lib/useRole';
import { useToast } from '@/components/Toast';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

type Coach = { id: string; email: string; full_name: string; role: string; teams?: string[]; is_active?: boolean };

const TEAM_GROUPS = [
  { group: 'Senior', teams: ['1sts','2nds','3rds','4ths','5ths'] },
  { group: 'U16',    teams: ['U16A','U16B','U16C','U16D','U16E'] },
  { group: 'U15',    teams: ['U15A','U15B','U15C','U15D','U15E'] },
  { group: 'U14',    teams: ['U14A','U14B','U14C','U14D','U14E'] },
];

const ROLE_STYLE: Record<string,{label:string;bg:string;color:string}> = {
  owner:          { label:'Owner',          bg:'bg-rose-500/15',   color:'text-rose-300'  },
  head_of_hockey: { label:'Head of Hockey', bg:'bg-amber-500/15',  color:'text-amber-300' },
  coach:          { label:'Coach',          bg:'bg-white/5',     color:'text-white/50' },
};

function initials(name: string) {
  return (name||'?').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
}

export default function CoachesPage() {
  const { showToast } = useToast();
  const {isHOH, isOwner, email, sport, loading: roleLoading} = useRole();
  const [coaches, setCoaches] = React.useState<Coach[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showInvite, setShowInvite] = React.useState(false);
  const [selectedCoach, setSelectedCoach] = React.useState<Coach|null>(null);

  // Invite form
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteName, setInviteName] = React.useState('');
  const [inviteTeams, setInviteTeams] = React.useState<string[]>([]);
  const [inviteRole, setInviteRole] = React.useState<'coach'|'head_of_hockey'>('coach');
  const [inviting, setInviting] = React.useState(false);

  // Edit state (in modal)
  const [editName, setEditName] = React.useState('');
  const [editRole, setEditRole] = React.useState('coach');
  const [editTeams, setEditTeams] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  async function load() {
    let coachQ = supabase.from('staff_roles').select('*').eq('is_active', true).order('full_name');
    if (sport) coachQ = coachQ.eq('sport', sport);
    const { data } = await coachQ;
    setCoaches(data || []);
    setLoading(false);
  }

  React.useEffect(() => { load(); }, []);

  function openEdit(c: Coach) {
    setSelectedCoach(c);
    setEditName(c.full_name || '');
    setEditRole(c.role);
    setEditTeams(c.teams || []);
  }

  function toggleEditTeam(t: string) {
    setEditTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  async function saveEdit() {
    if (!selectedCoach) return;
    setSaving(true);
    const { error } = await supabase.from('staff_roles').update({
      full_name: editName.trim(),
      role: editRole,
      teams: editRole === 'head_of_hockey' ? [] : editTeams,
    }).eq('id', selectedCoach.id);
    if (error) { showToast(`Error: ${error.message}`, 'error'); }
    else { showToast('Coach updated ✓'); setSelectedCoach(null); load(); }
    setSaving(false);
  }

  async function removeCoach() {
    if (!selectedCoach) return;
    if (!confirm(`Remove ${selectedCoach.full_name || selectedCoach.email}? They will lose access immediately.`)) return;
    await supabase.from('staff_roles').update({ is_active: false }).eq('id', selectedCoach.id);
    showToast('Coach removed');
    setSelectedCoach(null);
    load();
  }

  async function handleInvite() {
    if (!inviteEmail.trim() || !inviteName.trim()) { showToast('Email and name required.', 'error'); return; }
    if (inviteRole === 'coach' && inviteTeams.length === 0) { showToast('Assign at least one team.', 'error'); return; }
    setInviting(true);
    try {
      const res = await fetch('/api/admin/invite-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim().toLowerCase(), name: inviteName.trim(), role: inviteRole, teams: inviteRole === 'head_of_hockey' ? [] : inviteTeams }),
      });
      const result = await res.json();
      if (!res.ok) { showToast(`Failed: ${result.error}`, 'error'); }
      else { showToast(`Invite sent to ${inviteEmail} ✓`); setInviteEmail(''); setInviteName(''); setInviteTeams([]); setInviteRole('coach'); setShowInvite(false); load(); }
    } catch (e: any) { showToast(`Error: ${e.message}`, 'error'); }
    setInviting(false);
  }

  const activeCoaches = coaches.filter(c => c.is_active !== false);

  return (
    <FadeUp delay={0}>
    <main className="min-h-screen pb-24 text-white md:pb-0 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-400">Head of Hockey</p>
            <h1 className="mt-0.5 text-3xl font-black text-white tracking-tight">Coaching Staff</h1>
            <p className="mt-1 text-sm text-white/35">{activeCoaches.length} active · tap a coach to edit</p>
          </div>
          <button onClick={() => setShowInvite(v => !v)}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-black transition ${showInvite ? 'border-white/8 bg-white/5 text-white/50' : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'}`}>
            {showInvite ? 'Cancel' : '+ Add Coach'}
          </button>
        </div>

        {/* Invite form */}
        {showInvite && (
          <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-400">New Coach</p>
        <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/35">Full Name</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Smith"
                  className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition"/>
              </div>
              <div>
                <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/35">Email</label>
                <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="coach@stbenedicts.co.za"
                  className="w-full rounded-xl border border-white/8 bg-[#04060e] px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500 transition"/>
              </div>
            </div>
            <div className="flex gap-2">
              {(['coach','head_of_hockey'] as const).map(r => (
                <button key={r} onClick={() => setInviteRole(r)}
                  className={`rounded-xl border px-4 py-2 text-xs font-black transition ${inviteRole === r ? 'border-amber-500/40 bg-amber-500/15 text-amber-300' : 'border-white/8 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                  {r === 'coach' ? 'Coach' : 'Head of Hockey'}
                </button>
              ))}
            </div>
            {inviteRole === 'coach' && (
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wide text-white/35">Teams</label>
                {TEAM_GROUPS.map(g => (
                  <div key={g.group}>
                    <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-white/15">{g.group}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {g.teams.map(t => (
                        <button key={t} onClick={() => setInviteTeams(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-black transition ${inviteTeams.includes(t) ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-white/8 bg-[rgba(255,255,255,0.025)] text-white/35 hover:text-white'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={handleInvite} disabled={inviting || !inviteEmail.trim() || !inviteName.trim()}
              className="w-full rounded-xl border border-amber-500/40 bg-amber-500/15 py-3 text-sm font-black text-amber-300 hover:bg-amber-500/25 transition disabled:opacity-50">
              {inviting ? 'Sending…' : 'Send Invite →'}
            </button>
          </div>
        )}

        {/* Coach cards grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"/>
          </div>
        ) : activeCoaches.length === 0 ? (
          <div className="rounded-2xl border border-white/5 py-12 text-center" style={{background:'rgba(255,255,255,0.02)'}}>
            <p className="text-sm text-white/25">No coaches added yet.</p>
          </div>
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
            {activeCoaches.map(c => {
              const rs = ROLE_STYLE[c.role] || ROLE_STYLE.coach;
              const assignedTeams = c.teams || [];
              return (
                <button key={c.id} onClick={() => openEdit(c)}
                  className="group w-full text-left rounded-2xl border border-white/5 p-4 transition hover:border-white/15"
                  style={{background:'rgba(255,255,255,0.02)'}}>
                  <div className="flex items-start gap-3">
                    {/* Avatar / Photo */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black overflow-hidden"
                      style={{background:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.7)'}}>
                      {(c as any).photo_url
                        ? <img src={(c as any).photo_url} alt={c.full_name} className="h-full w-full object-cover"/>
                        : initials(c.full_name || c.email)
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-white truncate">{c.full_name || c.email}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${rs.bg} ${rs.color}`}>{rs.label}</span>
                      </div>
                      <p className="text-[11px] text-white/25 truncate mt-0.5">{c.email}</p>
                      {assignedTeams.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {assignedTeams.map(t => (
                            <span key={t} className="rounded-lg border border-sky-500/20 bg-sky-500/8 px-2 py-0.5 text-[9px] font-black text-sky-400">{t}</span>
                          ))}
                        </div>
                      ) : c.role === 'coach' ? (
                        <p className="mt-1.5 text-[10px] text-amber-500/70">No teams assigned</p>
                      ) : (
                        <p className="mt-1.5 text-[10px] text-white/15">All teams</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <Link href={`/coaches/${c.id}`} onClick={e => e.stopPropagation()}
                        className="flex items-center justify-center h-7 w-7 rounded-lg border border-white/8 text-white/30 hover:text-white transition"
                        style={{background:'rgba(255,255,255,0.04)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                      </Link>
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-white/20 group-hover:text-white/50 transition"
                        style={{background:'rgba(255,255,255,0.03)'}}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {selectedCoach && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelectedCoach(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"/>
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 p-6 shadow-2xl z-10 space-y-5"
            style={{background:'#0d1117'}}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white/70"
                  style={{background:'rgba(255,255,255,0.06)'}}>
                  {initials(selectedCoach.full_name || selectedCoach.email)}
                </div>
                <div>
                  <p className="text-sm font-black text-white">{selectedCoach.full_name || selectedCoach.email}</p>
                  <p className="text-[11px] text-white/35">{selectedCoach.email}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCoach(null)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 text-white/35 hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Full name */}
            <div>
              <label className="mb-1.5 block text-[10px] font-black uppercase tracking-wide text-white/35">Full Name</label>
              <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name"
                className="w-full rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-sm text-white outline-none focus:border-sky-500/50 transition"/>
            </div>

            {/* Role */}
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-white/35">Role</label>
              <div className="flex gap-2">
                {(['coach','head_of_hockey'] as const).map(r => (
                  <button key={r} onClick={() => setEditRole(r)} disabled={selectedCoach.role === 'owner'}
                    className={`flex-1 rounded-xl border py-2 text-xs font-black transition ${editRole === r ? 'border-sky-500/40 bg-sky-500/15 text-sky-300' : 'border-white/8 bg-white/3 text-white/35 hover:text-white'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                    {r === 'coach' ? 'Coach' : 'HOH'}
                  </button>
                ))}
              </div>
            </div>

            {/* Teams */}
            {editRole === 'coach' && (
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-wide text-white/35">Teams</label>
                <div className="space-y-2">
                  {TEAM_GROUPS.map(g => (
                    <div key={g.group}>
                      <p className="mb-1 text-[9px] font-black uppercase tracking-wide text-white/15">{g.group}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.teams.map(t => (
                          <button key={t} onClick={() => toggleEditTeam(t)}
                            className={`rounded-lg border px-2.5 py-1 text-xs font-black transition ${editTeams.includes(t) ? 'border-sky-500/30 bg-sky-500/12 text-sky-300' : 'border-white/6 bg-white/3 text-white/25 hover:text-white/65'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {editTeams.length > 0 && (
                  <p className="mt-2 text-[11px] text-sky-400 font-semibold">{editTeams.join(', ')}</p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={saveEdit} disabled={saving}
                className="flex-1 rounded-xl border border-sky-500/30 bg-sky-500/12 py-2.5 text-sm font-black text-sky-300 hover:bg-sky-500/20 transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
              {selectedCoach.role === 'coach' && (
                <button onClick={removeCoach}
                  className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-black text-red-400 hover:bg-red-500/15 transition">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
    </FadeUp>
  );
}