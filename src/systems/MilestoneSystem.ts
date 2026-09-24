import { store } from '../core/Store';
import { MILESTONE_BASE_MULT, milestoneThreshold, milestonesReached } from '../data/milestones';
import { LegacySystem } from './LegacySystem';

export const MilestoneSystem = {
  /** Multiplier each milestone grants (×2 by default, ×3 with Milestone Mastery). */
  perMilestone(): number {
    return MILESTONE_BASE_MULT + LegacySystem.effect('milestoneBonus');
  },

  reached(humans = store.state.humans): number {
    return milestonesReached(humans);
  },

  multiplier(humans = store.state.humans): number {
    return Math.pow(this.perMilestone(), this.reached(humans));
  },

  next(humans = store.state.humans): { at: number; prev: number } {
    const n = this.reached(humans);
    return { at: milestoneThreshold(n), prev: n === 0 ? 0 : milestoneThreshold(n - 1) };
  },
};
