'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Row = Record<string, any>;

// ─── test config (must match DB columns) ─────────────────────────────────────
const G8 = [
  { key:'chin_up_hang',  label:'Chin Up Hang',     unit:'s',     hint:'seconds e.g. 35' },
  { key:'broad_jump',    label:'Broad Jump',        unit:'cm',    hint:'centimetres e.g. 182' },
  { key:'sprint_10m',   label:'10m Sprint',        unit:'s',     hint:'seconds e.g. 2.24' },
  { key:'sprint_30m',   label:'30m Sprint',        unit:'s',     hint:'seconds e.g. 4.85' },
  { key:'run_500m',     label:'500m Run',           unit:'mm:ss', hint:'e.g. 2:15' },
];
const G9 = [
  { key:'pushup_2min',       label:'Push Up (2 min)', unit:'reps',  hint:'e.g. 22' },
  { key:'triple_broad_jump', label:'Triple Broad Jump',unit:'cm',   hint:'e.g. 620' },
  { key:'sprint_10m',        label:'10m Sprint',       unit:'s',     hint:'e.g. 2.18' },
  { key:'sprint_30m',        label:'30m Sprint',       unit:'s',     hint:'e.g. 4.60' },
  { key:'run_500m',          label:'500m Run',          unit:'mm:ss', hint:'e.g. 2:05' },
];

function mmssToSecs(v: string): number | null {
  if (!v || v.trim() === '' || v.trim() === '-' || v.trim() === '—') return null;
  const s = v.trim();
  // Standard mm:ss format e.g. 1:34
  if (s.includes(':')) {
    const [m, sec] = s.split(':').map(Number);
    if (isNaN(m) || isNaN(sec)) return null;
    return m * 60 + sec;
  }
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  // Handle mm.ss format e.g. 1.34 means 1 min 34 sec (coach shorthand)
  if (s.includes('.')) {
    const secPart = parseInt(s.split('.')[1] || '0');
    if (secPart <= 59 && n < 10) {
      return Math.floor(n) * 60 + secPart;
    }
  }
  return n;
}
function parseVal(key: string, raw: string): number | null {
  if (!raw || raw.trim() === '' || raw.trim() === '-' || raw.trim() === '—') return null;
  if (key === 'run_500m') return mmssToSecs(raw);
  const n = parseFloat(raw.replace(',', '.'));
  return isNaN(n) ? null : n;
}
function fmtVal(key: string, v: number): string {
  if (key === 'run_500m') {
    const m = Math.floor(v / 60), s = Math.round(v % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
  return v % 1 === 0 ? String(v) : v.toFixed(2);
}

// ─── name matching ────────────────────────────────────────────────────────────
function surname(name: string) {
  return name.trim().split(/\s+/).pop()?.toLowerCase() || '';
}
function matchStudent(raw: string, students: Row[]): Row | null {
  const r = raw.trim().toLowerCase();
  // exact full name
  const exact = students.find(s => s.full_name.toLowerCase() === r);
  if (exact) return exact;
  // exact surname
  const bySurname = students.filter(s => surname(s.full_name) === r);
  if (bySurname.length === 1) return bySurname[0];
  // first word match + surname match
  const parts = r.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0], last = parts[parts.length - 1];
    const twoWay = students.find(s => {
      const sp = s.full_name.toLowerCase().split(/\s+/);
      return sp[0] === first && sp[sp.length - 1] === last;
    });
    if (twoWay) return twoWay;
  }
  return null;
}

// ─── parse pasted text ────────────────────────────────────────────────────────
function parseCSV(text: string): string[][] {
  return text.trim().split(/\r?\n/).map(line => {
    // tabs first (Excel paste), then commas
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    return line.split(',').map(c => c.trim().replace(/^"(.*)"$/, '$1'));
  }).filter(row => row.some(c => c));
}

const TERMS = ['Term 1', 'Term 2', 'Term 3', 'Term 4'];
const CLASSES = ['B', 'E', 'F', 'J', 'M'];

