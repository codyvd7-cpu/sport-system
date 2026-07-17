'use client';
import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SPORTS, type SportKey, getSportColor } from '@/lib/sports';
import PortalAuthGuard from '@/components/PortalAuthGuard';
import SafetyBanner from '@/components/SafetyBanner';
import AlertOptIn from '@/components/AlertOptIn';
import PortalAmbient     from '@/components/portal/PortalAmbient';
import ScrollReveal      from '@/components/portal/ScrollReveal';
import PortalNav         from '@/components/portal/PortalNav';
import PortalHero        from '@/components/portal/PortalHero';
import ThisWeekBoard     from '@/components/portal/ThisWeekBoard';
import FixtureList       from '@/components/portal/FixtureList';
import PlayerResources   from '@/components/portal/PlayerResources';
import NoticeCard        from '@/components/portal/NoticeCard';
import PushAlerts        from '@/components/PushAlerts';
import RecognitionPanel  from '@/components/portal/RecognitionPanel';
import SponsorStrip      from '@/components/portal/SponsorStrip';

type Row = Record<string, any>;

async function safeQuery<T>(q: PromiseLike<{ data: T | null; error: any }>, fb: T): Promise<T> {
  try {
    const r = await Promise.race([q, new Promise<never>((_, rej) => setTimeout(() => rej(), 7000))]);
    return (r && 'data' in r && r.data && !r.error) ? r.data : fb;
  } catch { return fb; }
}

function PortalInner() {
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
      const today = new Date().toISOString().split('T')[0];
      const [planRows, reminders, fixtures, results, programs, spotlight] = await Promise.all([
        safeQuery<Row[]>(supabase.from('portal_week_plans').select('id').eq('published',true).eq('sport',sport).order('created_at',{ascending:false}).limit(1), []),
        safeQuery<Row[]>(supabase.from('portal_reminders').select('*').eq('is_published',true).eq('sport',sport).order('sort_order'), []),
        safeQuery<Row[]>(supabase.from('portal_fixtures').select('*').eq('is_published',true).eq('sport',sport).order('fixture_date').gte('fixture_date',today).limit(8), []),
        safeQuery<Row[]>(supabase.from('portal_results').select('*').eq('is_published',true).eq('sport',sport).order('result_date',{ascending:false}).limit(5), []),
        safeQuery<Row[]>(supabase.from('portal_programs').select('*').eq('is_published',true).eq('sport',sport).order('sort_order').limit(6), []),
        safeQuery<Row[]>(supabase.from('portal_spotlight').select('*').eq('is_published',true).eq('sport',sport).order('sort_order'), []),
      ]);
      const planId = planRows[0]?.id ?? null;
      const weekItems = planId
        ? await safeQuery<Row[]>(supabase.from('portal_week_plan_items').select('*').eq('week_plan_id',planId).order('sort_order'), [])
        : [];
      setData({ weekItems, reminders, fixtures, results, programs: programs.slice(0,6), spotlight });
      setLoading(false);
    }
    load();
  }, [sport]);

  const nextFixture = React.useMemo(() => data?.fixtures[0] ?? null, [data]);
  const upcoming    = React.useMemo(() => data?.fixtures.slice(1, 5) ?? [], [data]);

  return (
    <>
      <SafetyBanner/>
      <PortalAuthGuard sport={sport}>
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse 1400px 900px at 50% -8%, #0d1628 0%, #030810 55%)', color: 'white', position:'relative' }}>
        {/* Subtle grid texture */}
        <div style={{ position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)', backgroundSize:'56px 56px', pointerEvents:'none', zIndex:0 }}/>
        <PortalAmbient color={color}/>
        <PortalNav sport={sport}/>

        {/* Department notice — dismissible, reappears when a new notice is published */}
        <NoticeCard reminders={data?.reminders ?? []} color={color} sport={sport}/>

        {/* Push alerts opt-in — lightning & urgent notices */}
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '10px 24px 0', position: 'relative', zIndex: 5, display: 'flex', justifyContent: 'flex-end' }}>
          <PushAlerts color={color} compact/>
        </div>

        {/* Safety alert opt-in — parents enable this once, then get an instant
            push if a lightning alert is activated. Quiet, not pushy. */}
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '10px 24px 0' }}>
          <AlertOptIn C={color}/>
        </div>

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
            Powered by <span style={{ color, fontWeight: 700 }}>Altus Performance</span> · St Benedict's College
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
