'use client';
type Row = Record<string, any>;
interface Props { spotlight: Row[]; color: string; loading: boolean; }

export default function RecognitionPanel({ spotlight, color, loading }: Props) {
  if (!loading && spotlight.length === 0) return null;
  return (
    <section style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>Recognition</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Player Spotlight</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {spotlight.map((s, i) => (
          <div key={s.id || i} style={{
            borderRadius:20, border:'1px solid rgba(255,255,255,0.1)',
            background:`linear-gradient(160deg, ${color}12, rgba(255,255,255,0.015))`,
            padding:20, textAlign:'center', boxShadow:'0 8px 24px rgba(0,0,0,0.2)',
          }}>
            {s.photo_url && (
              <div style={{ width:64, height:64, borderRadius:'50%', overflow:'hidden', margin:'0 auto 14px', border:`2px solid ${color}50`, boxShadow:`0 0 0 4px ${color}12` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photo_url} alt={s.player_name || ''} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
              </div>
            )}
            <p style={{ fontSize:9.5, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.15em', marginBottom:5 }}>{s.category || 'Recognition'}</p>
            <p style={{ fontSize:15, fontWeight:900, color:'white', marginBottom:2 }}>{s.player_name}</p>
            {s.team && <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)' }}>{s.team}</p>}
            {s.note && <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.45)', marginTop:8, lineHeight:1.5 }}>{s.note}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
