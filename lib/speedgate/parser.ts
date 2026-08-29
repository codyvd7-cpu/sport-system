import type { SpeedGateEvent, GateNode, HardwareState, SpeedGateStatus } from './types';
import { GATE_NODES } from './types';

// ─── SpeedGate parser ──────────────────────────────────────────────────────────
// Raw hardware lines → typed events. Deliberately pure and side-effect free so
// it can be tested exhaustively without a Bluetooth device present, which is
// the only practical way to verify malformed-packet handling.
//
// Guiding rule: a malformed or unrecognised line must NEVER throw. Firmware
// will gain messages this client has never heard of, and an exception on a
// background BLE notification would take down the coach's testing session
// mid-run. Anything unparseable comes back as { type: 'unknown' }.

const HARDWARE_STATES: HardwareState[] = ['WAIT', 'READY', 'ARMED', 'RUNNING', 'RESULT', 'FAULT'];

function isGateNode(v: string): v is GateNode {
  return (GATE_NODES as string[]).includes(v);
}

/** Parses one line. Returns `unknown` rather than throwing on anything odd. */
export function parseLine(raw: string): SpeedGateEvent {
  const line = raw.trim();
  if (!line) return { type: 'unknown', raw };

  const parts = line.split('|');
  const cmd = parts[0]?.toUpperCase();

  try {
    switch (cmd) {
      case 'HELLO': {
        const protocolVersion = Number(parts[1]);
        if (!Number.isFinite(protocolVersion)) return { type: 'unknown', raw };
        return { type: 'hello', protocolVersion, firmwareVersion: parts[2] ?? 'unknown' };
      }

      case 'PONG': {
        const value = Number(parts[1] ?? 1);
        return { type: 'pong', value: Number.isFinite(value) ? value : 1 };
      }

      case 'STATE': {
        const state = parts[1]?.toUpperCase() as HardwareState;
        if (!HARDWARE_STATES.includes(state)) return { type: 'unknown', raw };
        return { type: 'state', state };
      }

      case 'NODE': {
        const node = parts[1]?.toUpperCase() ?? '';
        if (!isGateNode(node)) return { type: 'unknown', raw };
        return { type: 'node', node, online: parts[2] === '1' };
      }

      case 'BEAM': {
        const gate = parts[1]?.toUpperCase();
        const status = parts[2]?.toUpperCase();
        if (gate !== 'START' && gate !== 'FINISH') return { type: 'unknown', raw };
        if (status !== 'CLEAR' && status !== 'BLOCK') return { type: 'unknown', raw };
        return { type: 'beam', gate: gate === 'START' ? 'start' : 'finish', clear: status === 'CLEAR' };
      }

      case 'SYNC': {
        const rttUs = Number(parts[2]);
        return { type: 'sync', valid: parts[1] === '1', rttUs: Number.isFinite(rttUs) ? rttUs : 0 };
      }

      case 'RSSI': {
        const node = parts[1]?.toUpperCase() ?? '';
        const rssi = Number(parts[2]);
        if (!isGateNode(node) || !Number.isFinite(rssi)) return { type: 'unknown', raw };
        return { type: 'rssi', node, rssi };
      }

      case 'DIST': {
        const metres = Number(parts[1]);
        if (!Number.isFinite(metres) || metres <= 0) return { type: 'unknown', raw };
        return { type: 'distance', metres };
      }

      case 'ARMED': {
        const runId = Number(parts[1]);
        if (!Number.isInteger(runId)) return { type: 'unknown', raw };
        return { type: 'armed', runId };
      }

      case 'RUN': {
        // RUN|START|17
        if (parts[1]?.toUpperCase() !== 'START') return { type: 'unknown', raw };
        const runId = Number(parts[2]);
        if (!Number.isInteger(runId)) return { type: 'unknown', raw };
        return { type: 'runStarted', runId };
      }

      case 'RESULT': {
        // RESULT|17|4287|30 — run id, elapsed ms, distance m
        const runId = Number(parts[1]);
        const elapsedMs = Number(parts[2]);
        const distanceM = Number(parts[3]);
        // A result missing any field, or with a nonsensical time, is not
        // salvageable — better surfaced as unknown than saved as a bad record
        // against an athlete.
        if (!Number.isInteger(runId) || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
          return { type: 'unknown', raw };
        }
        return {
          type: 'result',
          runId,
          elapsedMs: Math.round(elapsedMs),
          distanceM: Number.isFinite(distanceM) ? distanceM : 0,
        };
      }

      case 'FAULT': {
        const code = parts[1]?.toUpperCase();
        if (!code) return { type: 'unknown', raw };
        // Deliberately NOT validated against a fixed list — new firmware fault
        // codes must pass through intact rather than being discarded.
        return { type: 'fault', code };
      }

      default:
        return { type: 'unknown', raw };
    }
  } catch {
    // Belt and braces: nothing above should throw, but a parser crash during a
    // live testing session is unacceptable.
    return { type: 'unknown', raw };
  }
}

/** A BLE notification may carry several newline-separated lines at once. */
export function parseChunk(chunk: string): SpeedGateEvent[] {
  return chunk
    .split(/[\r\n]+/)
    .map(l => l.trim())
    .filter(Boolean)
    .map(parseLine);
}

/** Folds an event into the running status. Pure — returns a new object. */
export function applyEvent(status: SpeedGateStatus, event: SpeedGateEvent): SpeedGateStatus {
  switch (event.type) {
    case 'hello':
      return { ...status, protocolVersion: event.protocolVersion, firmwareVersion: event.firmwareVersion };

    case 'state':
      return {
        ...status,
        hardwareState: event.state,
        // Leaving a fault state should clear the stale fault message, otherwise
        // an old error lingers on screen after the coach has resolved it.
        lastFault: event.state === 'FAULT' ? status.lastFault : null,
      };

    case 'node':
      return { ...status, nodes: { ...status.nodes, [event.node]: event.online } };

    case 'beam':
      return { ...status, beams: { ...status.beams, [event.gate]: event.clear } };

    case 'sync':
      return { ...status, sync: { valid: event.valid, rttUs: event.rttUs } };

    case 'rssi':
      return { ...status, rssi: { ...status.rssi, [event.node]: event.rssi } };

    case 'distance':
      return { ...status, distanceM: event.metres };

    case 'armed':
      return { ...status, currentRunId: event.runId, lastFault: null };

    case 'runStarted':
      return { ...status, currentRunId: event.runId };

    case 'fault':
      return { ...status, lastFault: event.code };

    // 'result', 'pong' and 'unknown' carry no status change — results are
    // handled by the run lifecycle, not by mutating device status.
    default:
      return status;
  }
}

/** Every condition that must hold before arming is safe. Returned as reasons
 *  rather than a bare boolean, so the UI can tell the coach WHAT to fix. */
export function armBlockers(status: SpeedGateStatus): string[] {
  const blockers: string[] = [];
  if (status.connection !== 'connected') blockers.push('Not connected to the gates');
  const offline = GATE_NODES.filter(n => status.nodes[n] === false);
  if (offline.length) blockers.push(`${offline.length} unit${offline.length > 1 ? 's' : ''} offline`);
  if (status.beams.start === false) blockers.push('Start gate alignment required');
  if (status.beams.finish === false) blockers.push('Finish gate alignment required');
  if (status.sync && !status.sync.valid) blockers.push('Timing not synchronised');
  if (status.hardwareState === 'FAULT') blockers.push('Hardware fault — reset the gates');
  if (status.hardwareState === 'ARMED' || status.hardwareState === 'RUNNING') {
    blockers.push('A run is already in progress');
  }
  return blockers;
}
