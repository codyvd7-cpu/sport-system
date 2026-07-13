'use client';
// Subtle drifting ambient glow orbs — very slow, low opacity, adds life without noise.
interface Props { color: string; }

export default function PortalAmbient({ color }: Props) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%     { transform: translate(40px,-30px) scale(1.08); }
          66%     { transform: translate(-25px,20px) scale(0.95); }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-50px,35px) scale(1.1); }
        }
        @keyframes driftPulse {
          0%,100% { opacity: 0.5; }
          50%     { opacity: 0.85; }
        }
      `}</style>
      <div style={{
        position:'absolute', top:'-10%', left:'-8%', width:600, height:600, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}14 0%, transparent 70%)`,
        animation:'drift1 26s ease-in-out infinite, driftPulse 14s ease-in-out infinite',
        filter:'blur(20px)',
      }}/>
      <div style={{
        position:'absolute', top:'30%', right:'-12%', width:700, height:700, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}10 0%, transparent 70%)`,
        animation:'drift2 32s ease-in-out infinite',
        filter:'blur(24px)',
      }}/>
      <div style={{
        position:'absolute', bottom:'-15%', left:'20%', width:500, height:500, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}0c 0%, transparent 70%)`,
        animation:'drift1 38s ease-in-out infinite reverse',
        filter:'blur(20px)',
      }}/>
    </div>
  );
}
