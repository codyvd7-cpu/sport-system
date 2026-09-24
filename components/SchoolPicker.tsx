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
    <div className="relative z-10 mx-auto mt-7 w-full max-w-md px-6">
      <p className="mb-3.5 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
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

      <div className="space-y-2.5">
        {filtered.map(s => {
          const accent = s.primary_color || '#38bdf8';
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border px-4 py-4 transition"
              style={{
                // The school's own colour carries the row, rather than every
                // school looking identical in generic white-on-grey. A soft
                // wash on the left anchors the crest without shouting.
                borderColor: accent + '2e',
                background: `linear-gradient(100deg, ${accent}14 0%, rgba(255,255,255,0.02) 55%)`,
              }}
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl text-[12px] font-black"
                style={{
                  background: accent + '1a',
                  border: `1px solid ${accent}3d`,
                  color: accent,
                }}
              >
                {s.logo_url
                  ? <Image src={s.logo_url} alt="" width={48} height={48} className="h-full w-full object-contain p-1" />
                  : s.abbreviation}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold leading-tight text-white">
                  {s.name}
                </span>
                <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-white/35">
                  Fixtures, results and team information
                </span>
              </span>

              <span
                className="shrink-0 text-[15px] transition group-hover:translate-x-0.5"
                style={{ color: accent }}
              >
                →
              </span>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <p className="py-6 text-center text-[12px] text-white/30">
            No school matches that.
          </p>
        )}
      </div>
    </div>
  );
}