// ─── styles ───────────────────────────────────────────────────────────────────
const BG = '#060c1a';
const BD = 'rgba(255,255,255,0.08)';
const CARD: React.CSSProperties = { borderRadius: 14, border: `1px solid ${BD}`, background: 'rgba(255,255,255,0.03)', padding: 20 };
const inp: React.CSSProperties = { width: '100%', borderRadius: 10, border: `1px solid ${BD}`, background: '#0d1424', padding: '9px 12px', color: 'white', fontSize: 13, outline: 'none' };
const G = '#10b981';

export default function HPImport() {
  const router = useRouter();
  const [step,       setStep]       = React.useState<1|2|3|4>(1);
  const [grade,      setGrade]      = React.useState<'Grade 8'|'Grade 9'>('Grade 8');
  const [cls,        setCls]        = React.useState<string>('');
  const [term,       setTerm]       = React.useState('Term 2');
  const [year,       setYear]       = React.useState(2026);
  const [testDate,   setTestDate]   = React.useState(new Date().toISOString().split('T')[0]);
  const [rawText,    setRawText]    = React.useState('');
  const [colMap,     setColMap]     = React.useState<Record<string,number>>({});
  const [nameCol,    setNameCol]    = React.useState(0);
  const [headers,    setHeaders]    = React.useState<string[]>([]);
  const [dataRows,   setDataRows]   = React.useState<string[][]>([]);
  const [students,   setStudents]   = React.useState<Row[]>([]);
  const [preview,    setPreview]    = React.useState<{student:Row|null;raw:string;vals:Record<string,number|null>}[]>([]);
  const [manualMatch,setManualMatch]= React.useState<Record<number,string>>({});
  const [importing,  setImporting]  = React.useState(false);
  const [imported,   setImported]   = React.useState(0);
  const [toast,      setToast]      = React.useState('');

  const tests = grade === 'Grade 8' ? G8 : G9;

  function showToast(msg: string, dur = 3500) { setToast(msg); setTimeout(() => setToast(''), dur); }

  React.useEffect(() => {
    fetch('/api/hp/students', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setStudents(d.students || []));
  }, []);

  // filtered students for matching
  const filteredStudents = React.useMemo(() => {
    let s = students.filter(st => st.grade === grade);
    if (cls) s = s.filter(st => st.class_group === cls);
    return s;
  }, [students, grade, cls]);

  // ── Step 2: parse pasted data ──
  function parseData() {
    if (!rawText.trim()) { showToast('Paste some data first.'); return; }
    const rows = parseCSV(rawText);
    if (rows.length < 2) { showToast('Need at least a header row and one data row.'); return; }
    const hdrs = rows[0];
    const data = rows.slice(1).filter(r => r.some(c => c));
    setHeaders(hdrs);
    setDataRows(data);

    // auto-detect name column
    const nameIdx = hdrs.findIndex(h => /name|student|pupil|surname/i.test(h));
    setNameCol(nameIdx >= 0 ? nameIdx : 0);

    // auto-detect test columns
    const map: Record<string, number> = {};
    tests.forEach(t => {
      const idx = hdrs.findIndex(h => {
        const hl = h.toLowerCase();
        if (t.key === 'chin_up_hang') return /chin|hang/i.test(hl);
        if (t.key === 'broad_jump') return /broad.*jump|broad/i.test(hl) && !/triple/i.test(hl);
        if (t.key === 'sprint_10m') return /10m|10 m/i.test(hl);
        if (t.key === 'sprint_30m') return /30m|30 m/i.test(hl);
        if (t.key === 'run_500m') return /500|run/i.test(hl);
        if (t.key === 'pushup_2min') return /push|press/i.test(hl);
        if (t.key === 'triple_broad_jump') return /triple/i.test(hl);
        return false;
      });
      if (idx >= 0) map[t.key] = idx;
    });
    setColMap(map);
    setStep(2);
  }

  // ── Step 3: build preview ──
  function buildPreview() {
    const rows = dataRows.map(row => {
      const rawName = row[nameCol] || '';
      const student = matchStudent(rawName, filteredStudents);
      const vals: Record<string, number | null> = {};
      tests.forEach(t => {
        const ci = colMap[t.key];
        vals[t.key] = ci !== undefined ? parseVal(t.key, row[ci] || '') : null;
      });
      return { student, raw: rawName, vals };
    }).filter(r => r.raw.trim());
    setPreview(rows);
    setStep(3);
  }

  // ── Step 4: import ──
  async function doImport() {
    const toInsert = preview.map((r,i) => {
      if (r.student) return r;
      if (manualMatch[i]) {
        const stu = filteredStudents.find(s=>s.id===manualMatch[i]);
        return stu ? {...r, student:stu} : r;
      }
      return r;
    }).filter(r => r.student);
    if (!toInsert.length) { showToast('No matched students to import.'); return; }
    setImporting(true);

    let count = 0;
    for (const row of toInsert) {
      const sid = row.student!.id;
      const payload: Row = { student_id: sid, term, year, test_date: testDate };
      tests.forEach(t => { payload[t.key] = row.vals[t.key] ?? null; });
      const res = await fetch('/api/hp/tests', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert', payload }),
      });
      if (res.ok) count++;
    }

    setImported(count);
    setImporting(false);
    setStep(4);
  }

  const matched = preview.filter((r,i) => r.student || manualMatch[i]).length;
  const unmatched = preview.filter((r,i) => !r.student && !manualMatch[i]).length;

  return (
    <main className="pt-14 pb-24 lg:pt-0 lg:pb-10"
      style={{ minHeight: '100vh', background: BG, color: 'white' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {toast && (
        <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 999, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)', borderRadius: 12, padding: '12px 20px', color: G, fontWeight: 700, fontSize: 13, backdropFilter: 'blur(12px)', whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px' }}>

        <Link href="/hp" style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', textDecoration: 'none', marginBottom: 16, display: 'inline-block' }}>← HP Dashboard</Link>

        <p style={{ fontSize: 10, fontWeight: 800, color: G, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 6 }}>HP Admin</p>
        <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 4 }}>Bulk Import Test Results</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>Paste a spreadsheet from any coach — match to students and import in one go.</p>

        {/* Step pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          {[{n:1,l:'Setup'},{n:2,l:'Columns'},{n:3,l:'Preview'},{n:4,l:'Done'}].map((s,i,arr) => (
            <React.Fragment key={s.n}>
              <div style={{ fontSize: 11, fontWeight: 800, padding: '5px 11px', borderRadius: 20,
                background: step === s.n ? 'rgba(16,185,129,0.15)' : step > s.n ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)',
                color: step === s.n ? G : step > s.n ? 'rgba(16,185,129,0.6)' : 'rgba(255,255,255,0.3)',
                border: `1px solid ${step === s.n ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}>{step > s.n ? '✓ ' : ''}{s.l}</div>
              {i < arr.length - 1 && <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* ── STEP 1: Setup + paste ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Session Setup</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Grade</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['Grade 8', 'Grade 9'] as const).map(g => (
                      <button key={g} onClick={() => setGrade(g)} style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1px solid ${grade === g ? G + '45' : BD}`, background: grade === g ? `${G}12` : 'rgba(255,255,255,0.03)', color: grade === g ? G : 'rgba(255,255,255,0.5)', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Class (optional)</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => setCls('')} style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${cls === '' ? G + '45' : BD}`, background: cls === '' ? `${G}12` : 'rgba(255,255,255,0.03)', color: cls === '' ? G : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>All</button>
                    {CLASSES.map(c => (
                      <button key={c} onClick={() => setCls(c)} style={{ padding: '7px 12px', borderRadius: 9, border: `1px solid ${cls === c ? G + '45' : BD}`, background: cls === c ? `${G}12` : 'rgba(255,255,255,0.03)', color: cls === c ? G : 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>{grade === 'Grade 8' ? '8' : '9'}{c}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Term</p>
                  <select value={term} onChange={e => setTerm(e.target.value)} style={inp}>
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Year</p>
                  <select value={year} onChange={e => setYear(Number(e.target.value))} style={inp}>
                    {[2025, 2026, 2027].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>Test Date</p>
                  <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} style={inp} />
                </div>
              </div>
            </div>

            <div style={CARD}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Paste Spreadsheet Data</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, lineHeight: 1.6 }}>
                Copy your spreadsheet (Excel, Google Sheets) and paste below. <strong style={{ color: 'white' }}>First row must be headers.</strong> Include a Name/Surname column and columns for each test. Tab or comma separated both work.
              </p>
              <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: 'rgba(16,185,129,0.8)', fontWeight: 700, marginBottom: 4 }}>Example format ({grade === 'Grade 8' ? 'Grade 8' : 'Grade 9'})</p>
                <code style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', whiteSpace: 'pre' }}>
                  {grade === 'Grade 8'
                    ? 'Name\tChin Up\tBroad Jump\t10m Sprint\t30m Sprint\t500m Run\nCarrozzo\t35\t182\t2.24\t4.85\t2:15\nDoorasamy\t27\t180\t2.26\t4.81\t1:34'
                    : 'Name\tPush Up\tTriple Jump\t10m Sprint\t30m Sprint\t500m Run\nKhumalo\t22\t620\t2.18\t4.60\t2:05\nMkhize\t18\t580\t2.22\t4.71\t2:12'}
                </code>
              </div>
              <textarea
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                rows={10}
                placeholder="Paste your spreadsheet data here..."
                style={{ ...inp, fontFamily: 'monospace', resize: 'vertical', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 8 }}>
                {rawText.trim() ? `${rawText.trim().split('\n').length} rows detected` : 'No data pasted yet'}
              </p>
              <button onClick={parseData} disabled={!rawText.trim()}
                style={{ marginTop: 14, width: '100%', padding: 13, borderRadius: 12, border: `1px solid ${G}35`, background: `${G}12`, color: G, fontWeight: 800, fontSize: 14, cursor: rawText.trim() ? 'pointer' : 'not-allowed', opacity: rawText.trim() ? 1 : 0.4 }}>
                Parse Data →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Column mapping ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={CARD}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 14 }}>Check Column Mapping</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
                Found <strong style={{ color: 'white' }}>{headers.length} columns</strong> and <strong style={{ color: 'white' }}>{dataRows.length} rows</strong>. Check the columns are mapped to the right tests.
              </p>

              {/* Name column */}
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>Name / Surname column</p>
                <select value={nameCol} onChange={e => setNameCol(Number(e.target.value))} style={inp}>
                  {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                </select>
              </div>

              {/* Test columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {tests.map(t => (
                  <div key={t.key}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: 6 }}>{t.label} ({t.unit})</p>
                    <select
                      value={colMap[t.key] !== undefined ? colMap[t.key] : ''}
                      onChange={e => setColMap(prev => ({ ...prev, [t.key]: e.target.value === '' ? undefined as any : Number(e.target.value) }))}
                      style={{ ...inp, borderColor: colMap[t.key] !== undefined ? 'rgba(16,185,129,0.4)' : BD }}>
                      <option value="">— not in sheet —</option>
                      {headers.map((h, i) => <option key={i} value={i}>{h || `Column ${i + 1}`}</option>)}
                    </select>
                  </div>
                ))}
              </div>

              {/* Preview first 3 rows */}
              <div style={{ marginTop: 16, borderRadius: 10, border: `1px solid ${BD}`, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                      {headers.map((h, i) => <th key={i} style={{ padding: '8px 12px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 700, borderBottom: `1px solid ${BD}`, whiteSpace: 'nowrap' }}>{h || `Col ${i+1}`}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.slice(0, 3).map((row, i) => (
                      <tr key={i}>
                        {row.map((cell, j) => <td key={j} style={{ padding: '7px 12px', color: 'rgba(255,255,255,0.6)', borderBottom: i < 2 ? `1px solid ${BD}` : 'none' }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Back</button>
              <button onClick={buildPreview} style={{ flex: 2, padding: 12, borderRadius: 12, border: `1px solid ${G}35`, background: `${G}12`, color: G, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>Preview Matches →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { l: 'Total rows',   v: preview.length,   c: 'white' },
                { l: 'Matched',      v: matched,          c: G },
                { l: 'Unmatched',    v: unmatched,        c: unmatched ? '#f87171' : 'rgba(255,255,255,0.3)' },
              ].map(s => (
                <div key={s.l} style={{ ...CARD, textAlign: 'center' as const, padding: '14px 10px' }}>
                  <p style={{ fontSize: 28, fontWeight: 900, color: s.c, lineHeight: 1, marginBottom: 4 }}>{s.v}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</p>
                </div>
              ))}
            </div>

            {unmatched > 0 && (
              <div style={{ ...CARD, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#f87171', marginBottom: 6 }}>⚠ {unmatched} unmatched names</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                  These rows won't be imported. Check spelling matches the student names in the HP system, or go back and adjust the name column.
                </p>
              </div>
            )}

            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${BD}` }}>
                <p style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Import Preview — {term} {year}</p>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto' }}>
                {preview.map((row, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '11px 18px', borderBottom: i < preview.length - 1 ? `1px solid ${BD}` : 'none', background: row.student ? 'transparent' : 'rgba(248,113,113,0.04)' }}>
                    {/* Status dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: row.student ? G : '#f87171', flexShrink: 0 }} />
                    {/* Name */}
                    <div style={{ minWidth: 140, flexShrink: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: row.student ? 'white' : '#f87171' }}>
                        {row.student ? row.student.full_name : row.raw}
                      </p>
                      {row.student && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{row.student.grade} · {row.student.class_group}</p>}
                      {!row.student && (
                      <select
                        value={manualMatch[i]||''}
                        onChange={e=>setManualMatch(p=>({...p,[i]:e.target.value}))}
                        style={{marginTop:4,width:'100%',background:'#0d1424',color:'white',border:'1px solid rgba(248,113,113,0.3)',borderRadius:8,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>
                        <option value=''>— pick student manually —</option>
                        {filteredStudents.map(s=><option key={s.id} value={s.id}>{s.full_name} ({s.class_group})</option>)}
                      </select>
                    )}
                    </div>
                    {/* Values */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                      {tests.map(t => {
                        const v = row.vals[t.key];
                        return v !== null ? (
                          <span key={t.key} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8, background: 'rgba(16,185,129,0.1)', color: 'rgba(16,185,129,0.8)', border: '1px solid rgba(16,185,129,0.2)', whiteSpace: 'nowrap' }}>
                            {t.label.split(' ')[0]}: {fmtVal(t.key, v)}{t.unit !== 'mm:ss' ? t.unit : ''}
                          </span>
                        ) : (
                          <span key={t.key} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>
                            {t.label.split(' ')[0]}: —
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${BD}`, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>← Back</button>
              <button onClick={doImport} disabled={importing || matched === 0}
                style={{ flex: 2, padding: 12, borderRadius: 12, border: `1px solid ${G}35`, background: `${G}12`, color: G, fontWeight: 800, fontSize: 14, cursor: matched > 0 ? 'pointer' : 'not-allowed', opacity: matched > 0 ? 1 : 0.4 }}>
                {importing ? 'Importing…' : `Import ${matched} Student${matched!==1?'s':''} →`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 4 && (
          <div style={{ ...CARD, textAlign: 'center' as const, padding: '48px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: 20, background: `${G}15`, border: `1px solid ${G}35`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke={G} strokeWidth={2.5} style={{ width: 28, height: 28 }}><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 900, color: G, marginBottom: 8 }}>{imported} results imported</h2>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{term} {year} data is now in the system. You can view results in the Testing page or student profiles.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button onClick={() => { setStep(1); setRawText(''); setPreview([]); setImported(0); }} style={{ padding: '11px 20px', borderRadius: 12, border: `1px solid ${BD}`, background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Import More</button>
              <Link href="/hp/testing" style={{ padding: '11px 20px', borderRadius: 12, border: `1px solid ${G}35`, background: `${G}12`, color: G, fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>View Testing Page →</Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
