'use client';
type Row = Record<string, any>;
interface Props { programs: Row[]; color: string; loading: boolean; }

export default function PlayerResources({ programs, color, loading }: Props) {
  if (!loading && programs.length === 0) return null;
  return (
    <section id="resources" style={{ padding: '0 20px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Player Resources</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {loading ? [0,1,2].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}/>
        )) : programs.map((p, i) => (
          <div key={p.id || i} style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</p>
              {p.description && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 }}>{p.description}</p>}
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>PDF</p>
            </div>
            {p.file_url && (
              <a href={p.file_url} target="_blank" rel="noreferrer"
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 9, fontSize: 11, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}30`, textDecoration: 'none' }}>
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
