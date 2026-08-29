'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase';
import { useSpeedGate } from '@/lib/speedgate/useSpeedGate';
import { formatElapsed, signalQuality, faultMessage, GATE_NODES } from '@/lib/speedgate/types';

// ─── SpeedGateRunner ───────────────────────────────────────────────────────────
// Field-side sprint testing. Designed to be used one-handed, at arm's length,
// in sunlight, while watching an athlete rather than the screen.
//
// The hardware is deliberately kept behind the workflow: no dBm, no sync RTT,
// no characteristic UUIDs in the main flow. A coach sees whether the gates are
// ready and whether they can arm; the raw numbers live in diagnostics.

type Athlete = { id: string; full_name: string; team?: string | null };
type Attempt = {
  id: string; attempt_no: number; elapsed_ms: number | null;
  status: string; distance_m: number; created_at: string;
};

const DISTANCES = [5, 10, 20, 30, 40];

/** One session id per mount — groups a coach's attempts for this field session. */
function newSessionId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function SpeedGateRunner({
  squad, testTypePrefix = 'sprint', accent = '#38bdf8',
}: { squad: Athlete[]; testTypePrefix?: string; accent?: string }) {
  const sg = useSpeedGate();
  const [sessionId] = React.useState(newSessionId);

  const [queue, setQueue] = React.useState<Athlete[]>([]);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [distance, setDistance] = React.useState(30);
  const [attempts, setAttempts] = React.useState<Attempt[]>([]);
  const [personalBest, setPersonalBest] = React.useState<number | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  const active = queue[activeIdx] ?? null;
  const testType = `${testTypePrefix}_${distance}m`;

  // ── Load this athlete's history whenever the active athlete or test changes
  const loadAttempts = React.useCallback(async (athleteId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/athlete/speedtest?athleteId=${athleteId}&testType=${testType}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setAttempts(d.attempts || []);
        setPersonalBest(d.personalBest ?? null);
      }
    } catch { /* history is nice to have, not required to test */ }
  }, [testType]);

  React.useEffect(() => {
    if (active) loadAttempts(active.id);
    else { setAttempts([]); setPersonalBest(null); }
  }, [active, loadAttempts]);

  // ── Saving a captured result ──────────────────────────────────────────────
  const saveResult = React.useCallback(async (status: 'valid' | 'invalid' | 'dnf' = 'valid') => {
    const r = sg.result;
    if (!r) return;
    setSaving(true); setSaveError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Signed out.');
      const res = await fetch('/api/athlete/speedtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          athleteId: r.athleteId,
          testType: r.testType,
          sessionId,
          distanceM: r.distanceM,
          elapsedMs: r.elapsedMs,
          status,
          hardwareRunId: r.runId,
          source: 'speedgate',
          firmwareVersion: sg.status.firmwareVersion,
          protocolVersion: sg.status.protocolVersion,
          deviceName: 'SpeedGate-Master',
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not save.');
      sg.clearResult();
      if (active) await loadAttempts(active.id);
    } catch (e) {
      // The captured time is still on screen — a failed save must never
      // silently discard a result the athlete actually ran.
      setSaveError(e instanceof Error ? e.message : 'Could not save. The result is still here — try again.');
    }
    setSaving(false);
  }, [sg, sessionId, active, loadAttempts]);

  const nextAthlete = React.useCallback(() => {
    sg.clearResult();
    setActiveIdx(i => Math.min(i + 1, queue.length - 1));
  }, [sg, queue.length]);

  // ── Unsupported browser ───────────────────────────────────────────────────
  if (!sg.supported) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-6">
        <p className="text-[13px] font-bold text-amber-200">SpeedGate needs Chrome on Android or a laptop</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">
          This browser doesn&apos;t support Bluetooth. On iPhone and iPad, Apple doesn&apos;t allow any
          browser to connect to Bluetooth devices, so the gates can&apos;t be used here.
          You can still record sprint times by hand on the athlete&apos;s profile.
        </p>
      </div>
    );
  }

  const st = sg.status;
  const online = GATE_NODES.filter(n => st.nodes[n] === true).length;
  const connected = st.connection === 'connected';

  const dot = (ok: boolean | null) => ({
    background: ok === true ? '#34d399' : ok === false ? '#f87171' : 'rgba(255,255,255,0.2)',
  });

  return (
    <div className="space-y-4">
      {/* ── QUEUE SETUP ─────────────────────────────────────────────────── */}
      {queue.length === 0 ? (
        <div className="rounded-2xl border border-white/7 bg-white/[0.015] p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">Testing queue</p>
          <p className="mt-1.5 text-[12px] text-white/40">
            Pick the athletes you&apos;re testing. You can add more later.
          </p>
          <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
            {squad.map(a => (
              <button key={a.id}
                onClick={() => setQueue(q => q.some(x => x.id === a.id) ? q : [...q, a])}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition hover:bg-white/[0.04]">
                <span className="text-[12.5px] text-white/80">{a.full_name}</span>
                {a.team && <span className="text-[10.5px] text-white/25">{a.team}</span>}
              </button>
            ))}
          </div>
          {squad.length > 0 && (
            <button onClick={() => setQueue(squad)}
              className="mt-3 w-full rounded-xl border py-2.5 text-[12px] font-bold"
              style={{ borderColor: accent + '55', background: accent + '14', color: accent }}>
              Add whole squad ({squad.length})
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── ACTIVE ATHLETE ───────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/30">
              {distance} m sprint · {activeIdx + 1} of {queue.length}
            </p>
            <p className="mt-1.5 text-[22px] font-black leading-tight text-white">
              {active?.full_name ?? '—'}
            </p>
            {active?.team && <p className="text-[11.5px] text-white/35">{active.team}</p>}
          </div>

          {/* ── DISTANCE ─────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-1.5">
            {DISTANCES.map(d => (
              <button key={d}
                onClick={async () => { setDistance(d); if (connected) await sg.setDistance(d); }}
                className="flex-1 rounded-xl py-2.5 text-[12px] font-bold transition"
                style={{
                  background: distance === d ? accent + '22' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${distance === d ? accent + '66' : 'rgba(255,255,255,0.07)'}`,
                  color: distance === d ? accent : 'rgba(255,255,255,0.4)',
                }}>
                {d} m
              </button>
            ))}
          </div>

          {/* ── GATE STATUS ──────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-white/7 bg-white/[0.015] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={dot(connected)} />
                <span className="text-[12.5px] font-bold text-white">
                  {st.connection === 'connected' ? 'Connected'
                    : st.connection === 'reconnecting' ? 'Reconnecting…'
                    : st.connection === 'connecting' ? 'Connecting…'
                    : st.connection === 'scanning' ? 'Looking for gates…'
                    : 'Not connected'}
                </span>
              </div>
              {connected
                ? <span className="text-[11px] text-white/35">{online} / 4 units</span>
                : <button onClick={sg.connect}
                    className="rounded-lg border px-3 py-1.5 text-[11px] font-bold"
                    style={{ borderColor: accent + '55', color: accent }}>Connect</button>}
            </div>

            {connected && (
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-3">
                {[['Start', st.beams.start], ['Finish', st.beams.finish],
                  ['Timing', st.sync ? st.sync.valid : null]].map(([label, ok]) => (
                  <div key={String(label)} className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full" style={dot(ok as boolean | null)} />
                    <span className="text-[11px] text-white/50">{String(label)}</span>
                  </div>
                ))}
              </div>
            )}

            {connected && (
              <button onClick={() => setShowDiagnostics(v => !v)}
                className="mt-2.5 text-[10.5px] text-white/25 hover:text-white/45">
                {showDiagnostics ? 'Hide' : 'Show'} diagnostics
              </button>
            )}

            {showDiagnostics && (
              <div className="mt-2 space-y-1 rounded-xl bg-black/30 p-3 text-[10.5px] text-white/40">
                <p>Firmware {st.firmwareVersion ?? '—'} · protocol {st.protocolVersion ?? '—'}</p>
                <p>Hardware state: {st.hardwareState ?? '—'}</p>
                {st.sync && <p>Clock sync {st.sync.valid ? 'valid' : 'invalid'} · RTT {st.sync.rttUs} μs</p>}
                {GATE_NODES.map(n => (
                  <p key={n}>
                    {n}: {st.nodes[n] === null ? 'unknown' : st.nodes[n] ? 'online' : 'offline'}
                    {st.rssi[n] != null && ` · ${signalQuality(st.rssi[n]!)} (${st.rssi[n]} dBm)`}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* ── FAULT ────────────────────────────────────────────────────── */}
          {st.lastFault && (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3">
              <p className="text-[12px] text-red-200">{faultMessage(st.lastFault)}</p>
              <button onClick={sg.reset} className="mt-1.5 text-[11px] font-bold text-red-300">Reset gates</button>
            </div>
          )}

          {/* ── THE MAIN CONTROL ─────────────────────────────────────────── */}
          {sg.result ? (
            <div className="rounded-2xl border p-6 text-center"
              style={{ borderColor: '#34d39955', background: 'rgba(52,211,153,0.07)' }}>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/35">
                {sg.result.athleteName}
              </p>
              <p className="mt-2 text-[44px] font-black leading-none tracking-tight text-white">
                {formatElapsed(sg.result.elapsedMs)}<span className="text-[20px] text-white/40">s</span>
              </p>

              {personalBest != null && (
                sg.result.elapsedMs < personalBest ? (
                  <p className="mt-2 text-[13px] font-black text-emerald-300">
                    NEW PB · {((personalBest - sg.result.elapsedMs) / 1000).toFixed(3)}s faster
                  </p>
                ) : (
                  <p className="mt-2 text-[12px] text-white/35">
                    PB {formatElapsed(personalBest)}s
                    <span className="text-white/25"> · +{((sg.result.elapsedMs - personalBest) / 1000).toFixed(3)}s</span>
                  </p>
                )
              )}

              {saveError && <p className="mt-2 text-[11.5px] text-red-300">{saveError}</p>}

              <div className="mt-4 flex gap-2">
                <button onClick={() => saveResult('valid')} disabled={saving}
                  className="flex-1 rounded-xl border border-emerald-500/40 bg-emerald-500/15 py-3 text-[13px] font-bold text-emerald-300 disabled:opacity-40">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => saveResult('invalid')} disabled={saving}
                  className="rounded-xl border border-white/12 px-4 py-3 text-[12px] font-semibold text-white/45 disabled:opacity-40">
                  Void
                </button>
              </div>
              {activeIdx < queue.length - 1 && (
                <button onClick={nextAthlete}
                  className="mt-2 w-full py-2 text-[12px] font-bold" style={{ color: accent }}>
                  Next athlete →
                </button>
              )}
            </div>
          ) : sg.armedRun ? (
            <div className="rounded-2xl border p-8 text-center"
              style={{ borderColor: accent + '55', background: accent + '10' }}>
              <p className="text-[13px] font-black uppercase tracking-[0.3em]"
                style={{ color: st.hardwareState === 'RUNNING' ? '#34d399' : accent }}>
                {st.hardwareState === 'RUNNING' ? 'Running' : 'Armed'}
              </p>
              <p className="mt-2 text-[12px] text-white/40">
                {st.hardwareState === 'RUNNING' ? 'Timing…' : 'Waiting for start'}
              </p>
              <button onClick={sg.abort} className="mt-4 text-[11.5px] font-bold text-white/35">Abort</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => active && sg.arm({ id: active.id, name: active.full_name }, distance, testType)}
                disabled={!sg.canArm || !active}
                className="w-full rounded-2xl py-5 text-[15px] font-black uppercase tracking-[0.2em] transition disabled:opacity-30"
                style={{ background: accent + '1e', border: `1px solid ${accent}66`, color: accent }}>
                Arm gates
              </button>
              {sg.blockers.length > 0 && (
                <p className="text-center text-[11.5px] text-amber-300/70">{sg.blockers[0]}</p>
              )}
            </>
          )}

          {sg.error && <p className="text-center text-[11.5px] text-red-300">{sg.error}</p>}

          {/* ── ATTEMPTS ─────────────────────────────────────────────────── */}
          {attempts.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015]">
              <p className="border-b border-white/5 px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-widest text-white/30">
                Attempts today
              </p>
              <div className="divide-y divide-white/5">
                {attempts.map(a => (
                  <div key={a.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-[11.5px] text-white/35">{a.attempt_no}</span>
                    <span className={`text-[13px] font-bold ${a.status === 'valid' ? 'text-white' : 'text-white/25 line-through'}`}>
                      {a.elapsed_ms != null ? `${formatElapsed(a.elapsed_ms)}s` : a.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QUEUE NAV ────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <button onClick={() => { sg.clearResult(); setActiveIdx(i => Math.max(0, i - 1)); }}
              disabled={activeIdx === 0}
              className="text-[12px] font-semibold text-white/35 disabled:opacity-25">← Previous</button>
            <button onClick={() => setQueue([])} className="text-[11px] text-white/25">Change queue</button>
            <button onClick={nextAthlete} disabled={activeIdx >= queue.length - 1}
              className="text-[12px] font-semibold text-white/35 disabled:opacity-25">Skip →</button>
          </div>
        </>
      )}
    </div>
  );
}
