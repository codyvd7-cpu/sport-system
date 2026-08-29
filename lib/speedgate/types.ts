// ─── SpeedGate protocol types ──────────────────────────────────────────────────
// The wire format is line-oriented UTF-8 over BLE, pipe-delimited:
//   STATE|READY        RESULT|17|4287|30        FAULT|TIMEOUT
//
// Everything the hardware can say is modelled as a discriminated union, so the
// rest of the app consumes typed application state and never touches a raw
// string. UI code should never contain `message.startsWith('BEAM|')`.

/** The hardware's own timing state machine. Altus mirrors these rather than
 *  inventing a parallel set of run states that could disagree with the gates. */
export type HardwareState = 'WAIT' | 'READY' | 'ARMED' | 'RUNNING' | 'RESULT' | 'FAULT';

/** Transport state, kept deliberately separate from hardware state: the gates
 *  keep timing perfectly well while the phone's Bluetooth is reconnecting. */
export type ConnectionState =
  | 'unsupported'      // this browser has no Web Bluetooth (notably iOS Safari)
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'reconnecting';

export type GateNode = 'START_TX' | 'START_RX' | 'FINISH_TX' | 'MASTER';

export const GATE_NODES: GateNode[] = ['START_TX', 'START_RX', 'FINISH_TX', 'MASTER'];

export type SpeedGateEvent =
  | { type: 'hello'; protocolVersion: number; firmwareVersion: string }
  | { type: 'pong'; value: number }
  | { type: 'state'; state: HardwareState }
  | { type: 'node'; node: GateNode; online: boolean }
  | { type: 'beam'; gate: 'start' | 'finish'; clear: boolean }
  | { type: 'sync'; valid: boolean; rttUs: number }
  | { type: 'rssi'; node: GateNode; rssi: number }
  | { type: 'distance'; metres: number }
  | { type: 'armed'; runId: number }
  | { type: 'runStarted'; runId: number }
  | { type: 'result'; runId: number; elapsedMs: number; distanceM: number }
  | { type: 'fault'; code: string }
  // Anything the firmware gains later must not crash a deployed app. Unknown
  // lines are surfaced for diagnostics rather than thrown away or thrown on.
  | { type: 'unknown'; raw: string };

/** Everything the app knows about the hardware right now. */
export interface SpeedGateStatus {
  connection: ConnectionState;
  hardwareState: HardwareState | null;
  nodes: Record<GateNode, boolean | null>;   // null = not yet reported
  beams: { start: boolean | null; finish: boolean | null };  // true = clear
  sync: { valid: boolean; rttUs: number } | null;
  rssi: Partial<Record<GateNode, number>>;
  distanceM: number | null;
  firmwareVersion: string | null;
  protocolVersion: number | null;
  currentRunId: number | null;
  lastFault: string | null;
}

export const INITIAL_STATUS: SpeedGateStatus = {
  connection: 'disconnected',
  hardwareState: null,
  nodes: { START_TX: null, START_RX: null, FINISH_TX: null, MASTER: null },
  beams: { start: null, finish: null },
  sync: null,
  rssi: {},
  distanceM: null,
  firmwareVersion: null,
  protocolVersion: null,
  currentRunId: null,
  lastFault: null,
};

/** The protocol version this client was written against. A device reporting a
 *  higher version may speak messages we don't understand — surfaced as a
 *  warning rather than a hard failure, since unknown lines are handled safely. */
export const SUPPORTED_PROTOCOL_VERSION = 1;

/** Human-readable fault text. Unknown codes fall through to the raw code so a
 *  new firmware fault is still legible rather than appearing as a blank error. */
export const FAULT_MESSAGES: Record<string, string> = {
  NOT_READY: 'Gates not ready — check alignment before arming.',
  BAD_TIME:  'Timing error — the run was not measured cleanly. Try again.',
  TIMEOUT:   'No finish detected. The run timed out.',
  BAD_DIST:  'Distance rejected by the gates.',
  BAD_CMD:   'The gates did not understand that command.',
};

export function faultMessage(code: string): string {
  return FAULT_MESSAGES[code] ?? `Hardware fault: ${code}`;
}

/** dBm is meaningless to a coach; signal quality isn't. */
export function signalQuality(rssi: number): 'Excellent' | 'Good' | 'Fair' | 'Weak' {
  if (rssi >= -55) return 'Excellent';
  if (rssi >= -70) return 'Good';
  if (rssi >= -82) return 'Fair';
  return 'Weak';
}

/** 4287 → "4.287" — always three decimals, so a column of times aligns. */
export function formatElapsed(ms: number): string {
  return (ms / 1000).toFixed(3);
}
