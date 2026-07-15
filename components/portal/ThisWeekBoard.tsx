'use client';
import * as React from 'react';
import Link from 'next/link';

type Row = Record<string, any>;

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_MAP: Record<string, number> = {
  monday:0, tuesday:1, wednesday:2, thursday:3, friday:4, saturday:5, sunday:6,
  mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6,
};

interface Props { weekItems: Row[]; fixtures: Row[]; color: string; sport: string; loading: boolean; }

const PULSE_STYLE = `@keyframes todayPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,0.25)}50%{box-shadow:0 0 0 5px rgba(255,255,255,0)}}
@keyframes dayModalIn{from{opacity:0;transform:translateY(14px) scale(0.98)}to{opacity:1;transform:none}}
@keyframes backdropIn{from{opacity:0}to{opacity:1}}`;

function fTime(t?: string) {
  if (!t) return '';
  const [h, m] = t.split(':'); const hr = parseInt(h);
  if (isNaN(hr)) return t;
  return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'pm' : 'am'}`;
}
function localISO(d: Date) { return d.toLocaleDateString('en-CA'); } // YYYY-MM-DD in local time
function fShort(d: Date) { return d.toLocaleDateString('en-ZA', { day:'numeric', month:'short' }); }
function fLong(d: Date)  { return d.toLocaleDateString('en-ZA', { weekday:'long', day:'numeric', month:'long' }); }

export default function ThisWeekBoard({ weekItems, fixtures, color, sport, loading }: Props) {
  const [openDay, setOpenDay] = React.useState<number | null>(null);

  // Monday-start week containing today
  const weekDates = React.useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);
  const todayISO = localISO(new Date());

  const sessionsByDay = React.useMemo(() => {
    const map: Record<number, Row[]> = {};
    weekItems.forEach(item => {
      const idx = DAY_MAP[(item.day_label || '').toLowerCase().trim()] ?? -1;
      if (idx >= 0) { if (!map[idx]) map[idx] = []; map[idx].push(item); }
    });
    return map;
  }, [weekItems]);

  const fixturesByDay = React.useMemo(() => {
    const map: Record<number, Row[]> = {};
    weekDates.forEach((d, i) => {
      const iso = localISO(d);
      const fx = fixtures.filter(f => f.fixture_date === iso);
      if (fx.length) map[i] = fx;
    });
    return map;
  }, [fixtures, weekDates]);

  // Close modal on Escape
  React.useEffect(() => {
    if (openDay === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDay(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openDay]);

  if (loading) return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 56px' }}>
      <div style={{ height: 320, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}/>
    </div>
  );

  const hasAnything = weekItems.length > 0 || Object.keys(fixturesByDay).length > 0;
  if (!hasAnything) return null;

  const openSessions = openDay !== null ? (sessionsByDay[openDay] || []) : [];
  const openFixtures = openDay !== null ? (fixturesByDay[openDay] || []) : [];

  return (
    <section id="this-week" style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <style>{PULSE_STYLE}</style>

      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>This Week</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Weekly Game Plan</p>
        </div>
      </div>

      {/* Timeline grid — 7 day columns on desktop, scroll on mobile */}
      <div style={{
        display:'grid', gridAutoFlow:'column', gridAutoColumns:'minmax(220px, 1fr)',
        gap:14, overflowX:'auto', paddingBottom:8, scrollSnapType:'x mandatory',
      }}>
        {DAYS.map((day, i) => {
          const sessions = sessionsByDay[i] || [];
          const fx = fixturesByDay[i] || [];
          const isToday = localISO(weekDates[i]) === todayISO;
          const hasItems = sessions.length > 0 || fx.length > 0;

          return (
            <div key={day}
              role={hasItems ? 'button' : undefined}
              tabIndex={hasItems ? 0 : undefined}
              onClick={() => hasItems && setOpenDay(i)}
              onKeyDown={e => { if (hasItems && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setOpenDay(i); } }}
              style={{
                scrollSnapAlign:'start',
                borderRadius:18,
                border: isToday ? `1.5px solid ${color}70` : '1px solid rgba(255,255,255,0.08)',
                background: isToday
                  ? `linear-gradient(160deg, ${color}18, rgba(255,255,255,0.02))`
                  : 'rgba(255,255,255,0.02)',
                overflow:'hidden',
                opacity: hasItems ? 1 : 0.45,
                minHeight: 200,
                transition:'transform .25s cubic-bezier(0.16,1,0.3,1), box-shadow .25s ease, border-color .25s ease',
                cursor: hasItems ? 'pointer' : 'default',
                outline:'none',
              }}
              onMouseEnter={e => { if(hasItems){ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.3), 0 0 0 1px ${color}25`; } }}
              onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}>

              {/* Day header — abbrev + actual date */}
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color: isToday ? color : 'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.15em' }}>{day}</p>
                  <p style={{ fontSize:13, fontWeight:800, color:'rgba(255,255,255,0.75)', marginTop:2 }}>{fShort(weekDates[i])}</p>
                </div>
                {isToday ? (
                  <span style={{ fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100, background:color, color:'#030810', textTransform:'uppercase', letterSpacing:'0.1em', animation:'todayPulse 2.4s ease-in-out infinite' }}>
                    Today
                  </span>
                ) : hasItems && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={2} style={{ width:13, height:13 }}><path d="M9 18l6-6-6-6"/></svg>
                )}
              </div>

              {/* Items */}
              <div style={{ padding: hasItems ? '12px 14px' : '24px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {!hasItems ? (
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.18)', textAlign:'center' }}>No sessions</p>
                ) : (
                  <>
                    {fx.map((f, idx) => (
                      <div key={`fx-${idx}`} style={{
                        borderRadius:12, background:`${color}12`, border:`1px solid ${color}35`,
                        padding:'10px 12px',
                      }}>
                        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                          <p style={{ fontSize:13, fontWeight:800, color:'white', lineHeight:1.3 }}>vs {f.opponent}</p>
                          {f.fixture_time && <span style={{ fontSize:11, fontWeight:800, color, flexShrink:0 }}>{fTime(f.fixture_time)}</span>}
                        </div>
                        {f.venue && <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{f.venue}</p>}
                        <span style={{ display:'inline-block', marginTop:6, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:6, background:color, color:'#030810', letterSpacing:'0.06em' }}>
                          MATCH{f.team ? ` · ${f.team}` : ''}
                        </span>
                      </div>
                    ))}
                    {sessions.map((item, idx) => (
                      <div key={`s-${idx}`} style={{
                        borderRadius:12, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
                        padding:'10px 12px',
                      }}>
                        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8, marginBottom:3 }}>
                          <p style={{ fontSize:13, fontWeight:800, color:'white', lineHeight:1.3 }}>{item.title || item.description}</p>
                          {item.session_time && (
                            <span style={{ fontSize:11, fontWeight:800, color, flexShrink:0 }}>{item.session_time.slice(0,5)}</span>
                          )}
                        </div>
                        {item.venue && <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{item.venue}</p>}
                        {item.team && (
                          <span style={{ display:'inline-block', marginTop:6, fontSize:9, fontWeight:800, padding:'2px 8px', borderRadius:6, background:`${color}18`, color, border:`1px solid ${color}30` }}>
                            {item.team}
                          </span>
                        )}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DAY DETAIL MODAL ── */}
      {openDay !== null && (
        <div onClick={() => setOpenDay(null)} style={{
          position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px',
        }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(2,6,14,0.75)', backdropFilter:'blur(6px)', WebkitBackdropFilter:'blur(6px)', animation:'backdropIn .25s ease both' }}/>

          <div onClick={e => e.stopPropagation()} style={{
            position:'relative', width:'100%', maxWidth:520, maxHeight:'82vh', overflowY:'auto',
            borderRadius:22, border:`1px solid ${color}30`,
            background:'linear-gradient(170deg, #0c1424, #060b16)',
            boxShadow:`0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)`,
            animation:'dayModalIn .3s cubic-bezier(0.16,1,0.3,1) both',
          }}>
            {/* Header */}
            <div style={{ padding:'22px 24px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, position:'sticky', top:0, background:'linear-gradient(170deg,#0c1424,#0a1120)', zIndex:1 }}>
              <div>
                <p style={{ fontSize:10, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em', marginBottom:4 }}>
                  {localISO(weekDates[openDay]) === todayISO ? 'Today' : 'Day Plan'}
                </p>
                <p style={{ fontSize:20, fontWeight:900, color:'white', lineHeight:1.1 }}>{fLong(weekDates[openDay])}</p>
              </div>
              <button onClick={() => setOpenDay(null)} aria-label="Close" style={{
                width:30, height:30, borderRadius:9, border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.05)', cursor:'pointer', flexShrink:0,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2.2} style={{ width:13, height:13 }}><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div style={{ padding:'18px 24px 24px', display:'flex', flexDirection:'column', gap:18 }}>

              {/* Matches */}
              {openFixtures.length > 0 && (
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:10 }}>
                    {openFixtures.length === 1 ? 'Match' : 'Matches'}
                  </p>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {openFixtures.map((f, i) => (
                      <div key={i} style={{ borderRadius:14, border:`1px solid ${color}35`, background:`${color}10`, padding:'14px 16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10, marginBottom:8 }}>
                          <p style={{ fontSize:16, fontWeight:900, color:'white' }}>vs {f.opponent}</p>
                          <span style={{ fontSize:14, fontWeight:900, color }}>{fTime(f.fixture_time) || 'TBC'}</span>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                          {[
                            f.team      && { l:'Team',  v:f.team },
                            f.venue     && { l:'Venue', v:f.venue },
                            f.home_away && { l:'H/A',   v:f.home_away.toUpperCase() },
                            f.coach     && { l:'Coach', v:f.coach },
                            f.umpire    && { l:'Umpire',v:f.umpire },
                            f.notes     && { l:'Notes', v:f.notes },
                          ].filter(Boolean).map((row: any) => (
                            <div key={row.l} style={{ display:'flex', gap:10, fontSize:12 }}>
                              <span style={{ color:'rgba(255,255,255,0.3)', fontWeight:800, minWidth:48, textTransform:'uppercase', fontSize:9, letterSpacing:'0.12em', paddingTop:2 }}>{row.l}</span>
                              <span style={{ color:'rgba(255,255,255,0.75)', lineHeight:1.5 }}>{row.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href={`/portal/fixtures?sport=${sport}&date=${localISO(weekDates[openDay])}`} style={{
                    display:'inline-flex', alignItems:'center', gap:6, marginTop:10,
                    fontSize:12, fontWeight:800, color, textDecoration:'none',
                  }}>
                    Full fixture details <span style={{ fontSize:14 }}>→</span>
                  </Link>
                </div>
              )}

              {/* Training sessions */}
              <div>
                <p style={{ fontSize:10, fontWeight:800, color:'rgba(255,255,255,0.38)', textTransform:'uppercase', letterSpacing:'0.14em', marginBottom:10 }}>
                  Training
                </p>
                {openSessions.length === 0 ? (
                  <p style={{ fontSize:13, color:'rgba(255,255,255,0.25)' }}>No training sessions planned for this day.</p>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {openSessions.map((item, i) => (
                      <div key={i} style={{ borderRadius:14, border:'1px solid rgba(255,255,255,0.08)', background:'rgba(255,255,255,0.035)', padding:'14px 16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10, marginBottom: (item.subtitle || item.description || item.venue || item.team) ? 6 : 0 }}>
                          <p style={{ fontSize:14.5, fontWeight:800, color:'white', lineHeight:1.35 }}>{item.title || item.description}</p>
                          {item.session_time && <span style={{ fontSize:13, fontWeight:900, color, flexShrink:0 }}>{item.session_time.slice(0,5)}</span>}
                        </div>
                        {item.title && item.description && item.description !== item.title && (
                          <p style={{ fontSize:12.5, color:'rgba(255,255,255,0.55)', lineHeight:1.6, marginBottom:4 }}>{item.description}</p>
                        )}
                        {item.subtitle && <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', lineHeight:1.5, marginBottom:4 }}>{item.subtitle}</p>}
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                          {item.venue && (
                            <span style={{ fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.5)', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:7, padding:'3px 9px' }}>
                              {item.venue}
                            </span>
                          )}
                          {item.team && (
                            <span style={{ fontSize:10.5, fontWeight:800, color, background:`${color}16`, border:`1px solid ${color}30`, borderRadius:7, padding:'3px 9px' }}>
                              {item.team}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
    </section>
  );
}
