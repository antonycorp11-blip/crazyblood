// Derived rates. Pure reads of the state — safe to call every frame.
import { store } from '../core/Store';
import { Progression } from '../data/progression';
import type { UpgradeId } from '../data/upgrades';
import { UpgradeSystem } from './UpgradeSystem';
import { LegacySystem } from './LegacySystem';
import { MilestoneSystem } from './MilestoneSystem';

type Override = { id: UpgradeId; level: number };

export const ProductionSystem = {
  /** production = humans × perHuman × globalMultiplier × milestones × prestigeMultiplier × temporaryMultiplier */
  bloodPerSecond(override?: Override, humans = store.state.humans): number {
    return humans * Progression.baseBloodPerHuman * this.globalMultiplier(override) * MilestoneSystem.multiplier(humans)
      * this.prestigeMultiplier() * this.temporaryMultiplier();
  },

  /** Production gained from one more human (includes the milestone jump if the next one crosses it). */
  marginalPerHuman(): number {
    const h = store.state.humans;
    return this.bloodPerSecond(undefined, h + 1) - this.bloodPerSecond(undefined, h);
  },

  globalMultiplier(override?: Override): number {
    return UpgradeSystem.getEffect('productionMult', override);
  },

  prestigeMultiplier(): number { return LegacySystem.effect('productionMult'); },
  // Hook for events like Blood Moon (0.5).
  temporaryMultiplier(): number { return 1; },

  tankCapacity(override?: Override): number {
    return Math.floor(Progression.baseTankCapacity * UpgradeSystem.getEffect('tankCapacityMult', override) * LegacySystem.effect('tankMult'));
  },

  /** Seconds between automatic collections, or Infinity when collection is manual. */
  collectInterval(override?: Override): number {
    const m = UpgradeSystem.getEffect('collectSpeed', override);
    return m === 0 ? Infinity : Math.max(0.5, Progression.autoCollectBaseInterval * m);
  },

  hasAutoCollect(): boolean {
    return Number.isFinite(this.collectInterval());
  },

  hasDeliveryCart(): boolean {
    return UpgradeSystem.getEffect('autoSell') > 0;
  },

  isAutoSelling(): boolean {
    return this.hasDeliveryCart() && store.state.autoSell;
  },

  sellPrice(override?: Override): number {
    return Progression.baseSellPrice * UpgradeSystem.getEffect('sellPriceMult', override) * LegacySystem.effect('sellPriceMult');
  },

  humanCapacity(override?: Override): number {
    return UpgradeSystem.getEffect('humanCapacity', override);
  },

  /**
   * What auto-collect actually moves per second. The tank only holds `capacity` between two trips, so a
   * small tank caps income — the "overflow" the player fixes with Bigger Tank.
   */
  collectedPerSecond(override?: Override): number {
    if (!this.hasAutoCollect()) return 0;
    return Math.min(this.bloodPerSecond(), this.tankCapacity(override) / this.collectInterval(override));
  },

  overflowPerSecond(): number {
    if (!this.hasAutoCollect()) return 0;
    return Math.max(0, this.bloodPerSecond() - this.collectedPerSecond());
  },

  /** Share of production being wasted (0..1). */
  overflowRatio(): number {
    const p = this.bloodPerSecond();
    return p > 0 ? this.overflowPerSecond() / p : 0;
  },

  goldPerSecond(): number {
    return this.isAutoSelling() ? this.collectedPerSecond() * this.sellPrice() : 0;
  },

  tapAmount(): number {
    return Progression.manualTapBlood * this.globalMultiplier() * MilestoneSystem.multiplier() * this.prestigeMultiplier();
  },
};
