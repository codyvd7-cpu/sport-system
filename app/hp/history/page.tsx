'use client';
import * as React from 'react';
import { fmtValue, GRADE8_TESTS, GRADE9_TESTS, type TestKey } from '@/lib/hpTests';

type Row = Record<string, any>;

const ACTION_META: Record<string, { label: string; color: string }> = {
  save_test_result: { label: 'Test Result',  color: '#38bdf8' },
  save_attendance:  { label: 'Attendance',   color: '#10b981' },
  graduate:         { label: 'Rollover',     color: '#a78bfa' },
  promote:          { label: 'Rollover',     color: '#a78bfa' },
  restore_backup:   { label: 'Restore',      color: '#f87171' },
};
const ALL_TESTS = [...GRADE8_TESTS, ...GRADE9_TESTS];
const TEST_LABEL: Record<string, string> = {};
ALL_TESTS.forEach(t => { TEST_LABEL[t.key] = t.label; });

function fmtWhen(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) + ' · ' +
         d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}
function fmtVal(key: string, v: any) {
  if (v === null || v === undefined || v === '') return '—';
  const n = parseFloat(v);
  if (!isNaN(n) && TEST_LABEL[key]) return fmtValue(key as TestKey, n);
  return String(v);
}

export default function HPHistoryPage() {
  const [logs, setLogs] = React.useState<Row[]>([]);
  const [students, setStudents] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);

  React.useEffect(() => {
    Promise.all([
      fetch('/api/hp/audit?limit=200', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/hp/data?type=students', { credentials: 'include' }).then(r => r.json()),
    ]).then(([a, s]) => {
      setLogs(a.logs || []);
      const map: Record<string, string> = {};
      (s.data || []).forEach((st: Row) => { map[st.id] = st.full_name; });
      setStudents(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const shown = filter ? logs.filter(l => l.action === filter) : logs;
  const actionsPresent = [...new Set(logs.map(l => l.action))];

  return (
    <main className="min-h-screen pt-[54px] text-white lg:pt-0" style={{ background: '#060c1a' }}>
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] mb-1" style={{ color: 'rgba(16,185,129,0.7)' }}>High Performance</p>
            <h1 className="text-4xl font-black tracking-tight leading-none text-white">Data History</h1>
            <p className="mt-2 text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Every save is recorded — what changed, old → new, by whom, when.
            </p>
          </div>
          <a href="/api/hp/backup" className="rounded-xl border px-4 py-2.5 text-[12px] font-bold transition hover:bg-white/5"
            style={{ borderColor: 'rgba(16,185,129,0.4)', color: '#10b981' }}>
            ↓ Download Full Backup
          </a>
        </div>

        {/* Filter pills */}
        {actionsPresent.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2">
            <button onClick={() => setFilter(null)}
              className="rounded-xl border px-3 py-1.5 text-[11px] font-bold transition"
              style={{
                borderColor: !filter ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)',
                background: !filter ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: !filter ? 'white' : 'rgba(255,255,255,0.4)',
              }}>All</button>
            {actionsPresent.map(a => {
              const m = ACTION_META[a] || { label: a, color: '#94a3b8' };
              const active = filter === a;
              return (
                <button key={a} onClick={() => setFilter(active ? null : a)}
                  className="rounded-xl border px-3 py-1.5 text-[11px] font-bold transition"
                  style={{
                    borderColor: active ? `${m.color}60` : 'rgba(255,255,255,0.08)',
                    background: active ? `${m.color}18` : 'transparent',
                    color: active ? m.color : 'rgba(255,255,255,0.4)',
                  }}>{m.label}</button>
              );
            })}
          </div>
        )}

        {/* Log list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div style={{ width: 24, height: 24, borderRadius: '50%', border: '3px solid #10b981', borderTopColor: 'transparent', animation: 'spin .8s linear infinite' }}/>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border py-14 text-center" style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              No history yet. Entries appear here as test results and attendance are saved.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden divide-y" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.05)' }}>
            {shown.map(log => {
              const m = ACTION_META[log.action] || { label: log.action, color: '#94a3b8' };
              const d = log.details || {};
              const isOpen = open === log.id;
              const studentName = d.student_id ? (students[d.student_id] || 'Unknown student') : null;
              const changes: Record<string, [any, any]> = d.changes || {};
              const changeKeys = Object.keys(changes);
              const attChanged: Row[] = Array.isArray(d.changed) ? d.changed : [];
              const expandable = changeKeys.length > 0 || attChanged.length > 0;

              // One-line summary
              let summary = '';
              if (log.action === 'save_test_result') {
                summary = `${studentName ?? ''} · ${d.term} ${d.year}${d.new_record ? ' · new entry' : ` · ${changeKeys.length} field${changeKeys.length === 1 ? '' : 's'} changed`}`;
              } else if (log.action === 'save_attendance') {
                summary = `${d.date} · ${d.session_type || ''} · ${d.new_session ? `new register (${d.total_records})` : `${d.changed_count} status change${d.changed_count === 1 ? '' : 's'}`}`;
              } else {
                summary = typeof d === 'object' ? Object.entries(d).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ') : String(d);
              }

              return (
                <div key={log.id}>
                  <button onClick={() => expandable && setOpen(isOpen ? null : log.id)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-white/[0.02]"
                    style={{ cursor: expandable ? 'pointer' : 'default' }}>
                    <span className="shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide"
                      style={{ background: `${m.color}18`, color: m.color, border: `1px solid ${m.color}35` }}>
                      {m.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-white">{summary}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {fmtWhen(log.created_at)} · by {log.actor}
                      </p>
                    </div>
                    {expandable && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={2}
                        className="h-3.5 w-3.5 shrink-0 transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4">
                      <div className="rounded-xl border p-3.5" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.25)' }}>
                        {changeKeys.length > 0 && (
                          <div className="space-y-1.5">
                            {changeKeys.map(k => (
                              <div key={k} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                                <span className="w-32 shrink-0 font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                  {TEST_LABEL[k] || k}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{fmtVal(k, changes[k][0])}</span>
                                <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
                                <span className="font-black" style={{ color: m.color }}>{fmtVal(k, changes[k][1])}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {attChanged.length > 0 && (
                          <div className="space-y-1.5">
                            {attChanged.map((c, i) => (
                              <div key={i} className="flex flex-wrap items-baseline gap-2 text-[12px]">
                                <span className="w-44 shrink-0 truncate font-bold" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                  {students[c.student_id] || c.student_id}
                                </span>
                                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{c.from ?? '—'}</span>
                                <span style={{ color: 'rgba(255,255,255,0.25)' }}>→</span>
                                <span className="font-black" style={{ color: m.color }}>{c.to}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-center text-[10.5px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Showing the last {shown.length} entries · Full data snapshots available via backup above
        </p>
      </div>
    </main>
  );
}
