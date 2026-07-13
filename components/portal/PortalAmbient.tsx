'use client';
// Subtle drifting ambient glow — positioned lower down, away from hero, very diffuse.
interface Props { color: string; }

export default function PortalAmbient({ color }: Props) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes driftA {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.5; }
          50%     { transform: translate(-30px,25px) scale(1.06); opacity:0.75; }
        }
        @keyframes driftB {
          0%,100% { transform: translate(0,0) scale(1); opacity:0.4; }
          50%     { transform: translate(35px,-20px) scale(1.08); opacity:0.65; }
        }
      `}</style>
      {/* Single soft glow, centred, well below the hero fold */}
      <div style={{
        position:'absolute', top:'55%', left:'50%', width:900, height:900,
        transform:'translate(-50%,-50%)', borderRadius:'50%',
        background:`radial-gradient(circle, ${color}0a 0%, transparent 65%)`,
        animation:'driftA 34s ease-in-out infinite',
        filter:'blur(40px)',
      }}/>
      {/* Second glow, right side, further down */}
      <div style={{
        position:'absolute', top:'120%', right:'5%', width:700, height:700, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}08 0%, transparent 65%)`,
        animation:'driftB 40s ease-in-out infinite',
        filter:'blur(40px)',
      }}/>
    </div>
  );
}
