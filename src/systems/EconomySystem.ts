// Time-based economy. Everything is driven by elapsed seconds, never by frames, so the same code
// serves the live loop, background catch-up and offline progress.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { ProductionSystem } from './ProductionSystem';

export interface SimulationResult { produced: number; collected: number; sold: number; gold: number; tankGain: number }

let collectTimer = 0;
let lastTankFull = false;

export const EconomySystem = {
  canAfford(gold: number): boolean {
    return store.state.resources.gold >= gold;
  },

  spendGold(gold: number) {
    store.state.resources.gold = Math.max(0, store.state.resources.gold - gold);
  },

  addGold(gold: number) {
    store.state.resources.gold += gold;
    store.state.stats.goldEarned += gold;
  },

  addEssence(n: number) {
    store.state.resources.essence += n;
    store.state.lifetime.essenceEarned += n;
  },

  addBlood(amount: number) {
    store.state.resources.blood += amount;
    store.state.stats.bloodCollected += amount;
  },

  /** Blood kept out of auto-selling because accepted contracts still need it. */
  reservedBlood(): number {
    return store.state.contracts.slots
      .filter((c) => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.items.filter((i) => i.item === 'blood').reduce((a, i) => a + i.qty, 0), 0);
  },

  /** Adds produced blood to the tank, clamped to capacity. Returns what fit. */
  produceIntoTank(amount: number): number {
    const s = store.state;
    s.stats.bloodProduced += amount;
    s.lifetime.bloodProduced += amount;
    const room = Math.max(0, ProductionSystem.tankCapacity() - s.tank);
    const stored = Math.min(room, amount);
    s.tank += stored;
    return stored;
  },

  collectTank(manual: boolean): number {
    const s = store.state;
    const amount = s.tank;
    if (amount <= 0) return 0;
    s.tank = 0;
    this.addBlood(amount);
    if (manual) s.stats.manualCollects++;
    bus.emit('blood:collected', { amount, manual });
    this.autoSell();
    bus.emit('resources:changed');
    return amount;
  },

  /** Delivery Cart: everything above the contract reserve goes to market. */
  autoSell(): number {
    if (!ProductionSystem.isAutoSelling()) return 0;
    const surplus = store.state.resources.blood - this.reservedBlood();
    return surplus > 0 ? this.sell(surplus, true) : 0;
  },

  sell(amount: number, silent = false): number {
    const s = store.state;
    const qty = Math.min(amount, s.resources.blood);
    if (qty <= 0) return 0;
    s.resources.blood -= qty;
    const gold = qty * ProductionSystem.sellPrice();
    this.addGold(gold);
    if (!silent) {
      bus.emit('blood:sold', { amount: qty, gold });
      bus.emit('resources:changed');
    }
    return gold;
  },

  sellAll(): number {
    return this.sell(store.state.resources.blood);
  },

  isTankFull(): boolean {
    return store.state.tank >= ProductionSystem.tankCapacity() - 1e-9;
  },

  /** Live tick. */
  tick(dt: number) {
    const s = store.state;
    s.stats.playTimeSec += dt;
    this.produceIntoTank(ProductionSystem.bloodPerSecond() * dt);

    const interval = ProductionSystem.collectInterval();
    if (Number.isFinite(interval)) {
      collectTimer += dt;
      if (collectTimer >= interval) {
        collectTimer %= interval;
        this.collectTank(false);
      }
    } else {
      collectTimer = 0;
    }

    const full = this.isTankFull();
    if (full !== lastTankFull) {
      lastTankFull = full;
      bus.emit('resources:changed');
    }
  },

  /**
   * Closed-form catch-up for long gaps (offline / backgrounded). With auto-collect, what the tank can pass
   * per trip reaches the stockpile (and the cart sells the surplus); without it only the tank fills.
   */
  simulate(seconds: number, efficiency: number): SimulationResult {
    const s = store.state;
    const produced = ProductionSystem.bloodPerSecond() * seconds * efficiency;
    s.stats.playTimeSec += seconds;
    if (!ProductionSystem.hasAutoCollect()) {
      const before = s.tank;
      this.produceIntoTank(produced);
      bus.emit('resources:changed');
      return { produced, collected: 0, sold: 0, gold: 0, tankGain: s.tank - before };
    }
    s.stats.bloodProduced += produced;
    s.lifetime.bloodProduced += produced;
    const collected = Math.min(produced, ProductionSystem.collectedPerSecond() * seconds * efficiency);
    this.addBlood(collected);
    const goldBefore = s.resources.gold;
    const bloodBefore = s.resources.blood;
    this.autoSell();
    bus.emit('resources:changed');
    return { produced, collected, sold: bloodBefore - s.resources.blood, gold: s.resources.gold - goldBefore, tankGain: 0 };
  },
};
