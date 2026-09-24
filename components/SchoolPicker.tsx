'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// ─── SchoolPicker ──────────────────────────────────────────────────────────────
// Shown on the bare landing page to someone with no school context — they've
// typed the domain directly rather than following their school's own link.
//
// Design intent: a parent standing outside a school gate on their phone. The
// crest is what they recognise, so the crest is the biggest thing here and
// each card is owned by that school's own colour. Everything else stays
// quiet.
//
// Deliberately NOT a swipe carousel: with two or three schools a carousel
// hides options behind a gesture and is awkward one-handed. These stack on
// mobile and sit side by side on wider screens, so every school is visible
// at once at any size.

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

  if (loading) return null;
  if (!prominent && schools.length <= 1) return null;
  if (schools.length === 0) return null;

  const filtered = q.trim()
    ? schools.filter(s =>
        (s.name + ' ' + s.short_name + ' ' + s.abbreviation)
          .toLowerCase().includes(q.trim().toLowerCase()))
    : schools;

  return (
    <div className="mx-auto w-full max-w-2xl px-5">
      <p className="mb-4 text-center text-[13px] text-white/40">
        Choose your school to see fixtures, results and the week ahead.
      </p>

      {schools.length > 6 && (
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search schools"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-white outline-none placeholder:text-white/25 focus:border-white/25"
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map(s => {
          const accent = s.primary_color || '#38bdf8';
          return (
            <Link
              key={s.slug}
              href={`/${s.slug}`}
              className="group relative flex flex-col items-center overflow-hidden rounded-3xl border px-6 py-8 text-center transition-transform duration-200 active:scale-[0.98]"
              style={{
                borderColor: accent + '33',
                background: `radial-gradient(120% 90% at 50% 0%, ${accent}1f 0%, rgba(255,255,255,0.02) 70%)`,
              }}
            >
              {/* The crest is the thing a parent actually recognises, so it
                  gets the space rather than being a 36px thumbnail. */}
              <span className="mb-4 flex h-20 w-20 items-center justify-center">
                {s.logo_url
                  ? <Image src={s.logo_url} alt="" width={80} height={80}
                      className="h-full w-full object-contain" />
                  : <span className="text-[22px] font-black" style={{ color: accent }}>{s.abbreviation}</span>}
              </span>

              <span className="text-[17px] font-bold leading-tight text-white">
                {s.name}
              </span>

              <span
                className="mt-3 rounded-full px-4 py-1.5 text-[11.5px] font-semibold"
                style={{ background: accent + '1f', color: accent }}
              >
                View sport
              </span>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-[13px] text-white/30">
          No school matches that name.
        </p>
      )}
    </div>
  );
}
