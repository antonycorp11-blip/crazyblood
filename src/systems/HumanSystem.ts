import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { Analytics } from '../core/Analytics';
import { humanCost } from '../data/progression';
import { EconomySystem } from './EconomySystem';
import { ProductionSystem } from './ProductionSystem';
import { LegacySystem } from './LegacySystem';
import { MilestoneSystem } from './MilestoneSystem';

export type BuyAmount = 1 | 10 | 'max';

export const HumanSystem = {
  count(): number { return store.state.humans; },
  capacity(): number { return ProductionSystem.humanCapacity(); },
  room(): number { return Math.max(0, this.capacity() - this.count()); },
  isFull(): boolean { return this.room() <= 0; },

  cost(owned = store.state.humans): number {
    return Math.ceil(humanCost(owned) * LegacySystem.effect('humanCostMult'));
  },

  /** Total price of the next `n` humans. */
  costFor(n: number): number {
    let total = 0;
    for (let k = 0; k < n; k++) total += this.cost(store.state.humans + k);
    return total;
  },

  /** How many to buy for a given mode: ×1 / ×10 (partial if pens run out) / max affordable. */
  quantityFor(mode: BuyAmount): number {
    const room = this.room();
    if (mode !== 'max') return Math.min(mode, room);
    let n = 0, total = 0;
    const gold = store.state.resources.gold;
    while (n < room && n < 1000) {
      const c = this.cost(store.state.humans + n);
      if (total + c > gold) break;
      total += c; n++;
    }
    return Math.max(1, Math.min(n, room));
  },

  canBuy(n = 1): boolean {
    return n > 0 && this.room() >= n && EconomySystem.canAfford(this.costFor(n));
  },

  buy(n = 1): boolean {
    if (!this.canBuy(n)) return false;
    const before = store.state.humans;
    const milestonesBefore = MilestoneSystem.reached(before);
    EconomySystem.spendGold(this.costFor(n));
    store.state.humans += n;
    store.state.stats.humansBought += n;
    Analytics.track('human_bought', { total: store.state.humans, amount: n });
    bus.emit('human:bought', { total: store.state.humans });
    if (MilestoneSystem.reached() > milestonesBefore) {
      bus.emit('milestone:reached', { humans: MilestoneSystem.next(store.state.humans).prev, multiplier: MilestoneSystem.perMilestone() });
    }
    bus.emit('resources:changed');
    return true;
  },

  /** Tapping a human squeezes a little extra blood straight into the tank. */
  tap(): number {
    return EconomySystem.produceIntoTank(ProductionSystem.tapAmount());
  },
};
