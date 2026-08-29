import type { SpeedGateEvent, SpeedGateStatus, ConnectionState } from './types';
import { INITIAL_STATUS, SUPPORTED_PROTOCOL_VERSION } from './types';
import { parseChunk, applyEvent } from './parser';

// ─── SpeedGateManager ──────────────────────────────────────────────────────────
// The only place in Altus that touches Bluetooth. UI components consume typed
// state and call named methods; they never see a characteristic or a raw
// string.
//
// Timing authority sits with the hardware. This class deliberately does NOT
// run a stopwatch — BLE arrival times are not the result, and treating them as
// such would silently produce wrong sprint times that look plausible.

const SERVICE_UUID  = '7f9a0001-76c8-4b60-8a5b-4f47f6ca9c01';
const CMD_UUID      = '7f9a0002-76c8-4b60-8a5b-4f47f6ca9c01';
const EVENT_UUID    = '7f9a0003-76c8-4b60-8a5b-4f47f6ca9c01';
const STATUS_UUID   = '7f9a0004-76c8-4b60-8a5b-4f47f6ca9c01';
const INFO_UUID     = '7f9a0005-76c8-4b60-8a5b-4f47f6ca9c01';

const DEVICE_NAME = 'SpeedGate-Master';

type Listener = {
  onStatus?: (s: SpeedGateStatus) => void;
  onEvent?: (e: SpeedGateEvent) => void;
  onLog?: (line: string) => void;
};

/** Web Bluetooth is Chromium-only. Notably absent on iOS Safari — and since
 *  Apple requires every iOS browser to use WebKit, Chrome on iPhone can't
 *  provide it either. Checked once here so the UI can explain rather than
 *  present a button that silently does nothing. */
export function bluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

export class SpeedGateManager {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private cmdChar: BluetoothRemoteGATTCharacteristic | null = null;
  private listeners: Listener[] = [];
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalDisconnect = false;

  status: SpeedGateStatus = { ...INITIAL_STATUS };

