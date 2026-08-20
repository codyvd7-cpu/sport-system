'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─── SchoolPicker ──────────────────────────────────────────────────────────────
// Shown on the bare landing page to someone with no school context — they've
// typed the domain directly rather than following their school's own link.
//
// Most people will never see this: schools hand out app.altusperformance.co.za/
// their-slug on newsletters and QR codes, which lands correctly branded. This
// is the fallback for anyone who arrives at the front door instead, and it
// exists so they aren't stuck looking at a generic page with seven sports,
// none of which are theirs.
//
// Renders nothing when there's only one school — a picker with one option is
// just an extra tap.

type School = {
  name: string; short_name: string; abbreviation: string;
  slug: string; primary_color: string; logo_url: string | null;
};

export default function SchoolPicker({ prominent = false }: { prominent?: boolean } = {}) {
  const [schools, setSchools] = React.useState<School[]>([]);
  const [q, setQ] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let stop = false;
    fetch('/api/school/list')
      .then(r => r.json())
      .then(d => { if (!stop) { setSchools(d.schools || []); setLoading(false); } })
      .catch(() => { if (!stop) setLoading(false); });
    return () => { stop = true; };
  }, []);

  // `prominent` is set on the bare landing page, where this is the primary
  // way in rather than a fallback. There, it renders even for a single school:
  // one clear door beats a carousel of sports that lead to a code prompt with
  // no indication of whose code is wanted.
  if (loading) return null;
  if (!prominent && schools.length <= 1) return null;
  if (schools.length === 0) return null;

  const filtered = q.trim()
    ? schools.filter(s =>
        (s.name + ' ' + s.short_name + ' ' + s.abbreviation)
          .toLowerCase().includes(q.trim().toLowerCase()))
    : schools;

  return (
    <div className="mx-auto w-full max-w-md px-6 py-10">
      <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/30">
        {prominent ? 'Select your school' : 'Find your school'}
      </p>

      {/* Search only appears once the list is long enough to need it */}
      {schools.length > 6 && (
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search"
          className="mb-3 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />
      )}

      <div className="space-y-2">
        {filtered.map(s => (
          <Link
            key={s.slug}
            href={`/${s.slug}`}
            className="flex items-center gap-3 rounded-2xl border border-white/7 bg-white/[0.02] px-4 py-3 transition hover:border-white/18"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg text-[11px] font-black"
              style={{
                background: (s.primary_color || '#38bdf8') + '1e',
                border: `1px solid ${(s.primary_color || '#38bdf8')}44`,
                color: s.primary_color || '#38bdf8',
              }}
            >
              {s.logo_url
                ? <Image src={s.logo_url} alt="" width={36} height={36} className="h-full w-full object-contain p-1" />
                : s.abbreviation}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-white/90">
              {s.name}
            </span>
            <span className="shrink-0 text-[12px] text-white/25">→</span>
          </Link>
        ))}

        {filtered.length === 0 && (
          <p className="py-6 text-center text-[12px] text-white/30">
            No school matches that.
          </p>
        )}
      </div>
    </div>
  );
}
