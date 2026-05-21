// Shared SVG icon components for HP module — no emojis
import * as React from 'react';

type IconProps = { className?: string };

export const IconUsers = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/>
  </svg>
);

export const IconClipboard = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <path d="M9 12h6M9 16h4"/>
  </svg>
);

export const IconActivity = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
  </svg>
);

export const IconTrendUp = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

export const IconCheck = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export const IconCheckSquare = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
);

export const IconWarning = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

export const IconStar = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconStarFilled = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

export const IconDownload = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export const IconGraduate = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
    <path d="M6 12v5c3 3 9 3 12 0v-5"/>
  </svg>
);

export const IconArrowUp = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
  </svg>
);

export const IconArrowRight = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
  </svg>
);

export const IconArrowLeft = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
  </svg>
);

export const IconSearch = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

export const IconPlus = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

export const IconTrash = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

export const IconAI = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
    <circle cx="7.5" cy="14.5" r="1.5" fill="currentColor"/><circle cx="16.5" cy="14.5" r="1.5" fill="currentColor"/>
  </svg>
);

export const IconCopy = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

export const IconRefresh = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

export const IconSettings = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
  </svg>
);

export const IconCalendar = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export const IconChevronDown = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const IconChevronRight = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

export const IconX = ({ className = 'h-4 w-4' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export const IconNoData = ({ className = 'h-12 w-12' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
    <path d="M9 9h.01M15 15h.01"/>
  </svg>
);

export const IconRunning = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="13" cy="4" r="2"/>
    <path d="M7 21l3-8 2 3 3-5 2 4"/>
    <path d="M5 16s1-1 3-1 3 1 5 1 3-1 3-1"/>
  </svg>
);

// Animated loading spinner — replaces basic spin
export const Spinner = ({ size = 'md', color = 'emerald' }: { size?: 'sm'|'md'|'lg'; color?: string }) => {
  const s = size==='sm'?'h-4 w-4':size==='lg'?'h-8 w-8':'h-5 w-5';
  const c = `border-${color}-500`;
  return (
    <div className={`${s} animate-spin rounded-full border-2 ${c} border-t-transparent`}/>
  );
};

// Page-level loading skeleton — shimmer effect
export const PageLoader = ({ label = 'Loading…' }: { label?: string }) => (
  <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#030810]">
    <div className="relative">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-800 border-t-emerald-500"/>
      <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-transparent border-b-sky-500/30" style={{animationDuration:'1.5s',animationDirection:'reverse'}}/>
    </div>
    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-600">{label}</p>
  </main>
);

// Skeleton card for loading states
export const SkeletonCard = ({ height = 'h-20' }: { height?: string }) => (
  <div className={`${height} w-full overflow-hidden rounded-2xl bg-slate-900`}>
    <div className="h-full w-full animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-[length:200%_100%]"
      style={{animation:'shimmer 1.8s infinite',backgroundSize:'200% 100%'}}/>
  </div>
);

// Empty state — no emojis, uses icon
export const EmptyState = ({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) => (
  <div className="flex flex-col items-center justify-center py-14 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-600">
      {icon}
    </div>
    <p className="text-sm font-semibold text-slate-400">{title}</p>
    {sub && <p className="mt-1 text-xs text-slate-600">{sub}</p>}
  </div>
);
