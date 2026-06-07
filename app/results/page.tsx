'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRole } from '@/lib/useRole';
import { usePortalResults } from '@/lib/queries';
import { fDateShort } from '@/lib/dates';
import { FadeUp, StaggerList, StaggerItem } from '@/components/Motion';

type Result = {
  id: string; team: string; opponent: string;
  result_date: string; final_score: string;
  goal_scorers: string; is_published: boolean;
};

const TEAM_GROUPS = [
  { group:'Senior', accent:'#a78bfa', teams:['1sts','2nds','3rds','4ths','5ths'] },
  { group:'U16',    accent:'#38bdf8', teams:['U16A','U16B','U16C','U16D','U16E'] },
  { group:'U15',    accent:'#10b981', teams:['U15A','U15B','U15C','U15D','U15E'] },
  { group:'U14',    accent:'#f59e0b', teams:['U14A','U14B','U14C','U14D','U14E'] },
];
const ALL_TEAMS = TEAM_GROUPS.flatMap(g => g.teams);
function getAccent(t: string) { return TEAM_GROUPS.find(g => g.teams.includes(t))?.accent || '#94a3b8'; }
function parseScore(s: string) {
  const parts = s.split(/[-–]/);
  if (parts.length !== 2) return null;
  const a = parseInt(parts[0]), b = parseInt(parts[1]);
  if (isNaN(a) || isNaN(b)) return null;
  return { for: a, against: b, win: a > b, draw: a === b, loss: a < b };
}

