'use client';
import * as React from 'react';

type Row = Record<string, any>;

const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
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

  const activeDays = DAYS.filter((_, i) => itemsByDay[i]?.length > 0);
  const [selected, setSelected] = React.useState(todayIdx);

  if (loading) return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px 40px' }}>
      <div style={{ height: 180, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}/>
    </div>
  );

  if (!weekItems.length) return null;

  return (
    <section id="this-week" style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))', overflow: 'hidden', boxShadow:'0 8px 32px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>This Week</p>
          {/* Day tabs */}
          <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 0 }}>
            {DAYS.map((day, i) => {
              const hasItems = itemsByDay[i]?.length > 0;
              const isToday  = i === todayIdx;
              const isActive = i === selected;
              return (
                <button key={day} onClick={() => setSelected(i)}
                  disabled={!hasItems}
                  style={{
                    flexShrink: 0, padding: '8px 14px', borderRadius: '10px 10px 0 0',
                    border: 'none', cursor: hasItems ? 'pointer' : 'default',
                    fontSize: 11, fontWeight: 700, transition: 'all .15s',
                    background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                    color: isActive ? 'white' : hasItems ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.15)',
                    borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                    position: 'relative',
                  }}>
                  {day}
                  {isToday && <span style={{ position: 'absolute', top: 4, right: 4, width: 4, height: 4, borderRadius: '50%', background: color }}/>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px' }}>
          {(itemsByDay[selected] || []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', textAlign: 'center', padding: '16px 0' }}>No sessions this day</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(itemsByDay[selected] || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '14px 0', borderBottom: i < (itemsByDay[selected]?.length || 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  {/* Time */}
                  {item.session_time && (
                    <p style={{ fontSize: 13, fontWeight: 800, color, flexShrink: 0, minWidth: 40 }}>{item.session_time.slice(0,5)}</p>
                  )}
                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{item.title || item.description}</p>
                    {item.venue && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{item.venue}</p>}
                    {item.notes && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{item.notes}</p>}
                  </div>
                  {/* Team badge */}
                  {item.team && (
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '4px 10px', borderRadius: 8, background: `${color}15`, color, border: `1px solid ${color}25`, flexShrink: 0 }}>
                      {item.team}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
