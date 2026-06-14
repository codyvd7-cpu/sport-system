'use client';
import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Row = Record<string, any>;

const SPORT_CFG: Record<string, { color: string; bg: string; photo: string }> = {
  hockey:    { color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  photo: '/sbc-hockey-1.jpg' },
  rugby:     { color: '#f87171', bg: 'rgba(248,113,113,0.08)', photo: '/sbc-rugby-1.jpg'  },
  cricket:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  photo: '/sbc-rugby-2.jpg'  },
  swimming:  { color: '#818cf8', bg: 'rgba(129,140,248,0.08)', photo: '/sbc-photo-1.jpg'  },
  rowing:    { color: '#34d399', bg: 'rgba(52,211,153,0.08)',  photo: '/sbc-photo-1.jpg'  },
  athletics: { color: '#fb923c', bg: 'rgba(251,146,60,0.08)',  photo: '/sbc-photo-1.jpg'  },
};
const BG = '#040810';
const BORDER = 'rgba(255,255,255,0.07)';

function outcomeOf(score: string) {
  const p = score?.split(/[-–]/);
  if (!p || p.length !== 2) return null;
  const a = parseInt(p[0]), b = parseInt(p[1]);
  return a > b ? 'WIN' : a < b ? 'LOSS' : 'DRAW';
}
function outcomeColor(o: string | null) {
  if (o === 'WIN')  return '#22c55e';
  if (o === 'LOSS') return '#f87171';
  if (o === 'DRAW') return '#fbbf24';
  return 'rgba(255,255,255,0.4)';
}

