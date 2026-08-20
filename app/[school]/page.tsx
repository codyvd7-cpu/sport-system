import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getSchoolBrandingBySlug } from '@/lib/schoolBranding';
import { getSchoolSports } from '@/lib/schoolSports';

// ─── /[school] ────────────────────────────────────────────────────────────────
// A school's own front door — e.g. app.altusperformance.co.za/ridgemont
//
// This solves a real gap: a parent or player arriving cold saw generic "Altus
// Performance" branding and every sport in the system, because nothing told
// the app which school they belonged to until after they logged in.
//
// Deliberately SERVER-rendered. The client-side BrandingProvider would work,
// but a parent would watch the page load as Altus and then flick to their
// school — which looks broken and cheap on the very first impression. Here the
// school's name, colour and sports are correct in the first byte sent.
//
// This is also the URL a school prints on newsletters and QR codes, so it has
// to work before anyone has an account, and has to look like theirs.

export const revalidate = 300; // school branding changes rarely

// Static routes take priority over this dynamic segment in Next.js, so real
// pages are never shadowed. But a typo like /dashbord would still land here and
// hit the database, and any route added later would silently do the same. This
// list makes that impossible: reserved paths 404 immediately, without a query.
const RESERVED = new Set([
  'api', 'login', 'logout', 'dashboard', 'athletes', 'attendance', 'teams',
  'squad', 'performance', 'retest', 'claims', 'coaches', 'notifications',
  'lightning', 'video', 'ai-tools', 'assistant', 'portal', 'portal-login',
  'portal-admin', 'hp', 'hp-login', 'hp-print', 'platform', 'player',
  'privacy', 'terms', 'results', 'export', 'auth', 'set-password',
  'monitoring', 'favicon.ico', 'manifest.json', 'robots.txt', 'sitemap.xml',
  '_next', 'static', 'images', 'icons', 'sports', 'schools',
]);

type Props = { params: Promise<{ school: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { school } = await params;
  if (RESERVED.has(school.toLowerCase())) return { title: 'Not found' };
  const branding = await getSchoolBrandingBySlug(school);
  if (!branding) return { title: 'Not found' };
  return {
    title: `${branding.name} — Sport`,
    description: `Fixtures, results and team information for ${branding.name}.`,
  };
}

export default async function SchoolLandingPage({ params }: Props) {
  const { school } = await params;
  if (RESERVED.has(school.toLowerCase())) notFound();

  const branding = await getSchoolBrandingBySlug(school);

  // An unknown or inactive slug is a genuine 404 — better than showing a
  // stranger a half-branded page.
  if (!branding) notFound();

  const sports = await getSchoolSports(branding.id);
  const primary = branding.primaryColor;
  const accent = branding.accentColor;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      {/* Colour wash drawn from the school's own palette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 900px 520px at 12% -5%, ${primary}22, transparent 62%),
                       radial-gradient(ellipse 720px 420px at 92% 8%, ${accent}18, transparent 60%)`,
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-6 py-12 sm:py-16">
        {/* Crest and name */}
        <header className="flex flex-col items-center text-center">
          <div
            className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl sm:h-28 sm:w-28"
            style={{ background: `${primary}14`, border: `1px solid ${primary}33` }}
          >
            <Image
              src={branding.logoUrl}
              alt={branding.name}
              width={112}
              height={112}
              className="h-full w-full object-contain p-2"
              priority
            />
          </div>

          <h1 className="mt-6 text-[clamp(28px,6vw,44px)] font-black leading-[1.05] tracking-tight">
            {branding.name}
          </h1>
          <p
            className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em]"
            style={{ color: primary }}
          >
            Sport Department
          </p>
        </header>

        {/* Sports — only the ones this school actually runs */}
        <section className="mt-12 sm:mt-16">
          <p className="mb-4 text-center text-[10px] font-bold uppercase tracking-[0.28em] text-white/30">
            Choose your sport
          </p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {sports.map(sport => (
              <Link
                key={sport.key}
                href={`/portal-login?sport=${encodeURIComponent(sport.key)}&school=${branding.slug}`}
                className="group relative flex flex-col items-center justify-center rounded-2xl border px-4 py-7 transition"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.07)',
                }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[2px] rounded-b-2xl opacity-70"
                  style={{ background: sport.color }}
                />
                <span className="text-2xl">{sport.icon}</span>
                <span className="mt-2.5 text-center text-[12.5px] font-bold tracking-wide text-white/85">
                  {sport.label.toUpperCase()}
                </span>
                <span className="mt-0.5 text-[10px] text-white/30">
                  Fixtures · Results
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Everything else a person arriving here might actually want */}
        <section className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href={`/player/auth?school=${branding.slug}`}
            className="rounded-2xl border border-white/7 bg-white/[0.02] px-5 py-4 transition hover:border-white/15"
          >
            <p className="text-[13px] font-bold text-white">Players</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
              Your profile, training and results
            </p>
          </Link>

          <Link
            href="/hp-login"
            className="rounded-2xl border border-white/7 bg-white/[0.02] px-5 py-4 transition hover:border-white/15"
          >
            <p className="text-[13px] font-bold text-white">High Performance</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
              Testing and athlete development
            </p>
          </Link>

          <Link
            href="/login"
            className="rounded-2xl border border-white/7 bg-white/[0.02] px-5 py-4 transition hover:border-white/15"
          >
            <p className="text-[13px] font-bold text-white">Staff</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
              Coach and department sign in
            </p>
          </Link>
        </section>

        <footer className="mt-auto pt-14 text-center">
          <p className="text-[10.5px] text-white/25">
            Powered by <span style={{ color: primary }}>Altus Performance</span>
          </p>
        </footer>
      </div>
    </main>
  );
}
