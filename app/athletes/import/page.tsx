'use client';
import * as React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useBranding } from '@/components/BrandingProvider';

// ─── /athletes/import ─────────────────────────────────────────────────────────
// Bulk athlete import for onboarding.
//
// Paste-based rather than file upload, because a squad list is almost always
// already in a spreadsheet or an email — copy and paste is fewer steps than
// export, save, locate, upload.
//
// Always previews before writing. Creating hundreds of children's records is
// not something that should happen on one unconfirmed click.

type Preview = {
  preview: true;
  willCreate: number;
  duplicates: number;
  problems: number;
  sample: { fullName: string; team: string | null; ageGroup: string | null }[];
  problemRows: { fullName: string; issue?: string }[];
};

export default function ImportAthletesPage() {
  const { branding } = useBranding();
  const [text, setText] = React.useState('');
  const [defaultTeam, setDefaultTeam] = React.useState('');
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [done, setDone] = React.useState<{ created: number } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');

  const call = React.useCallback(async (confirm: boolean) => {
    setBusy(true); setErr('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Signed out.');
      const res = await fetch('/api/athletes/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ text, confirm, defaultTeam: defaultTeam || null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Import failed.');
      if (d.preview) setPreview(d);
      else { setDone({ created: d.created }); setPreview(null); }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Import failed.');
    }
    setBusy(false);
  }, [text, defaultTeam]);

  const input = 'w-full rounded-xl border border-white/10 bg-[#04060e] px-3 py-2.5 text-[12.5px] text-white outline-none placeholder:text-white/25 focus:border-white/25';

  return (
    <div className="min-h-screen bg-[#05070d] px-6 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/athletes" className="text-[12px] text-white/35 hover:text-white/60">← Athletes</Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight">Import athletes</h1>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-white/40">
          Paste a squad list straight from a spreadsheet. One athlete per line.
        </p>

        {done ? (
          <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-8 text-center">
            <p className="text-[18px] font-black text-emerald-300">{done.created} athletes added</p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/athletes"
                className="rounded-xl border px-4 py-2.5 text-[12px] font-bold"
                style={{ borderColor: branding.primaryColor + '55', color: branding.primaryColor }}>
                View athletes
              </Link>
              <button onClick={() => { setDone(null); setText(''); }}
                className="rounded-xl border border-white/12 px-4 py-2.5 text-[12px] text-white/50">
                Import more
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/30">
                Expected columns
              </p>
              <p className="font-mono text-[11px] leading-relaxed text-white/45">
                Name, Team, Age group, Position, Parent email, Parent phone
              </p>
              <p className="mt-2 text-[10.5px] leading-relaxed text-white/25">
                Only the name is required. A header row is detected automatically, and columns
                can be in any order if you include one.
              </p>
            </div>

            <textarea
              value={text}
              onChange={e => { setText(e.target.value); setPreview(null); }}
              rows={10}
              placeholder={'Thabo Molefe, 1st XI, U18, Midfield\nJames Smith, 1st XI, U18, Striker\nSipho Ndlovu, U16A, U16, Defence'}
              className={`mt-3 font-mono ${input}`}
            />

            <div className="mt-3">
              <label className="mb-1.5 block text-[11px] font-bold text-white/40">
                Default team <span className="font-normal text-white/25">(used when a row has no team)</span>
              </label>
              <input value={defaultTeam} onChange={e => setDefaultTeam(e.target.value)}
                placeholder="e.g. 1st XI" className={input} />
            </div>

            {err && <p className="mt-3 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</p>}

            {preview && (
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[13px] font-bold text-white">
                  Ready to add {preview.willCreate} athlete{preview.willCreate === 1 ? '' : 's'}
                </p>
                {(preview.duplicates > 0 || preview.problems > 0) && (
                  <p className="mt-1 text-[11.5px] text-white/40">
                    {preview.duplicates > 0 && `${preview.duplicates} already on the system`}
                    {preview.duplicates > 0 && preview.problems > 0 && ' · '}
                    {preview.problems > 0 && `${preview.problems} row${preview.problems === 1 ? '' : 's'} need attention`}
                  </p>
                )}

                {preview.sample.length > 0 && (
                  <div className="mt-3 space-y-0.5">
                    {preview.sample.map((r, i) => (
                      <p key={i} className="text-[11.5px] text-white/55">
                        {r.fullName}
                        {r.team && <span className="text-white/25"> · {r.team}</span>}
                      </p>
                    ))}
                    {preview.willCreate > preview.sample.length && (
                      <p className="text-[11px] text-white/25">
                        …and {preview.willCreate - preview.sample.length} more
                      </p>
                    )}
                  </div>
                )}

                {preview.problemRows.length > 0 && (
                  <div className="mt-3 rounded-xl bg-amber-500/[0.07] p-3">
                    <p className="text-[11px] font-bold text-amber-200/80">These rows will be skipped</p>
                    {preview.problemRows.map((r, i) => (
                      <p key={i} className="mt-0.5 text-[11px] text-white/40">
                        {r.fullName || '(blank)'} — {r.issue}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {preview ? (
                <>
                  <button onClick={() => call(true)} disabled={busy || preview.willCreate === 0}
                    className="flex-1 rounded-xl py-3 text-[13px] font-bold disabled:opacity-40"
                    style={{ background: branding.primaryColor + '22', border: `1px solid ${branding.primaryColor}66`, color: branding.primaryColor }}>
                    {busy ? 'Adding…' : `Add ${preview.willCreate} athletes`}
                  </button>
                  <button onClick={() => setPreview(null)}
                    className="rounded-xl border border-white/12 px-4 py-3 text-[12px] text-white/50">Back</button>
                </>
              ) : (
                <button onClick={() => call(false)} disabled={busy || !text.trim()}
                  className="w-full rounded-xl py-3 text-[13px] font-bold disabled:opacity-40"
                  style={{ background: branding.primaryColor + '22', border: `1px solid ${branding.primaryColor}66`, color: branding.primaryColor }}>
                  {busy ? 'Checking…' : 'Preview import'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
