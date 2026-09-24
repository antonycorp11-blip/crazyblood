// New Lineage: reset the farm, keep Ancestral Essence + Legacy tree, start again stronger.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { Analytics } from '../core/Analytics';
import { createNewState } from '../core/GameState';
import { Progression, capacityForEstateLevel } from '../data/progression';
import { t } from '../data/localization';
import { LegacySystem } from './LegacySystem';

export const PrestigeSystem = {
  /** Essence a reset would grant now. Tune the curve in progression.ts. */
  essenceForReset(bloodProduced = store.state.stats.bloodProduced): number {
    const base = Math.floor(Math.pow(bloodProduced / Progression.prestigeThreshold, Progression.prestigeExponent));
    return Math.floor(base * LegacySystem.effect('essenceMult'));
  },

  /** Blood (this lineage) needed for the next +1 essence — shown as "next essence at…". */
  nextEssenceAt(): number {
    const mult = LegacySystem.effect('essenceMult');
    const target = Math.floor(this.essenceForReset() / mult) + 1;
    return Math.pow(target, 1 / Progression.prestigeExponent) * Progression.prestigeThreshold;
  },

  unlockProgress(): number {
    return Math.min(1, store.state.stats.bloodProduced / Progression.legacyUnlockTotalBlood);
  },

  update() {
    const s = store.state;
    if (!s.unlocks.legacy && s.stats.bloodProduced >= Progression.legacyUnlockTotalBlood) {
      s.unlocks.legacy = true;
      bus.emit('unlock', { feature: 'legacy' });
      bus.emit('toast', { text: t('toast.legacyUnlocked'), kind: 'reward' });
      bus.emit('hint', { key: 'hint.legacy' });
    }
  },

  canPrestige(): boolean {
    return store.state.unlocks.legacy && this.essenceForReset() > 0;
  },

  /**
   * Keeps: essence, legacy tree, lifetime stats, settings, unlocks, tutorial/mission progress, hints.
   * Legacy starting bonuses are applied to the fresh farm.
   */
  performReset() {
    if (!this.canPrestige()) return;
    const old = store.state;
    const gained = this.essenceForReset();
    const next = createNewState(Date.now(), old.settings);
    next.resources.essence = old.resources.essence + gained;
    next.legacy = { ...old.legacy };
    next.autoSell = old.autoSell;
    next.lifetime = { ...old.lifetime, lineages: old.lifetime.lineages + 1, essenceEarned: old.lifetime.essenceEarned + gained };
    next.unlocks = { ...old.unlocks };
    next.flags = { ...old.flags, hints: [...old.flags.hints] };
    next.tutorial = { step: old.tutorial.step, done: true };
    next.mission = { ...old.mission, baseline: 0, complete: false };

    // Legacy starting bonuses read the tree, which lives on `next` — swap it in before querying.
    store.state = next;
    next.humans += LegacySystem.effect('startingHumans');
    next.resources.gold += LegacySystem.effect('startingGold');
    next.upgrades.auto_collect = LegacySystem.effect('startingAutoCollect');
    let estate = LegacySystem.effect('startingEstate');
    while (capacityForEstateLevel(estate) < next.humans) estate++;
    next.upgrades.expand_estate = estate;

    Analytics.track('prestige_completed', { essence: gained, lineage: next.lifetime.lineages });
    store.replace(next);
    bus.emit('lineage:started', { essence: gained });
  },
};
