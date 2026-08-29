'use client';
import * as React from 'react';
import { getSpeedGate, bluetoothSupported } from './manager';
import type { SpeedGateStatus, SpeedGateEvent } from './types';
import { INITIAL_STATUS } from './types';
import { armBlockers } from './parser';

// ─── useSpeedGate ──────────────────────────────────────────────────────────────
// Exposes the manager as React state, and owns the one piece of logic that
// genuinely belongs at this layer: locking a run to the athlete who was
// selected when it was armed.
//
// Why the lock matters: a coach naturally swipes to the next athlete while the
// current one is still running. Without a lock, the result would land on the
// wrong child's record — a data-integrity failure that would be very hard to
// notice and worse to explain.

export interface ArmedRun {
  runId: number;
  athleteId: string;
  athleteName: string;
  distanceM: number;
  testType: string;
  armedAt: number;
}

export interface CapturedResult extends ArmedRun {
  elapsedMs: number;
  receivedAt: number;
}

export function useSpeedGate() {
  const sg = React.useMemo(() => (typeof window === 'undefined' ? null : getSpeedGate()), []);
  const [status, setStatus] = React.useState<SpeedGateStatus>(INITIAL_STATUS);
  const [supported] = React.useState(() => (typeof window === 'undefined' ? true : bluetoothSupported()));

  // The armed run, held in a ref so BLE callbacks always read the CURRENT
  // value rather than a stale closure from when the listener was attached.
  const armedRunRef = React.useRef<ArmedRun | null>(null);
  const [armedRun, setArmedRun] = React.useState<ArmedRun | null>(null);
  const [result, setResult] = React.useState<CapturedResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Run ids already handled, so a duplicate BLE notification can't produce a
  // second result. The database enforces this too — belt and braces, because
  // a duplicate here would briefly show the coach a wrong screen.
  const handledRuns = React.useRef<Set<number>>(new Set());

  React.useEffect(() => {
    if (!sg) return;
    return sg.subscribe({
      onStatus: s => setStatus({ ...s }),
      onEvent: (e: SpeedGateEvent) => {
        if (e.type === 'armed') {
          // The hardware assigns the run id; bind it to whoever is selected now.
          const pending = armedRunRef.current;
          if (pending) {
            const bound = { ...pending, runId: e.runId };
            armedRunRef.current = bound;
            setArmedRun(bound);
          }
        }

        if (e.type === 'result') {
          if (handledRuns.current.has(e.runId)) return;   // duplicate notification
          const run = armedRunRef.current;
          // A result with no armed run is a stale event — from a previous
          // session, or a reconnect replay. Discarding is correct: we have no
          // trustworthy athlete to attribute it to.
          if (!run || run.runId !== e.runId) return;

          handledRuns.current.add(e.runId);
          setResult({ ...run, elapsedMs: e.elapsedMs, receivedAt: Date.now() });
          armedRunRef.current = null;
          setArmedRun(null);
        }

        if (e.type === 'fault') {
          armedRunRef.current = null;
          setArmedRun(null);
        }
      },
    });
  }, [sg]);

  const connect = React.useCallback(async () => {
    setError(null);
    try { await sg?.connect(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not connect.'); }
  }, [sg]);

  const disconnect = React.useCallback(async () => { await sg?.disconnect(); }, [sg]);

  /** Arms the gates and snapshots the athlete this run belongs to. */
  const arm = React.useCallback(async (athlete: { id: string; name: string }, distanceM: number, testType: string) => {
    setError(null);
    setResult(null);
    const pending: ArmedRun = {
      runId: -1,                       // replaced by the hardware's id on ARMED
      athleteId: athlete.id,
      athleteName: athlete.name,
      distanceM, testType,
      armedAt: Date.now(),
    };
    armedRunRef.current = pending;
    setArmedRun(pending);
    try {
      await sg?.arm();
    } catch (e) {
      armedRunRef.current = null;
      setArmedRun(null);
      setError(e instanceof Error ? e.message : 'Could not arm the gates.');
    }
  }, [sg]);

  const abort = React.useCallback(async () => {
    armedRunRef.current = null;
    setArmedRun(null);
    try { await sg?.abort(); } catch { /* the UI state is already cleared */ }
  }, [sg]);

  const setDistance = React.useCallback(async (m: number) => {
    setError(null);
    try { await sg?.setDistance(m); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not set distance.'); }
  }, [sg]);

  const reset = React.useCallback(async () => {
    armedRunRef.current = null;
    setArmedRun(null);
    setResult(null);
    try { await sg?.reset(); } catch { /* ignore */ }
  }, [sg]);

  const clearResult = React.useCallback(() => setResult(null), []);

  const blockers = React.useMemo(() => armBlockers(status), [status]);

  return {
    supported,
    status,
    blockers,
    canArm: blockers.length === 0,
    armedRun,
    result,
    error,
    connect, disconnect, arm, abort, reset, setDistance, clearResult,
    requestStatus: () => sg?.requestStatus(),
  };
}
