import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { Analytics } from '../core/Analytics';
import { UPGRADES, UPGRADE_BY_ID, type EffectType, type UpgradeId } from '../data/upgrades';
import { capacityForEstateLevel } from '../data/progression';
import { EconomySystem } from './EconomySystem';
import { LegacySystem } from './LegacySystem';

const MULTIPLICATIVE: EffectType[] = ['productionMult', 'tankCapacityMult', 'sellPriceMult'];

export const UpgradeSystem = {
  level(id: UpgradeId): number {
    return store.state.upgrades[id] ?? 0;
  },

  isMaxed(id: UpgradeId): boolean {
    return this.level(id) >= UPGRADE_BY_ID[id].maxLevel;
  },

  cost(id: UpgradeId, level?: number): number {
    const def = UPGRADE_BY_ID[id];
    return Math.ceil(def.baseCost * Math.pow(def.costGrowth, level ?? this.level(id)));
  },

  canBuy(id: UpgradeId): boolean {
    return !this.isMaxed(id) && EconomySystem.canAfford(this.cost(id));
  },

  buy(id: UpgradeId): boolean {
    if (!this.canBuy(id)) return false;
    EconomySystem.spendGold(this.cost(id));
    const level = ++store.state.upgrades[id];
    Analytics.track('upgrade_bought', { id, level });
    bus.emit('upgrade:bought', { id, level });
    bus.emit('resources:changed');
    return true;
  },

  /**
   * Combined value of an effect type across all upgrades, optionally as if `override` levels applied
   * (used by cards to preview "next level").
   */
  getEffect(type: EffectType, override?: { id: UpgradeId; level: number }): number {
    const levelOf = (id: UpgradeId) => (override?.id === id ? override.level : this.level(id));
    const defs = UPGRADES.filter((u) => u.effectType === type);
    if (MULTIPLICATIVE.includes(type)) {
      // Legacy "Sanguine Science" strengthens Blood Processing's per-level multiplier.
      const bonus = type === 'productionMult' ? LegacySystem.effect('processingBonus') : 0;
      return defs.reduce((acc, u) => acc * Math.pow(u.effectValue + bonus, levelOf(u.id)), 1);
    }
    switch (type) {
      case 'collectSpeed': {
        // Returns the interval multiplier; 0 means "no automation".
        const lvl = defs.reduce((a, u) => a + levelOf(u.id), 0);
        return lvl <= 0 ? 0 : Math.pow(defs[0].effectValue, lvl - 1);
      }
      case 'humanCapacity':
        return capacityForEstateLevel(defs.reduce((a, u) => a + levelOf(u.id), 0));
      case 'autoSell':
        return defs.some((u) => levelOf(u.id) > 0) ? 1 : 0;
      default:
        return 0;
    }
  },
};
