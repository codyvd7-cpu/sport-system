'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/Toast';

import { fDate, fDay, fMonth, fMonthKey } from '@/lib/dates';
import { FadeUp, StaggerList, StaggerItem, HoverCard, CountUp } from '@/components/Motion';

type Row = Record<string, any>;
type PageProps = { params: Promise<{ id: string }> };

function initials(n: string) {
  return (n || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
}

const ROLE_COLOR: Record<string,string> = {
  owner: '#f87171', head_of_hockey: '#fbbf24', coach: '#38bdf8',
};

export default function CoachProfilePage({ params }: PageProps) {
  const { id } = React.use(params);
  const { showToast } = useToast();
  const [coach, setCoach]         = React.useState<Row | null>(null);
  const [sessions, setSessions]   = React.useState<Row[]>([]);
  const [loading, setLoading]     = React.useState(true);
  const [saving, setSaving]       = React.useState(false);
  const [editBio, setEditBio]     = React.useState('');
  const [editNotes, setEditNotes] = React.useState('');
  const [photo, setPhoto]         = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [tab, setTab]             = React.useState<'overview'|'sessions'|'paysheet'>('overview');
  const [month, setMonth]         = React.useState(() => fMonthKey());
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    async function load() {
      const { data: c } = await supabase.from('staff_roles').select('*').eq('id', id).single();
      if (!c) { setLoading(false); return; }
      setCoach(c);
      setEditBio(c.bio || '');
      setEditNotes(c.hoh_notes || '');
      if (c.photo_url) setPhoto(c.photo_url);

      // Load attendance sessions marked by this coach
      const { data: att } = await supabase
        .from('attendance')
        .select('session_date, session_type, athlete_id')
        .eq('coach_email', c.email)
        .order('session_date', { ascending: false })
        .limit(200);
      setSessions(att || []);
      setLoading(false);
    }
    load();
  }, [id]);

  async function save() {
    if (!coach) return;
    setSaving(true);
    await supabase.from('staff_roles').update({ bio: editBio.trim(), hoh_notes: editNotes.trim() }).eq('id', id);
    showToast('Profile updated ✓');
    setSaving(false);
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !coach) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = ev => { if (ev.target?.result) setPhoto(ev.target.result as string); };
    reader.readAsDataURL(file);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('coachId', coach.id);
      const res = await fetch('/api/admin/coach-photo', { method: 'POST', body: fd });
      const d = await res.json();
      if (d.url) setPhoto(d.url);
      else showToast('Upload failed', 'error');
    } catch { showToast('Upload failed', 'error'); }
    setUploading(false);
  }

  // Session stats
  const uniqueSessions = React.useMemo(() => {
    const seen = new Set<string>();
    return sessions.filter(s => {
      const k = `${s.session_date}|${s.session_type}`;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
  }, [sessions]);

  const monthSessions = React.useMemo(() =>
    uniqueSessions.filter(s => s.session_date?.startsWith(month)),
    [uniqueSessions, month]
  );

  const thisMonth  = fMonthKey();
  const lastMonth  = fMonthKey(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const thisMonthCount = uniqueSessions.filter(s => s.session_date?.startsWith(thisMonth)).length;
  const lastMonthCount = uniqueSessions.filter(s => s.session_date?.startsWith(lastMonth)).length;

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-500 border-t-transparent"/>
    </main>
  );

  if (!coach) return (
    <main className="min-h-screen flex items-center justify-center" style={{background:'var(--bg)'}}>
      <div className="text-center">
        <p className="text-white/50">Coach not found.</p>
        <Link href="/coaches" className="mt-3 inline-block text-sm text-sky-400">← Back</Link>
      </div>
    </main>
  );

  const accent = ROLE_COLOR[coach.role] || '#38bdf8';
  const roleLabel = coach.role === 'head_of_hockey' ? 'Head of Hockey' : coach.role === 'owner' ? 'Owner' : 'Coach';

  return (
    <main className="min-h-screen pb-24 text-white md:pb-8 overflow-x-hidden" style={{background:'var(--bg)'}}>
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full blur-[80px]"
          style={{background:`${accent}08`}}/>
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-6 sm:px-6">

        {/* Back */}
        <FadeUp delay={0}>
        <Link href="/coaches" className="mb-5 inline-flex items-center gap-1.5 text-[11px] font-medium transition"
          style={{color:'rgba(255,255,255,0.3)'}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Coaching Staff
        </Link>

        {/* ── HERO ── */}
        <div className="mb-5 relative overflow-hidden rounded-3xl" style={{
          background:`linear-gradient(135deg,${accent}0a 0%,rgba(255,255,255,0.015) 100%)`,
          border:'1px solid rgba(255,255,255,0.07)',
        }}>
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{background:`linear-gradient(90deg,transparent,${accent}60,transparent)`}}/>

          <div className="p-6">
            <div className="flex items-start gap-5">
              {/* Photo / Avatar */}
              <div className="relative shrink-0">
                <div onClick={() => fileRef.current?.click()}
                  className="relative flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-2xl"
                  style={{
                    background: photo ? 'transparent' : `linear-gradient(135deg,${accent}25,${accent}10)`,
                    border: `1px solid ${accent}30`,
                  }}>
                  {photo
                    ? <img src={photo} alt={coach.full_name} className="h-full w-full object-cover"/>
                    : <span className="text-2xl font-black" style={{color:accent}}>{initials(coach.full_name || coach.email)}</span>
                  }
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center" style={{background:'rgba(0,0,0,0.7)'}}>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"/>
                    </div>
                  )}
                  {/* Upload overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    style={{background:'rgba(0,0,0,0.5)'}}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2} className="h-5 w-5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden"/>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] mb-1" style={{color:`${accent}90`}}>
                  Coaching Staff
                </p>
                <h1 className="text-2xl font-black text-white leading-tight tracking-tight">
                  {coach.full_name || coach.email}
                </h1>
                <p className="text-[12px] mt-0.5" style={{color:'rgba(255,255,255,0.35)'}}>{coach.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                    style={{background:`${accent}12`,color:accent,border:`1px solid ${accent}25`}}>
                    {roleLabel}
                  </span>
                  {(coach.teams || []).map((t: string) => (
                    <span key={t} className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold"
                      style={{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                {label:'Total Sessions',  val:uniqueSessions.length,  color:'white'},
                {label:'This Month',      val:thisMonthCount,          color:accent},
                {label:'Last Month',      val:lastMonthCount,          color:'rgba(255,255,255,0.4)'},
              ].map(s => (
                <div key={s.label} className="rounded-2xl p-3 text-center"
                  style={{background:'rgba(0,0,0,0.2)',border:'1px solid rgba(255,255,255,0.05)'}}>
                  <p className="text-2xl font-black leading-none" style={{color:s.color}}>{s.val}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide mt-1"
                    style={{color:'rgba(255,255,255,0.2)'}}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Upload hint */}
            {!photo && (
              <button onClick={() => fileRef.current?.click()}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-semibold transition"
                style={{border:'1px dashed rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.25)',background:'transparent'}}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="h-3.5 w-3.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload profile photo
              </button>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="mb-4 flex gap-1 rounded-2xl p-1"
          style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
          {(['overview','sessions','paysheet'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 rounded-xl py-2.5 text-[12px] font-semibold capitalize transition"
              style={{
                background: tab === t ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: tab === t ? 'white' : 'rgba(255,255,255,0.3)',
              }}>
              {t}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {tab === 'overview' && (
          <div className="space-y-4">
            {/* Bio */}
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:accent}}>Biography</p>
                <p className="text-[14px] font-black text-white mt-0.5">Coach Bio</p>
              </div>
              <div className="p-5">
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="A short bio about this coach — experience, background, philosophy..."
                  rows={4}
                  className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition resize-none"
                  style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)',color:'white'}}
                />
                <p className="mt-1.5 text-[10px]" style={{color:'rgba(255,255,255,0.2)'}}>
                  {editBio.length}/300 characters
                </p>
              </div>
            </div>

            {/* HOH Internal Notes */}
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="px-5 py-4 border-b" style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'#fbbf24'}}>Internal</p>
                <p className="text-[14px] font-black text-white mt-0.5">HOH Notes</p>
                <p className="text-[11px] mt-0.5" style={{color:'rgba(255,255,255,0.3)'}}>Not visible to coach</p>
              </div>
              <div className="p-5">
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Internal notes — performance, development, concerns..."
                  rows={3}
                  className="w-full rounded-xl border px-4 py-3 text-sm text-white outline-none transition resize-none"
                  style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.08)'}}
                />
              </div>
            </div>

            <button onClick={save} disabled={saving}
              className="w-full rounded-2xl py-3 text-sm font-black transition disabled:opacity-50"
              style={{background:`${accent}12`,color:accent,border:`1px solid ${accent}25`}}>
              {saving ? 'Saving…' : 'Save Profile'}
            </button>
          </div>
        )}

        {/* ── SESSIONS TAB ── */}
        {tab === 'sessions' && (
          <div className="space-y-3">
            {uniqueSessions.length === 0 ? (
              <div className="rounded-2xl py-16 text-center"
                style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.05)'}}>
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>No sessions logged yet.</p>
                <p className="text-[11px] mt-1" style={{color:'rgba(255,255,255,0.2)'}}>
                  Sessions appear when attendance is marked with this coach&apos;s email.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden"
                style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
                <div className="px-5 py-4 border-b flex items-center justify-between"
                  style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:accent}}>History</p>
                    <p className="text-[14px] font-black text-white mt-0.5">{uniqueSessions.length} Sessions</p>
                  </div>
                </div>
                <div className="divide-y divide-white/5 max-h-96 overflow-y-auto">
                  {uniqueSessions.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold"
                        style={{background:`${accent}10`,color:accent}}>
                        {s.session_type?.[0] || 'S'}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-white">{s.session_type || 'Session'}</p>
                      </div>
                      <p className="text-[11px] shrink-0" style={{color:'rgba(255,255,255,0.3)'}}>{fDate(s.session_date)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAYSHEET TAB ── */}
        {tab === 'paysheet' && (
          <div className="space-y-4">
            {/* Month picker */}
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-semibold" style={{color:'rgba(255,255,255,0.4)'}}>Month:</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                className="rounded-xl border px-3 py-1.5 text-sm text-white outline-none"
                style={{background:'rgba(255,255,255,0.04)',borderColor:'rgba(255,255,255,0.08)'}}/>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl overflow-hidden"
              style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div className="px-5 py-4 border-b"
                style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{color:'#10b981'}}>Paysheet</p>
                <p className="text-[14px] font-black text-white mt-0.5">
                  {fMonth(month + '-01')}
                </p>
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[13px]" style={{color:'rgba(255,255,255,0.5)'}}>Sessions conducted</p>
                  <p className="text-3xl font-black" style={{color:'#10b981'}}>{monthSessions.length}</p>
                </div>

                {monthSessions.length === 0 ? (
                  <p className="text-sm text-center py-6" style={{color:'rgba(255,255,255,0.25)'}}>
                    No sessions this month.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {monthSessions.map((s, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b"
                        style={{borderColor:'rgba(255,255,255,0.04)'}}>
                        <div className="flex items-center gap-2.5">
                          <span className="rounded-lg px-2 py-0.5 text-[9px] font-bold"
                            style={{background:`${accent}10`,color:accent}}>
                            {s.session_type || 'Session'}
                          </span>
                        </div>
                        <p className="text-[11px]" style={{color:'rgba(255,255,255,0.35)'}}>{fMonth(s.session_date)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Export */}
            <button onClick={() => {
              const rows = [
                ['Coach', coach.full_name || coach.email],
                ['Email', coach.email],
                ['Month', fMonth(month + '-01')],
                ['Total Sessions', monthSessions.length.toString()],
                [''],
                ['Date', 'Session Type'],
                ...monthSessions.map(s => [s.session_date, s.session_type || 'Session']),
              ];
              const csv = rows.map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${(coach.full_name || 'coach').replace(/\s+/g, '_')}_${month}_paysheet.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black transition"
              style={{background:'rgba(16,185,129,0.08)',color:'#10b981',border:'1px solid rgba(16,185,129,0.2)'}}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export CSV
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
