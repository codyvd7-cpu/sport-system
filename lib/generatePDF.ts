// Premium branded PDF generation using jsPDF
// Dark theme matching the app's design language

import jsPDF from 'jspdf';

// Brand colours
const BRAND = {
  bg:       '#030810',
  surface:  '#0d1117',
  border:   '#1e2635',
  accent:   '#38bdf8',
  green:    '#10b981',
  amber:    '#fbbf24',
  red:      '#f87171',
  purple:   '#a78bfa',
  white:    '#ffffff',
  dim:      '#64748b',
};

function hexToRGB(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setFill(doc: jsPDF, hex: string) {
  doc.setFillColor(...hexToRGB(hex));
}
function setDraw(doc: jsPDF, hex: string) {
  doc.setDrawColor(...hexToRGB(hex));
}
function setTextColor(doc: jsPDF, hex: string) {
  doc.setTextColor(...hexToRGB(hex));
}

// Draw a rounded rectangle
function roundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, fill?: string, stroke?: string) {
  if (fill) setFill(doc, fill);
  if (stroke) setDraw(doc, stroke);
  const style = fill && stroke ? 'FD' : fill ? 'F' : 'D';
  doc.roundedRect(x, y, w, h, r, r, style);
}

// Page header with branding
function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  const W = doc.internal.pageSize.width;

  // Dark background bar
  setFill(doc, BRAND.bg);
  doc.rect(0, 0, W, 30, 'F');

  // Accent left bar
  setFill(doc, BRAND.accent);
  doc.rect(0, 0, 3, 30, 'F');

  // School name
  setTextColor(doc, BRAND.accent);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text("ST BENEDICT'S COLLEGE · HIGH PERFORMANCE", 10, 11);

  // Title
  setTextColor(doc, BRAND.white);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 10, 21);

  // Subtitle / date
  setTextColor(doc, BRAND.dim);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, W - 10, 21, { align: 'right' });

  // Separator line
  setDraw(doc, BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(0, 30, W, 30);
}

// Section label
function sectionLabel(doc: jsPDF, text: string, x: number, y: number, color = BRAND.dim) {
  setTextColor(doc, color);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text.toUpperCase(), x, y);
}

