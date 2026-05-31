'use client';

export default function Loading() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#030810',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      <style>{`
        @keyframes spin-glow {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes badge-appear {
          0%   { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fade-glow {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>

      {/* Spinning glowing ring */}
      <div style={{
        position: 'absolute',
        width: 180, height: 180,
        borderRadius: '50%',
        animation: 'spin-glow 2s linear infinite',
      }}>
        <svg width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle
            cx="90" cy="90" r="86"
            stroke="url(#glowGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="200 340"
            style={{filter:'drop-shadow(0 0 6px rgba(56,189,248,0.9)) drop-shadow(0 0 14px rgba(56,189,248,0.5))'}}
          />
          <defs>
            <linearGradient id="glowGrad" x1="0" y1="0" x2="180" y2="180" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0"/>
              <stop offset="40%" stopColor="#38bdf8" stopOpacity="1"/>
              <stop offset="70%" stopColor="#a78bfa" stopOpacity="1"/>
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Soft background glow */}
      <div style={{
        position: 'absolute',
        width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)',
        animation: 'fade-glow 2s ease-in-out infinite',
      }}/>

      {/* Badge */}
      <img
        src="/st-benedicts-logo.png"
        alt="St Benedict's"
        style={{
          width: 110, height: 110,
          objectFit: 'contain',
          position: 'relative',
          zIndex: 1,
          animation: 'badge-appear 0.6s ease-out forwards',
        }}
      />
    </div>
  );
}