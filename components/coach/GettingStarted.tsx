'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// ─── GettingStarted ────────────────────────────────────────────────────────────
// What a head of sport sees on day one, before any data exists.
//
// Without this, a school that has just signed logs in to a set of empty
// screens with no indication of what to do — the worst possible first
// impression immediately after paying. This turns that moment into a short,
// ordered list of exactly what needs doing.
//
// It disappears on its own once the school is genuinely set up, so it never
// becomes clutter for an established department.

type Progress = {
  sports: number;
  coaches: number;
  athletes: number;
  fixtures: number;
  attendanceTaken: boolean;
  portalCodes: number;
};

export default function GettingStarted() {
  const { branding } = useBranding();
  const [p, setP] = React.useState<Progress | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await fetch('/api/coach/setup-progress', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok && !stop) setP(await res.json());
      } catch { /* the dashboard works without this */ }
    })();
    return () => { stop = true; };
  }, []);

  if (!p || dismissed) return null;

  // The steps that actually matter for a department to be operational, in the
  // order they unblock each other: you can't take a register without athletes,
  // and coaches can't help until they're invited.
  const steps = [
    {
      done: p.athletes > 0,
      title: 'Add your athletes',
      detail: p.athletes > 0
        ? `${p.athletes} athlete${p.athletes === 1 ? '' : 's'} on the system`
        : 'Import a squad list, or add athletes one at a time',
      href: '/athletes',
      cta: 'Add athletes',
    },
    {
      done: p.coaches > 1,
      title: 'Invite your coaches',
      detail: p.coaches > 1
        ? `${p.coaches} staff members have access`
        : 'Give each coach their own login and assign their teams',
      href: '/coaches',
      cta: 'Invite coaches',
    },
    {
      done: p.attendanceTaken,
      title: 'Take your first register',
      detail: p.attendanceTaken
        ? 'Attendance is being recorded'
        : 'The fastest way to see Altus working — mark a session in under a minute',
      href: '/attendance',
      cta: 'Take a register',
    },
    {
      done: p.fixtures > 0,
      title: 'Add this term\u2019s fixtures',
      detail: p.fixtures > 0
        ? `${p.fixtures} fixture${p.fixtures === 1 ? '' : 's'} published`
        : 'Fixtures and results appear on the parent portal automatically',
      href: '/portal-admin',
      cta: 'Add fixtures',
    },
    {
      done: p.portalCodes > 0,
      title: 'Open the parent portal',
      detail: p.portalCodes > 0
        ? 'Access codes are ready to send to parents'
        : 'Parents see fixtures, results and the week ahead',
      href: '/portal-admin',
      cta: 'Get access codes',
    },
  ];

  const complete = steps.filter(s => s.done).length;
  // Once everything's done, this has served its purpose and should get out of
  // the way permanently rather than sitting there as a tick-list.
  if (complete === steps.length) return null;

  const next = steps.find(s => !s.done);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02]">
      <div className="flex items-baseline justify-between px-5 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/30">
            Setting up {branding.shortName}
          </p>
          <p className="mt-1 text-[15px] font-black text-white">
            {next ? next.title : 'Almost there'}
          </p>
        </div>
        <button onClick={() => setDismissed(true)}
          className="shrink-0 text-[11px] text-white/25 hover:text-white/45">Hide</button>
      </div>

      {/* Progress — quiet, not a gamified bar */}
      <div className="px-5 pt-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/8">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${(complete / steps.length) * 100}%`, background: branding.primaryColor }} />
        </div>
        <p className="mt-1.5 text-[10.5px] text-white/25">{complete} of {steps.length} done</p>
      </div>

      <div className="mt-3 divide-y divide-white/5">
        {steps.map(s => (
          <div key={s.title} className={`flex items-center gap-3 px-5 py-3 ${s.done ? 'opacity-45' : ''}`}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
              style={{
                background: s.done ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${s.done ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: s.done ? '#34d399' : 'rgba(255,255,255,0.3)',
              }}>
              {s.done ? '✓' : ''}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] font-semibold ${s.done ? 'text-white/50 line-through' : 'text-white'}`}>
                {s.title}
              </p>
              <p className="truncate text-[10.5px] text-white/30">{s.detail}</p>
            </div>
            {!s.done && (
              <Link href={s.href}
                className="shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold"
                style={{ borderColor: branding.primaryColor + '55', color: branding.primaryColor }}>
                {s.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
