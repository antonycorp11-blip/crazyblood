// Permanent upgrades bought with Ancestral Essence. Levels live in state.legacy and survive New Lineage.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { LEGACY_BY_ID, LEGACY_NODES, type LegacyEffect, type LegacyNode } from '../data/prestige';

const MULTIPLICATIVE: LegacyEffect[] = ['productionMult', 'humanCostMult', 'tankMult', 'sellPriceMult', 'contractGoldMult', 'contractTimeMult', 'essenceMult'];

export const LegacySystem = {
  level(id: string): number {
    return store.state.legacy[id] ?? 0;
  },

  cost(node: LegacyNode, level?: number): number {
    return Math.ceil(node.baseCost * Math.pow(node.costGrowth, level ?? this.level(node.id)));
  },

  isUnlocked(node: LegacyNode): boolean {
    return !node.requires || this.level(node.requires) > 0;
  },

  isMaxed(node: LegacyNode): boolean {
    return this.level(node.id) >= node.maxLevel;
  },

  canBuy(node: LegacyNode): boolean {
    return this.isUnlocked(node) && !this.isMaxed(node) && store.state.resources.essence >= this.cost(node);
  },

  buy(id: string): boolean {
    const node = LEGACY_BY_ID[id];
    if (!node || !this.canBuy(node)) return false;
    store.state.resources.essence -= this.cost(node);
    store.state.legacy[id] = this.level(id) + 1;
    bus.emit('legacy:bought', { id, level: store.state.legacy[id] });
    bus.emit('resources:changed');
    return true;
  },

  /** Combined value of an effect across the tree (1 for multiplicative with nothing bought, else 0). */
  effect(type: LegacyEffect, override?: { id: string; level: number }): number {
    const levelOf = (id: string) => (override?.id === id ? override.level : this.level(id));
    const nodes = LEGACY_NODES.filter((n) => n.effect === type);
    if (MULTIPLICATIVE.includes(type)) return nodes.reduce((acc, n) => acc * Math.pow(n.value, levelOf(n.id)), 1);
    if (type === 'startingGold') {
      return nodes.reduce((acc, n) => { const l = levelOf(n.id); return acc + (l > 0 ? n.value * Math.pow(4, l - 1) : 0); }, 0);
    }
    return nodes.reduce((acc, n) => acc + n.value * levelOf(n.id), 0);
  },

  has(type: LegacyEffect): boolean {
    return this.effect(type) > 0;
  },
};
