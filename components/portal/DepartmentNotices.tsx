'use client';
type Row = Record<string, any>;
interface Props { reminders: Row[]; color: string; loading: boolean; }

export default function DepartmentNotices({ reminders, color, loading }: Props) {
  if (!loading && reminders.length === 0) return null;
  return (
    <section style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Department Notices</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? [0,1].map(i => (
          <div key={i} style={{ height: 52, borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}/>
        )) : reminders.map((r, i) => (
          <div key={r.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 18px', borderRadius: 12, border: `1px solid ${color}18`, background: `${color}06` }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, marginTop: 5, flexShrink: 0 }}/>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.82)', lineHeight: 1.4 }}>{r.message || r.title}</p>
              {r.subtitle && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{r.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
