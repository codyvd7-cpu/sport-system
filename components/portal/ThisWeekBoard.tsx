'use client';
import * as React from 'react';

type Row = Record<string, any>;

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
const DAYS_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_MAP: Record<string, number> = {
  monday:0, tuesday:1, wednesday:2, thursday:3, friday:4, saturday:5, sunday:6,
  mon:0, tue:1, wed:2, thu:3, fri:4, sat:5, sun:6,
};

interface Props { weekItems: Row[]; color: string; loading: boolean; }

export default function ThisWeekBoard({ weekItems, color, loading }: Props) {
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  const itemsByDay = React.useMemo(() => {
    const map: Record<number, Row[]> = {};
    weekItems.forEach(item => {
      const idx = DAY_MAP[(item.day_label || '').toLowerCase().trim()] ?? -1;
      if (idx >= 0) { if (!map[idx]) map[idx] = []; map[idx].push(item); }
    });
    return map;
  }, [weekItems]);

  if (loading) return (
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 56px' }}>
      <div style={{ height: 320, borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}/>
    </div>
  );

  if (!weekItems.length) return null;

  const activeDays = DAYS.map((_, i) => i).filter(i => itemsByDay[i]?.length > 0);

  return (
    <section id="this-week" style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      {/* Section header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>This Week</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Training & Fixture Schedule</p>
        </div>
      </div>

      {/* Timeline grid — 7 day columns on desktop, scroll on mobile */}
      <div style={{
        display:'grid', gridAutoFlow:'column', gridAutoColumns:'minmax(220px, 1fr)',
        gap:14, overflowX:'auto', paddingBottom:8, scrollSnapType:'x mandatory',
      }}>
        {DAYS.map((day, i) => {
          const items = itemsByDay[i] || [];
          const isToday = i === todayIdx;
          const hasItems = items.length > 0;

          return (
            <div key={day} style={{
              scrollSnapAlign:'start',
              borderRadius:18,
              border: isToday ? `1.5px solid ${color}70` : '1px solid rgba(255,255,255,0.08)',
              background: isToday
                ? `linear-gradient(160deg, ${color}18, rgba(255,255,255,0.02))`
                : 'rgba(255,255,255,0.02)',
              overflow:'hidden',
              opacity: hasItems ? 1 : 0.45,
              minHeight: 200,
            }}>
              {/* Day header */}
              <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color: isToday ? color : 'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.15em' }}>{day}</p>
                  <p style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.3)', marginTop:1 }}>{DAYS_FULL[i]}</p>
                </div>
                {isToday && (
                  <span style={{ fontSize:9, fontWeight:800, padding:'3px 8px', borderRadius:100, background:color, color:'#030810', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                    Today
                  </span>
                )}
              </div>

              {/* Sessions */}
              <div style={{ padding: hasItems ? '12px 14px' : '24px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                {!hasItems ? (
                  <p style={{ fontSize:12, color:'rgba(255,255,255,0.18)', textAlign:'center' }}>No sessions</p>
                ) : items.map((item, idx) => (
                  <div key={idx} style={{
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
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
