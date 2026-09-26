'use client';
type Row = Record<string, any>;
interface Props { spotlight: Row[]; color: string; loading: boolean; }

export default function RecognitionPanel({ spotlight, color, loading }: Props) {
  if (!loading && spotlight.length === 0) return null;
  return (
    <section style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      {/* "Player Spotlight" was an invented product heading above a coloured
          bar — the standard dashboard section treatment. Replaced with the
          same quiet rule-and-label used across the portal. */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18,
        paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ width:22, height:2, background:color }}/>
        <p style={{ fontSize:10.5, fontWeight:700, color:'rgba(255,255,255,0.55)',
          textTransform:'uppercase', letterSpacing:'0.2em' }}>Recognition</p>
      </div>

      {/* Centred cards with circular photos, a coloured gradient fill and a
          drop shadow read as profile widgets. A left-aligned row with a
          square portrait reads as a printed team page — which is what this
          actually is. */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:10 }}>
        {spotlight.map((s, i) => (
          <div key={s.id || i} style={{
            display:'flex', gap:13, alignItems:'flex-start',
            borderRadius:14, border:'1px solid rgba(255,255,255,0.075)',
            borderLeft:`2px solid ${color}`,
            background:'rgba(255,255,255,0.022)', padding:'14px 15px',
          }}>
            {s.photo_url && (
              <div style={{ width:48, height:56, borderRadius:8, overflow:'hidden', flexShrink:0,
                background:'rgba(255,255,255,0.04)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photo_url} alt={s.player_name || ''}
                  style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}/>
              </div>
            )}
            <div style={{ minWidth:0 }}>
              <p style={{ fontSize:9.5, fontWeight:700, color, textTransform:'uppercase',
                letterSpacing:'0.15em', marginBottom:4 }}>
                {s.category || 'Recognition'}
              </p>
              <p style={{ fontSize:14.5, fontWeight:700, color:'white', lineHeight:1.25 }}>{s.player_name}</p>
              {s.team && <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{s.team}</p>}
              {s.note && (
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', marginTop:7, lineHeight:1.55 }}>
                  {s.note}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
