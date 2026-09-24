// Typed, synchronous event bus. Systems emit, UI and the farm scene listen — neither side imports the other.
import type { ScreenId, LayoutMode } from './Constants';
import type { UpgradeId } from '../data/upgrades';

export interface Rect { x: number; y: number; w: number; h: number }

export interface GameEvents {
  'resources:changed': void;
  'blood:collected': { amount: number; manual: boolean };
  'blood:tapped': { amount: number; x: number; y: number };
  'blood:sold': { amount: number; gold: number };
  'human:bought': { total: number };
  'upgrade:bought': { id: UpgradeId; level: number };
  'contracts:changed': void;
  'contract:completed': { gold: number; essence: number };
  'mission:changed': void;
  'mission:claimed': { id: string };
  'unlock': { feature: 'market' | 'legacy' };
  'tutorial:changed': void;
  'screen:changed': { screen: ScreenId };
  'layout:changed': { mode: LayoutMode; farmArea: Rect };
  'settings:changed': void;
  'state:replaced': void;
  'save:status': { ok: boolean; at: number };
  'toast': { text: string; kind?: 'info' | 'reward' | 'error' };
  'offline:report': { seconds: number; blood: number; gold: number; tank: number };
  'debug:setStage': { stage: number | null };
  'milestone:reached': { humans: number; multiplier: number };
  'legacy:bought': { id: string; level: number };
  'lineage:started': { essence: number };
  'hint': { key: string; params?: Record<string, string | number> };
}

type Handler<T> = (payload: T) => void;

class EventBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, fn: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof GameEvents>(event: K, ...payload: GameEvents[K] extends void ? [] : [GameEvents[K]]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const fn of [...set]) (fn as Handler<GameEvents[K] | undefined>)(payload[0]);
  }
}

export const bus = new EventBus();