// ── SportCard is OUTSIDE the page component to prevent re-mount on state change ──
function SportCard({ sport, data, loading }: {
  sport: string;
  data: { fixtures: Row[]; results: Row[]; weekItems: Row[]; attendance: number | null; team: string | null } | null;
  loading: boolean;
}) {
  const cfg = SPORT_CFG[sport] || SPORT_CFG.hockey;
  const C = cfg.color;
  const [tab, setTab] = React.useState<'fixtures' | 'results' | 'week'>('fixtures');

  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.025)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>

      {/* Photo header */}
      <div style={{ position: 'relative', height: 100, overflow: 'hidden' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={cfg.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'brightness(0.22) saturate(0.5)' }} />
        <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg,${C}28,rgba(4,8,16,0.85))` }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${C},transparent)` }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: `${C}bb`, textTransform: 'uppercase', marginBottom: 2 }}>{sport} department</p>
            <p style={{ fontSize: 20, fontWeight: 900, color: 'white', textTransform: 'capitalize' }}>{sport}</p>
          </div>
          {data?.team && (
            <span style={{ fontSize: 11, fontWeight: 700, color: C, background: 'rgba(0,0,0,0.4)', padding: '3px 10px', borderRadius: 8, border: `1px solid ${C}30` }}>{data.team}</span>
          )}
        </div>
      </div>

      {/* Attendance bar */}
      {data?.attendance != null && (
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${data.attendance}%`, background: `linear-gradient(90deg,${C}80,${C})`, borderRadius: 2 }} />
          </div>
          <p style={{ fontSize: 12, fontWeight: 700, color: C, whiteSpace: 'nowrap' }}>{data.attendance}% attendance</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', background: 'rgba(0,0,0,0.25)', borderBottom: `1px solid ${BORDER}` }}>
        {(['fixtures', 'results', 'week'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 8px', border: 'none', cursor: 'pointer',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
            background: 'transparent', transition: 'all 0.15s',
            color: tab === t ? C : 'rgba(255,255,255,0.3)',
            borderBottom: `2px solid ${tab === t ? C : 'transparent'}`,
          }}>
            {t === 'week' ? 'This Week' : t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px', minHeight: 100 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : !data ? (
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>No data available yet.</p>
        ) : (
          <>
            {/* Fixtures */}
            {tab === 'fixtures' && (
              data.fixtures.length === 0
                ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', padding: '8px 0' }}>No upcoming fixtures published yet.</p>
                : data.fixtures.map((f, i) => (
                  <Link key={f.id} href={`/portal/fixtures?date=${f.fixture_date}&sport=${sport}`}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < data.fixtures.length - 1 ? `1px solid ${BORDER}` : 'none', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ minWidth: 38, textAlign: 'center' }}>
                      <p style={{ fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1 }}>{new Date(f.fixture_date).getDate()}</p>
                      <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{new Date(f.fixture_date).toLocaleDateString('en-ZA', { month: 'short' })}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>vs {f.opponent}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{f.team} · {f.fixture_time || 'TBC'} · {f.home_away || ''}</p>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: `${C}18`, color: C, border: `1px solid ${C}25` }}>UPCOMING</span>
                  </Link>
                ))
            )}

            {/* Results */}
            {tab === 'results' && (
              data.results.length === 0
                ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', padding: '8px 0' }}>No results published yet.</p>
                : data.results.map((r, i) => {
                  const outcome = outcomeOf(r.final_score || '');
                  const oc = outcomeColor(outcome);
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0', borderBottom: i < data.results.length - 1 ? `1px solid ${BORDER}` : 'none' }}>
                      <div style={{ minWidth: 38, textAlign: 'center' }}>
                        <p style={{ fontSize: 19, fontWeight: 900, color: 'white', lineHeight: 1 }}>{new Date(r.result_date).getDate()}</p>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>{new Date(r.result_date).toLocaleDateString('en-ZA', { month: 'short' })}</p>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>vs {r.opponent}</p>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.team}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 22, fontWeight: 900, color: oc, lineHeight: 1, marginBottom: 3 }}>{r.final_score || '—'}</p>
                        {outcome && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${oc}18`, color: oc, border: `1px solid ${oc}25` }}>{outcome}</span>}
                      </div>
                    </div>
                  );
                })
            )}

            {/* This week */}
            {tab === 'week' && (
              data.weekItems.length === 0
                ? <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', padding: '8px 0' }}>No week plan published yet.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {data.weekItems.map((item, i) => {
                    const isMDay = (item.title || '').toLowerCase().includes('match') || (item.title || '').toLowerCase().includes('vs');
                    return (
                      <div key={item.id || i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 2, borderRadius: 1, background: `linear-gradient(to bottom,${isMDay ? '#fbbf24' : C},transparent)`, flexShrink: 0, alignSelf: 'stretch', minHeight: 18, marginTop: 3 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: isMDay ? '#fbbf24' : 'white' }}>
                            {item.day_label && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{item.day_label}: </span>}
                            {item.title}
                          </p>
                          {item.details && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{(item.details as string).split('\n').slice(0, 2).join(' · ')}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page component ────────────────────────────────────────────────────────
export default function PlayerProfilePage() {
  const router = useRouter();
  const [profile, setProfile]     = React.useState<Row | null>(null);
  const [loading, setLoading]     = React.useState(true);
  const [sportData, setSportData] = React.useState<Record<string, any>>({});
  const [sportsLoading, setSportsLoading] = React.useState(false);

  // 1. Auth + profile load
  React.useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/player/auth'); return; }

      const { data: prof, error } = await supabase
        .from('player_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) { console.error('Profile error:', error); }
      if (!prof) { router.replace('/player/setup'); return; }
      setProfile(prof);
      setLoading(false);
    });
  }, [router]);

  // 2. Sport data load — runs after profile is set
  React.useEffect(() => {
    if (!profile) return;
    const sports: string[] = (profile.sports || []).map((s: string) => s.toLowerCase());
    if (sports.length === 0) { setSportsLoading(false); return; }
    setSportsLoading(true);
    const today = new Date().toISOString().split('T')[0];

    Promise.all(sports.map(async (sport) => {
      const [fxRes, resRes, planRes] = await Promise.all([
        supabase.from('portal_fixtures').select('*').eq('sport', sport).eq('is_published', true).gte('fixture_date', today).order('fixture_date').limit(3),
        supabase.from('portal_results').select('*').eq('sport', sport).eq('is_published', true).order('result_date', { ascending: false }).limit(3),
        supabase.from('portal_week_plans').select('id').eq('sport', sport).eq('published', true).order('created_at', { ascending: false }).limit(1),
      ]);

      let weekItems: Row[] = [];
      if (planRes.data && planRes.data.length > 0) {
        const { data: items } = await supabase.from('portal_week_plan_items').select('*').eq('week_plan_id', planRes.data[0].id).order('sort_order');
        weekItems = items || [];
      }

      // Personal stats (only if athlete linked)
      let attendance: number | null = null;
      let team: string | null = null;
      if (profile.athlete_id) {
        const { data: ath } = await supabase.from('athletes').select('full_name,team').eq('id', profile.athlete_id).maybeSingle();
        if (ath) team = ath.team;
        const { data: att } = await supabase.from('attendance').select('status').eq('athlete_id', profile.athlete_id);
        if (att && att.length > 0) {
          const present = att.filter((a: Row) => ['present', 'late'].includes((a.status || '').toLowerCase())).length;
          attendance = Math.round((present / att.length) * 100);
        }
      }

      return { sport, fixtures: fxRes.data || [], results: resRes.data || [], weekItems, attendance, team };
    })).then(all => {
      const map: Record<string, any> = {};
      all.forEach(r => { map[r.sport] = r; });
      setSportData(map);
      setSportsLoading(false);
    }).catch(err => {
      console.error('Sport data error:', err);
      setSportsLoading(false);
    });
  }, [profile]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/portal?sport=hockey');
  }

  if (loading) return (
    <main style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #38bdf8', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  );
  if (!profile) return null;

  const initials = (profile.full_name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const sports = (profile.sports || []).map((s: string) => s.toLowerCase());

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{font-family:'Inter',system-ui,sans-serif;box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;height:3px;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px;}
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      <main style={{ minHeight: '100vh', background: BG, color: 'white' }}>

        {/* NAV */}
        <nav style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(4,8,16,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
          <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Image src="/st-benedicts-logo.png" alt="SBC" width={30} height={30} style={{ objectFit: 'contain' }} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 800, color: 'white', lineHeight: 1 }}>ST BENEDICT&apos;S COLLEGE</p>
                <p style={{ fontSize: 9, fontWeight: 700, color: '#38bdf8', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>Player Profile</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Link href="/portal?sport=hockey" style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', padding: '6px 10px' }}>Portal</Link>
              <button onClick={handleSignOut} style={{ fontSize: 12, fontWeight: 700, color: 'white', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 80px' }}>

          {/* HERO */}
          <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '22px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 66, height: 66, borderRadius: '50%', background: 'linear-gradient(135deg,#1d4ed8,#38bdf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: '0 8px 24px rgba(56,189,248,0.25)' }}>
                {initials}
              </div>
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white', marginBottom: 3, letterSpacing: '-0.02em', lineHeight: 1 }}>{profile.full_name}</h1>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>{profile.grade}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {sports.map(s => {
                    const cfg = SPORT_CFG[s] || SPORT_CFG.hockey;
                    return <span key={s} style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}35` }}>{s}</span>;
                  })}
                  <Link href="/player/setup" style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.3)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', textDecoration: 'none' }}>
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* SPORT CARDS */}
          {sports.length === 0 ? (
            <div style={{ borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', padding: '40px', textAlign: 'center' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>No sports added yet</p>
              <Link href="/player/setup" style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', padding: '10px 20px', borderRadius: 10, border: '1px solid #38bdf840', background: '#38bdf810', textDecoration: 'none', display: 'inline-block' }}>
                Add sports to my profile
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sports.map(sport => (
                <SportCard key={sport} sport={sport} data={sportData[sport] || null} loading={sportsLoading && !sportData[sport]} />
              ))}
            </div>
          )}

        </div>
      </main>
    </>
  );
}
