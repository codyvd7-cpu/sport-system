'use client';
import * as React from 'react';
import { useToast } from '@/components/Toast';

interface PDFButtonProps {
  label?: string;
  filename: string;
  onGenerate: () => Promise<Blob>;
  className?: string;
  style?: React.CSSProperties;
}

export function PDFButton({ label = 'Export PDF', filename, onGenerate, className, style }: PDFButtonProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = React.useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const blob = await onGenerate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('PDF downloaded ✓');
    } catch (e: any) {
      showToast(`Failed: ${e.message}`, 'error');
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={style}>
      {loading ? (
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"/>
          Generating…
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {label}
        </span>
      )}
    </button>
  );
}

// Athlete profile PDF button
export function AthletePDFButton({ athleteId, name }: { athleteId: string; name: string }) {
  return (
    <PDFButton
      label="Export PDF"
      filename={`${name.replace(/\s+/g, '_')}_profile.pdf`}
      className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition hover:text-white"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)' }}
      onGenerate={async () => {
        const res = await fetch(`/api/pdf/athlete?id=${athleteId}`);
        const data = await res.json();
        const { generateAthletePDF } = await import('@/lib/generatePDF');
        return generateAthletePDF(data);
      }}
    />
  );
}

// Team report PDF button
export function TeamPDFButton({ team, athletes, attendance }: { team: string; athletes: any[]; attendance: any[] }) {
  return (
    <PDFButton
      label="Export PDF"
      filename={`${team}_squad_report.pdf`}
      className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[10px] font-semibold transition hover:text-white"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}
      onGenerate={async () => {
        const { generateTeamPDF } = await import('@/lib/generatePDF');
        return generateTeamPDF({ team, athletes, attendance });
      }}
    />
  );
}
