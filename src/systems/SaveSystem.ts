// Versioned saves behind a storage interface. localStorage today; cloud / ATHG / Supabase later just
// implement StorageAdapter (async on purpose, even though localStorage is sync).
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { SAVE_KEY, SAVE_VERSION } from '../core/Constants';
import { normalizeState, type GameState } from '../core/GameState';

export interface StorageAdapter {
  load(key: string): Promise<string | null>;
  save(key: string, data: string): Promise<void>;
  remove(key: string): Promise<void>;
  /** Best-effort synchronous write for beforeunload/pagehide, where awaiting is not possible. */
  saveSync?(key: string, data: string): void;
}

export class LocalStorageAdapter implements StorageAdapter {
  async load(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
  async save(key: string, data: string) { this.saveSync(key, data); }
  async remove(key: string) { try { localStorage.removeItem(key); } catch { /* storage blocked */ } }
  saveSync(key: string, data: string) { try { localStorage.setItem(key, data); } catch { /* quota / private mode */ } }
}

interface SaveEnvelope { v: number; at: number; state: GameState }

// Migrations run in order from the save's version up to SAVE_VERSION. Each gets the raw state object.
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;
const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: example slot. Add entries as the format evolves.
};

function migrate(env: SaveEnvelope): GameState {
  let raw = env.state as unknown as Record<string, unknown>;
  for (let v = env.v; v < SAVE_VERSION; v++) raw = MIGRATIONS[v]?.(raw) ?? raw;
  return normalizeState(raw as Partial<GameState>);
}

function encode(text: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(text)));
}
function decode(b64: string): string {
  return new TextDecoder().decode(Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0)));
}

let adapter: StorageAdapter = new LocalStorageAdapter();

export const SaveSystem = {
  setAdapter(a: StorageAdapter) { adapter = a; },

  serialize(): string {
    const s = store.state;
    s.lastSaveTimestamp = Date.now();
    const env: SaveEnvelope = { v: SAVE_VERSION, at: s.lastSaveTimestamp, state: s };
    return JSON.stringify(env);
  },

  parse(json: string): GameState | null {
    try {
      const env = JSON.parse(json) as SaveEnvelope;
      if (!env || typeof env !== 'object' || typeof env.v !== 'number' || !env.state) return null;
      return migrate(env);
    } catch {
      return null;
    }
  },

  async load(): Promise<GameState | null> {
    const json = await adapter.load(SAVE_KEY);
    return json ? this.parse(json) : null;
  },

  async hasSave(): Promise<boolean> {
    return (await adapter.load(SAVE_KEY)) !== null;
  },

  async save() {
    await adapter.save(SAVE_KEY, this.serialize());
    bus.emit('save:status', { ok: true, at: Date.now() });
  },

  saveSync() {
    const data = this.serialize();
    if (adapter.saveSync) adapter.saveSync(SAVE_KEY, data);
    else void adapter.save(SAVE_KEY, data);
  },

  exportSave(): string {
    return encode(this.serialize());
  },

  importSave(code: string): GameState | null {
    try { return this.parse(decode(code)); } catch { return null; }
  },

  async resetSave() {
    await adapter.remove(SAVE_KEY);
  },
};
