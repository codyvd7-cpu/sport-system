'use client';
type Row = Record<string, any>;
interface Props { programs: Row[]; color: string; loading: boolean; }

export default function PlayerResources({ programs, color, loading }: Props) {
  if (!loading && programs.length === 0) return null;
  return (
    <section id="resources" style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>Resources</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Player Resources</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
        {loading ? [0,1,2].map(i => (
          <div key={i} style={{ height: 96, borderRadius: 18, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        )) : programs.map((p, i) => (
          <div key={p.id || i} style={{
            borderRadius:18, border:'1px solid rgba(255,255,255,0.1)',
            background:'linear-gradient(160deg, rgba(255,255,255,0.045), rgba(255,255,255,0.01))',
            padding:'20px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14,
            boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:14, minWidth:0 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`${color}18`, border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} style={{width:18,height:18}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div style={{ minWidth:0 }}>
                <p style={{ fontSize:13.5, fontWeight:800, color:'white', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.title}</p>
                {p.description && <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{p.description}</p>}
              </div>
            </div>
            {p.file_url && (
              <a href={p.file_url} target="_blank" rel="noreferrer" style={{
                flexShrink:0, padding:'8px 16px', borderRadius:10, fontSize:11.5, fontWeight:800,
                background:`${color}18`, color, border:`1px solid ${color}35`, textDecoration:'none',
                transition:'background .15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background=`${color}30`)}
                onMouseLeave={e => (e.currentTarget.style.background=`${color}18`)}>
                Download
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
