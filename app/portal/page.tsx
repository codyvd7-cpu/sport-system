'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { type SportKey, getSportColor } from '@/lib/sports';
import PortalAuthGuard from '@/components/PortalAuthGuard';
import PortalAmbient     from '@/components/portal/PortalAmbient';
import ScrollReveal      from '@/components/portal/ScrollReveal';
import PortalNav         from '@/components/portal/PortalNav';
import PortalHero        from '@/components/portal/PortalHero';
import ThisWeekBoard     from '@/components/portal/ThisWeekBoard';
import FixtureList       from '@/components/portal/FixtureList';
import PlayerResources   from '@/components/portal/PlayerResources';
import NoticeCard        from '@/components/portal/NoticeCard';
import RecognitionPanel  from '@/components/portal/RecognitionPanel';
import SponsorStrip      from '@/components/portal/SponsorStrip';
import { useBranding } from '@/components/BrandingProvider';

type Row = Record<string, any>;

function PortalInner() {
  const { branding } = useBranding();
  const searchParams = useSearchParams();
  const sport = ((searchParams.get('sport') ||
    (typeof document !== 'undefined'
      ? document.cookie.split(';').find(c => c.trim().startsWith('portal_sport='))?.split('=')[1]
      : undefined) || 'hockey') as SportKey);

  const color = getSportColor(sport);

  const [data, setData] = React.useState<{
    weekItems: Row[]; reminders: Row[];
    fixtures: Row[]; results: Row[]; programs: Row[]; spotlight: Row[];
  } | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      // Fetched server-side (not queried directly from the browser) so the
      // school scoping on the signed portal cookie is actually enforced —
      // portal_* tables are publicly readable, so a browser query would
      // return every school's fixtures once more than one school exists.
      try {
        const res = await fetch(`/api/portal/data?sport=${encodeURIComponent(sport)}`);
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Failed to load');
        setData({
          weekItems: d.weekPlanItems || [],
          reminders: d.reminders || [],
          fixtures:  d.fixtures || [],
          results:   d.results || [],
          programs:  (d.programs || []).slice(0, 6),
          spotlight: d.spotlight || [],
        });
      } catch {
        setData({ weekItems: [], reminders: [], fixtures: [], results: [], programs: [], spotlight: [] });
      }
      setLoading(false);
    }
    load();
  }, [sport]);

  const nextFixture = React.useMemo(() => data?.fixtures[0] ?? null, [data]);
  const upcoming    = React.useMemo(() => data?.fixtures.slice(1, 5) ?? [], [data]);

  return (
    <>
      <PortalAuthGuard sport={sport}>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 1400px 900px at 50% -8%, #0d1628 0%, #030810 55%)', color: 'white', position:'relative' }}>
        {/* Subtle grid texture */}
        <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize:'56px 56px', pointerEvents:'none', zIndex:0 }}/>
        <PortalAmbient color={color}/>
        <PortalNav sport={sport}/>

        {/* Department notice — dismissible, reappears when a new notice is published */}
        <NoticeCard reminders={data?.reminders ?? []} color={color} sport={sport}/>

        {/* Hero */}
        <PortalHero sport={sport} nextFixture={nextFixture}/>

        {/* This Week */}
        <ScrollReveal>
          <ThisWeekBoard
            weekItems={data?.weekItems ?? []}
            fixtures={data?.fixtures ?? []}
            color={color}
            sport={sport}
            loading={loading}
          />
        </ScrollReveal>

        {/* Fixtures + Results */}
        <ScrollReveal delay={0.05}>
          <FixtureList
            sport={sport} color={color}
            fixtures={upcoming}
            results={data?.results ?? []}
            loading={loading}
          />
        </ScrollReveal>

        {/* Player Resources */}
        <ScrollReveal>
          <PlayerResources programs={data?.programs ?? []} color={color} loading={loading}/>
        </ScrollReveal>

        {/* Recognition */}
        <ScrollReveal>
          <RecognitionPanel spotlight={data?.spotlight ?? []} color={color} loading={loading}/>
        </ScrollReveal>

        {/* Sponsors */}
        <ScrollReveal>
          <SponsorStrip color={color}/>
        </ScrollReveal>

        {/* Footer */}
        <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            Powered by <span style={{ color, fontWeight: 700 }}>Altus Performance</span> · {branding.name}
          </p>
        </footer>
      </div>
    </PortalAuthGuard>
    </>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight:'100vh', background:'#030810', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:24, height:24, borderRadius:'50%', border:'3px solid #38bdf8', borderTopColor:'transparent', animation:'spin .8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    }>
      <PortalInner/>
    </Suspense>
  );
}