// ── ATHLETE PROFILE PDF ──────────────────────────────────────
export function generateAthletePDF(data: {
  athlete: any;
  attendance: any[];
  pbs: Record<string, { value: number; unit: string; date: string }>;
  notes: any;
  stats: { total: number; present: number; rate: number | null };
}): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.width;
  const { athlete, attendance, pbs, notes, stats } = data;
  const name = athlete?.full_name || 'Unknown';
  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  // Background
  setFill(doc, BRAND.bg);
  doc.rect(0, 0, W, 297, 'F');

  drawHeader(doc, name, today);

  let y = 40;

  // ── PROFILE INFO CARD ──
  roundedRect(doc, 10, y, W - 20, 32, 3, BRAND.surface, BRAND.border);

  // Info grid
  const fields = [
    { label: 'Team',         val: athlete?.team       || '—' },
    { label: 'Age Group',    val: athlete?.age_group  || '—' },
    { label: 'Position',     val: athlete?.position   || '—' },
    { label: 'Availability', val: athlete?.availability || 'Available' },
  ];

  fields.forEach((f, i) => {
    const col = i % 4;
    const fx = 15 + col * ((W - 30) / 4);
    sectionLabel(doc, f.label, fx, y + 10);
    setTextColor(doc, BRAND.white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(f.val, fx, y + 18);
  });

  // Attendance rate
  const rateColor = !stats.rate ? BRAND.dim : stats.rate >= 80 ? BRAND.green : stats.rate >= 60 ? BRAND.amber : BRAND.red;
  sectionLabel(doc, 'Attendance', 15, y + 26);
  setTextColor(doc, rateColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(stats.rate !== null ? `${stats.rate}%` : '—', 15, y + 34);

  sectionLabel(doc, 'Sessions', 50, y + 26);
  setTextColor(doc, BRAND.white);
  doc.text(`${stats.present} / ${stats.total}`, 50, y + 34);

  y += 40;

  // ── PERSONAL BESTS ──
  if (Object.keys(pbs).length > 0) {
    sectionLabel(doc, 'Personal Bests', 10, y, BRAND.accent);
    y += 6;

    const pbList = Object.entries(pbs);
    pbList.forEach(([test, pb], i) => {
      if (i % 3 === 0 && i > 0) y += 18;
      const col = i % 3;
      const fx = 10 + col * ((W - 20) / 3);
      roundedRect(doc, fx, y, (W - 20) / 3 - 2, 15, 2, BRAND.surface, BRAND.border);
      sectionLabel(doc, test.replace(/_/g, ' '), fx + 3, y + 6);
      setTextColor(doc, BRAND.accent);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${pb.value} ${pb.unit}`, fx + 3, y + 13);
    });
    y += 22;
  }

  // ── COACH NOTES ──
  if (notes) {
    sectionLabel(doc, 'Coach Feedback', 10, y, BRAND.purple);
    y += 6;
    roundedRect(doc, 10, y, W - 20, 36, 3, BRAND.surface, BRAND.border);

    if (notes.strengths) {
      sectionLabel(doc, 'Strengths', 15, y + 8);
      setTextColor(doc, BRAND.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(notes.strengths, (W - 30) / 2 - 5);
      doc.text(lines.slice(0, 2), 15, y + 15);
    }
    if (notes.current_focus) {
      sectionLabel(doc, 'Development Focus', W / 2 + 5, y + 8);
      setTextColor(doc, BRAND.white);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(notes.current_focus, (W - 30) / 2 - 5);
      doc.text(lines.slice(0, 2), W / 2 + 5, y + 15);
    }
    if (notes.coach_comment) {
      sectionLabel(doc, 'Comment', 15, y + 26);
      setTextColor(doc, BRAND.dim);
      doc.setFontSize(7.5);
      const lines = doc.splitTextToSize(notes.coach_comment, W - 30);
      doc.text(lines.slice(0, 2), 15, y + 33);
    }
    y += 42;
  }

  // ── RECENT ATTENDANCE ──
  if (attendance.length > 0) {
    sectionLabel(doc, 'Recent Attendance', 10, y, BRAND.green);
    y += 6;

    const last10 = attendance.slice(0, 10);
    last10.forEach((a, i) => {
      const col = i % 5;
      const row = Math.floor(i / 5);
      const fx = 10 + col * ((W - 20) / 5);
      const fy = y + row * 12;
      const statusColor = a.status === 'Present' ? BRAND.green : a.status === 'Late' ? BRAND.amber : a.status === 'Absent' ? BRAND.red : BRAND.accent;
      roundedRect(doc, fx, fy, (W - 20) / 5 - 2, 10, 2, BRAND.surface, BRAND.border);
      setFill(doc, statusColor);
      doc.circle(fx + 4, fy + 5, 1.5, 'F');
      setTextColor(doc, BRAND.white);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(a.session_date?.slice(5) || '', fx + 7, fy + 6);
    });
    y += attendance.length > 5 ? 28 : 16;
  }

  // Footer
  setFill(doc, BRAND.border);
  doc.rect(0, 285, W, 12, 'F');
  setTextColor(doc, BRAND.dim);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Kinetiq Sport · St Benedict\'s College High Performance Programme', 10, 292);
  doc.text(today, W - 10, 292, { align: 'right' });

  return doc.output('blob');
}

// ── TEAM REPORT PDF ──────────────────────────────────────────
export function generateTeamPDF(data: {
  team: string;
  athletes: any[];
  attendance: any[];
}): Blob {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.width;
  const { team, athletes, attendance } = data;
  const today = new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });

  setFill(doc, BRAND.bg);
  doc.rect(0, 0, W, 297, 'F');

  drawHeader(doc, `${team} Squad Report`, today);

  let y = 40;

  // Squad stats
  const available = athletes.filter(a => !['Injured','Unavailable'].includes(a.availability)).length;
  const injured   = athletes.filter(a => a.availability === 'Injured').length;
  const modified  = athletes.filter(a => a.availability === 'Modified').length;

  const stats = [
    { label: 'Squad Size', val: `${athletes.length}`, color: BRAND.white },
    { label: 'Available',  val: `${available}`,        color: BRAND.green },
    { label: 'Injured',    val: `${injured}`,           color: injured > 0 ? BRAND.red : BRAND.dim },
    { label: 'Modified',   val: `${modified}`,          color: modified > 0 ? BRAND.amber : BRAND.dim },
  ];

  const sw = (W - 20) / 4;
  stats.forEach((s, i) => {
    roundedRect(doc, 10 + i * sw, y, sw - 2, 18, 3, BRAND.surface, BRAND.border);
    sectionLabel(doc, s.label, 14 + i * sw, y + 7);
    setTextColor(doc, s.color);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(s.val, 14 + i * sw, y + 16);
  });

  y += 25;

  // Squad list
  sectionLabel(doc, 'Squad Roster', 10, y, BRAND.accent);
  y += 5;

  // Header row
  roundedRect(doc, 10, y, W - 20, 7, 1, BRAND.border);
  setTextColor(doc, BRAND.dim);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.text('NAME', 13, y + 5);
  doc.text('POSITION', 80, y + 5);
  doc.text('AGE GROUP', 120, y + 5);
  doc.text('AVAILABILITY', 160, y + 5);
  y += 8;

  athletes.forEach((a, i) => {
    const rowBg = i % 2 === 0 ? BRAND.surface : BRAND.bg;
    setFill(doc, rowBg);
    doc.rect(10, y, W - 20, 7, 'F');

    const availColor = a.availability === 'Available' ? BRAND.green
      : a.availability === 'Injured' ? BRAND.red
      : a.availability === 'Modified' ? BRAND.amber
      : BRAND.dim;

    setTextColor(doc, BRAND.white);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(a.full_name || '—', 13, y + 5);

    doc.setFont('helvetica', 'normal');
    setTextColor(doc, BRAND.dim);
    doc.text(a.position || '—', 80, y + 5);
    doc.text(a.age_group || '—', 120, y + 5);

    setTextColor(doc, availColor);
    doc.setFont('helvetica', 'bold');
    doc.text(a.availability || 'Available', 160, y + 5);

    y += 7;
    if (y > 270) {
      doc.addPage();
      setFill(doc, BRAND.bg);
      doc.rect(0, 0, W, 297, 'F');
      y = 15;
    }
  });

  // Footer
  setFill(doc, BRAND.border);
  doc.rect(0, 285, W, 12, 'F');
  setTextColor(doc, BRAND.dim);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Kinetiq Sport · St Benedict\'s College Hockey', 10, 292);
  doc.text(today, W - 10, 292, { align: 'right' });

  return doc.output('blob');
}