export default function MatchHistoryPage() {
  const { teams: myTeams, canSeeAllTeams, sport } = useRole();
  
  const SPORT_COLORS: Record<string,string> = {hockey:'#38bdf8',rugby:'#f87171',cricket:'#fbbf24',rowing:'#34d399',swimming:'#818cf8',waterpolo:'#06b6d4'};
  const sportColor = SPORT_COLORS[(sport||'hockey') as string] || '#38bdf8';
  const sportLabel = sport ? sport.charAt(0).toUpperCase() + sport.slice(1) : 'Sport';
  const SCORE_TERMS: Record<string,{scorers:string;score:string}> = {
    hockey:{scorers:'Goal Scorers',score:'Goals'}, rugby:{scorers:'Try Scorers',score:'Tries'},
    cricket:{scorers:'Top Scorers',score:'Runs'}, rowing:{scorers:'Crew',score:'Time'},
    swimming:{scorers:'Swimmers',score:'Time'}, waterpolo:{scorers:'Goal Scorers',score:'Goals'},
  };
  const scoreTerm = SCORE_TERMS[sport||'hockey'] || SCORE_TERMS.hockey;
  const [teamFilter, setTeamFilter] = React.useState('All');

  // React Query — auto-caches, refetches on focus, no manual useEffect
  const { data: results = [], isLoading: loading } = usePortalResults(undefined, sport || 'hockey');

  const visibleTeams = canSeeAllTeams ? ALL_TEAMS : myTeams;
  const filtered = results.filter((r: Result) =>
    visibleTeams.includes(r.team) &&
    (teamFilter === 'All' || r.team === teamFilter)
  );

  // Stats
  const stats = React.useMemo(() => {
    const base = { played: 0, won: 0, drew: 0, lost: 0, gf: 0, ga: 0 };
    filtered.forEach(r => {
      const s = parseScore(r.final_score);
      if (!s) return;
      base.played++;
      base.gf += s.for; base.ga += s.against;
      if (s.win) base.won++;
      else if (s.draw) base.drew++;
      else base.lost++;
    });
    return base;
  }, [filtered]);

  return (
    <main className="min-h-screen pb-24 text-white md:pb-8 overflow-x-hidden" style={{background:'var(--bg)'}}>
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 left-1/3 h-64 w-64 rounded-full blur-[80px]" style={{background:'rgba(56,189,248,0.05)'}}/>
        <div className="absolute top-32 right-0 h-48 w-48 rounded-full blur-[60px]" style={{background:'rgba(167,139,250,0.04)'}}/>
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-6 sm:px-6 space-y-5">

        {/* Header */}
        <FadeUp delay={0}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{color:sportColor}}>
            {sportLabel}
          </p>
          <h1 className="text-4xl font-black tracking-tight leading-none">
            Match<br/>
            <span style={{background:`linear-gradient(135deg,${sportColor},#a78bfa)`,WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text'}}>
              History
            </span>
          </h1>
        </FadeUp>

        {/* Season stats */}
        {!loading && filtered.length > 0 && (
          <FadeUp delay={60}>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                { label:'Played', val:stats.played,  color:'white' },
                { label:'Won',    val:stats.won,     color:'#10b981' },
                { label:'Drew',   val:stats.drew,    color:'#fbbf24' },
                { label:'Lost',   val:stats.lost,    color:'#f87171' },
                { label:'GF',     val:stats.gf,      color:sportColor },
                { label:'GA',     val:stats.ga,      color:'rgba(255,255,255,0.3)' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border p-3 text-center"
                  style={{background:'rgba(255,255,255,0.02)',borderColor:'rgba(255,255,255,0.06)'}}>
                  <p className="text-2xl font-black leading-none" style={{color:s.color}}>{s.val}</p>
                  <p className="text-[9px] font-bold uppercase tracking-[0.15em] mt-1" style={{color:'rgba(255,255,255,0.25)'}}>{s.label}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        )}

        {/* Team filter */}
        <FadeUp delay={100}>
          <div className="flex flex-wrap gap-1.5">
            <button onClick={() => setTeamFilter('All')}
              className="rounded-xl border px-3 py-1.5 text-[11px] font-semibold transition"
              style={{
                borderColor: teamFilter === 'All' ? `${sportColor}4d` : 'rgba(255,255,255,0.07)',
                background:  teamFilter === 'All' ? 'rgba(56,189,248,0.08)' : 'rgba(255,255,255,0.02)',
                color:       teamFilter === 'All' ? sportColor : 'rgba(255,255,255,0.4)',
              }}>
              All Teams
            </button>
            {TEAM_GROUPS.map(g => (
              <React.Fragment key={g.group}>
                {g.teams.filter(t => visibleTeams.includes(t)).map(t => (
                  <button key={t} onClick={() => setTeamFilter(t)}
                    className="rounded-xl border px-3 py-1.5 text-[11px] font-bold transition"
                    style={{
                      borderColor: teamFilter === t ? `${g.accent}40` : 'rgba(255,255,255,0.06)',
                      background:  teamFilter === t ? `${g.accent}10` : 'rgba(255,255,255,0.02)',
                      color:       teamFilter === t ? g.accent : 'rgba(255,255,255,0.35)',
                    }}>
                    {t}
                  </button>
                ))}
              </React.Fragment>
            ))}
          </div>
        </FadeUp>

        {/* Results Table */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"/>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{background:'rgba(255,255,255,0.01)',border:'1px solid rgba(255,255,255,0.05)'}} className="rounded-2xl py-16 text-center">
            <p className="text-3xl mb-3">🏑</p>
            <p className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>No results yet.</p>
            <p className="text-[11px] mt-1" style={{color:'rgba(255,255,255,0.2)'}}>Log results from the team page or portal admin.</p>
          </div>
        ) : (
          <div style={{border:'1px solid rgba(255,255,255,0.07)'}} className="rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_1fr] gap-0 px-4 py-2.5 border-b"
              style={{background:'rgba(255,255,255,0.03)',borderColor:'rgba(255,255,255,0.06)'}}>
              {['Result','Opponent','Team','Score','Scorers'].map(h => (
                <p key={h} className="text-[9px] font-black uppercase tracking-[0.2em]"
                  style={{color:'rgba(255,255,255,0.25)'}}>{h}</p>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-white/5">
              {filtered.map((r, i) => {
                const accent      = getAccent(r.team);
                const score       = parseScore(r.final_score);
                const resultColor = !score ? '#94a3b8' : score.win ? '#10b981' : score.draw ? '#fbbf24' : '#f87171';
                const resultLabel = !score ? '—' : score.win ? 'W' : score.draw ? 'D' : 'L';
                const scorers     = r.goal_scorers?.split(',').map((s:string) => s.trim()).filter(Boolean) || [];

                return (
                  <div key={r.id}
                    className="grid grid-cols-[auto_1fr_auto_auto_1fr] items-center gap-3 px-4 py-3 transition hover:bg-white/2"
                    style={{borderLeft:`3px solid ${resultColor}`}}>

                    {/* Result */}
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg text-[11px] font-black"
                      style={{background:`${resultColor}15`,color:resultColor}}>
                      {resultLabel}
                    </div>

                    {/* Opponent + date */}
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-white truncate">vs {r.opponent}</p>
                      <p className="text-[10px]" style={{color:'rgba(255,255,255,0.25)'}}>{fDateShort(r.result_date)}</p>
                    </div>

                    {/* Team */}
                    <span className="rounded-full px-2 py-0.5 text-[9px] font-black whitespace-nowrap"
                      style={{background:`${accent}12`,color:accent,border:`1px solid ${accent}25`}}>
                      {r.team}
                    </span>

                    {/* Score */}
                    <p className="text-[15px] font-black tabular-nums whitespace-nowrap"
                      style={{color:resultColor}}>
                      {r.final_score}
                    </p>

                    {/* Scorers */}
                    <p className="text-[10px] truncate" style={{color:'rgba(255,255,255,0.35)'}}>
                      {scorers.length > 0 ? `${sport==='rugby'?'🏉':sport==='cricket'?'🏏':'⚽'} ${scorers.join(', ')}` : '—'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t" style={{borderColor:'rgba(255,255,255,0.05)',background:'rgba(255,255,255,0.02)'}}>
              <p className="text-[10px]" style={{color:'rgba(255,255,255,0.2)'}}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}