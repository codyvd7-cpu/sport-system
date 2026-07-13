'use client';
type Row = Record<string, any>;
interface Props { reminders: Row[]; color: string; loading: boolean; }

export default function DepartmentNotices({ reminders, color, loading }: Props) {
  if (!loading && reminders.length === 0) return null;
  return (
    <section style={{ padding: '0 24px 64px', maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:color }}/>
        <div>
          <p style={{ fontSize:11, fontWeight:800, color, textTransform:'uppercase', letterSpacing:'0.2em' }}>Notices</p>
          <p style={{ fontSize:20, fontWeight:900, color:'white' }}>Department Notices</p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
        {loading ? [0,1].map(i => (
          <div key={i} style={{ height: 64, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}/>
        )) : reminders.map((r, i) => (
          <div key={r.id || i} style={{
            display:'flex', alignItems:'flex-start', gap:14, padding:'18px 20px', borderRadius:16,
            border:`1px solid ${color}25`, background:`linear-gradient(155deg, ${color}10, rgba(255,255,255,0.01))`,
          }}>
            <div style={{ width:32, height:32, borderRadius:10, background:`${color}20`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} style={{width:15,height:15}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            <div>
              <p style={{ fontSize:13.5, fontWeight:700, color:'rgba(255,255,255,0.9)', lineHeight:1.45 }}>{r.message || r.title}</p>
              {r.subtitle && <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.4)', marginTop:3 }}>{r.subtitle}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