  subscribe(l: Listener): () => void {
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter(x => x !== l); };
  }

  private log(line: string) {
    // Development visibility only — never surfaced in the coach UI.
    if (process.env.NODE_ENV !== 'production') console.debug('[SpeedGate]', line);
    this.listeners.forEach(l => l.onLog?.(line));
  }

  private setStatus(next: Partial<SpeedGateStatus>) {
    this.status = { ...this.status, ...next };
    this.listeners.forEach(l => l.onStatus?.(this.status));
  }

  private setConnection(connection: ConnectionState) {
    this.setStatus({ connection });
  }

  // ── Connection ────────────────────────────────────────────────────────────

  async connect(): Promise<void> {
    if (!bluetoothSupported()) {
      this.setConnection('unsupported');
      throw new Error('This browser does not support Bluetooth. Use Chrome on Android or a laptop.');
    }

    this.intentionalDisconnect = false;
    this.setConnection('scanning');
    this.log('scan started');

    try {
      // Filtering by name keeps the chooser to SpeedGate devices only, rather
      // than every BLE device on a busy school field.
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ name: DEVICE_NAME }],
        optionalServices: [SERVICE_UUID],
      });
      this.log(`discovered ${this.device.name}`);
      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);
      await this.openGatt();
    } catch (err) {
      this.setConnection('disconnected');
      // A user closing the device chooser is a normal action, not an error.
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancell?ed|User cancelled/i.test(msg)) { this.log('scan cancelled by user'); return; }
      throw err;
    }
  }

  private async openGatt(): Promise<void> {
    if (!this.device?.gatt) throw new Error('No device selected.');
    this.setConnection('connecting');

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(SERVICE_UUID);

    this.cmdChar = await service.getCharacteristic(CMD_UUID);

    // Both event and status characteristics notify; subscribing to each keeps
    // this working whichever the firmware uses for a given message.
    for (const uuid of [EVENT_UUID, STATUS_UUID]) {
      try {
        const ch = await service.getCharacteristic(uuid);
        await ch.startNotifications();
        ch.addEventListener('characteristicvaluechanged', this.handleNotification);
        this.log(`subscribed ${uuid.slice(0, 8)}`);
      } catch {
        this.log(`characteristic ${uuid.slice(0, 8)} unavailable — continuing`);
      }
    }

    // Device info is optional; its absence must not prevent connecting.
    try {
      const infoChar = await service.getCharacteristic(INFO_UUID);
      const value = await infoChar.readValue();
      const text = new TextDecoder().decode(value);
      this.ingest(text);
    } catch { /* optional */ }

    this.reconnectAttempts = 0;
    this.setConnection('connected');
    this.log('connected');

    // Rebuild current hardware state rather than assuming anything — after a
    // reconnect the gates may have moved on without us.
    await this.requestStatus();
  }

  private handleNotification = (event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    this.ingest(new TextDecoder().decode(value));
  };

  /** Raw text from the device → typed events → status. */
  private ingest(text: string) {
    for (const evt of parseChunk(text)) {
      if (evt.type === 'unknown') {
        this.log(`unrecognised: ${evt.raw.slice(0, 60)}`);
      } else {
        this.log(`event ${evt.type}`);
      }

      if (evt.type === 'hello' && evt.protocolVersion > SUPPORTED_PROTOCOL_VERSION) {
        this.log(`device protocol v${evt.protocolVersion} is newer than supported v${SUPPORTED_PROTOCOL_VERSION}`);
      }

      this.status = applyEvent(this.status, evt);
      this.listeners.forEach(l => l.onEvent?.(evt));
    }
    this.listeners.forEach(l => l.onStatus?.(this.status));
  }

  private handleDisconnect = () => {
    this.cmdChar = null;
    this.server = null;
    this.log('disconnected');

    if (this.intentionalDisconnect) { this.setConnection('disconnected'); return; }

    // The gates keep timing regardless of the phone, so a dropped connection
    // is a transport problem, not a reason to end the coach's session.
    this.setConnection('reconnecting');
    this.scheduleReconnect();
  };

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    // Backs off to 8s, then keeps retrying — a coach may simply have walked to
    // the far gate and out of range.
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 8000);
    this.reconnectAttempts++;
    this.log(`reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.openGatt();
        this.log('reconnect successful');
      } catch {
        if (!this.intentionalDisconnect) this.scheduleReconnect();
      }
    }, delay);
  }

  async disconnect(): Promise<void> {
    this.intentionalDisconnect = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    try { this.device?.gatt?.disconnect(); } catch { /* already gone */ }
    this.device?.removeEventListener('gattserverdisconnected', this.handleDisconnect);
    this.device = null;
    this.status = { ...INITIAL_STATUS };
    this.setConnection('disconnected');
    this.log('disconnected by user');
  }

  // ── Commands ──────────────────────────────────────────────────────────────
  // Single funnel, so validation and failure handling live in one place.

  private async send(command: string): Promise<void> {
    if (!this.cmdChar) throw new Error('Not connected to the gates.');
    await this.cmdChar.writeValue(new TextEncoder().encode(command));
    this.log(`sent ${command}`);
  }

  ping()          { return this.send('PING'); }
  requestStatus() { return this.send('STATUS'); }
  arm()           { return this.send('ARM'); }
  reset()         { return this.send('RESET'); }
  abort()         { return this.send('ABORT'); }

  async setDistance(metres: number): Promise<void> {
    // Validated here as well as in firmware — the coach gets an immediate,
    // legible error rather than a BAD_DIST fault a second later.
    if (!Number.isFinite(metres) || metres < 1 || metres > 500) {
      throw new Error('Distance must be between 1 and 500 metres.');
    }
    return this.send(`DIST|${Math.round(metres)}`);
  }
}

/** One manager per browser session. */
let instance: SpeedGateManager | null = null;
export function getSpeedGate(): SpeedGateManager {
  if (!instance) instance = new SpeedGateManager();
  return instance;
}
