// Mordecai's onboarding. Each step: a line, an optional highlight target, and the condition that
// advances it. `showWhen` lets a step wait silently until it is relevant (no nagging).
import type { GameState } from '../core/GameState';
import { capacityForEstateLevel } from './progression';

/** DOM targets use data-tut="…"; 'world:tank' is highlighted inside the farm scene. */
export type TutorialTarget =
  | 'world:tank' | 'sell' | 'card:buy_human' | 'card:expand_estate' | 'card:auto_collect'
  | 'nav:market' | 'nav:upgrades' | 'contract:0' | 'contract:any';

export interface TutorialStep {
  id: string;
  lineKey: string;
  /** Short reaction line shown when the step completes. */
  doneKey?: string;
  target?: TutorialTarget;
  /** Steps without a condition advance when the player taps the bubble. */
  complete?: (s: GameState) => boolean;
  showWhen?: (s: GameState) => boolean;
  onStart?: (s: GameState) => void;
}

export const TUTORIAL: TutorialStep[] = [
  { id: 'welcome', lineKey: 'tut.welcome' },
  { id: 'gerald', lineKey: 'tut.gerald' },
  { id: 'collect', lineKey: 'tut.collect', target: 'world:tank', complete: (s) => s.stats.manualCollects >= 1 },
  { id: 'sell', lineKey: 'tut.sell', target: 'sell', complete: (s) => s.stats.goldEarned > 0 },
  {
    id: 'buy_human', lineKey: 'tut.buyHuman', doneKey: 'tut.buyHuman.done', target: 'card:buy_human',
    complete: (s) => s.humans >= 2,
  },
  {
    id: 'expand', lineKey: 'tut.expand', doneKey: 'tut.expand.done', target: 'card:expand_estate',
    showWhen: (s) => s.humans >= capacityForEstateLevel(s.upgrades.expand_estate) || s.upgrades.expand_estate > 0,
    complete: (s) => s.upgrades.expand_estate >= 1,
  },
  {
    id: 'auto_collect', lineKey: 'tut.autoCollect', doneKey: 'tut.autoCollect.done', target: 'card:auto_collect',
    complete: (s) => s.upgrades.auto_collect >= 1,
  },
  {
    id: 'market', lineKey: 'tut.market', target: 'nav:market',
    onStart: (s) => { s.unlocks.market = true; },
    complete: (s) => s.flags.marketOpened,
  },
  { id: 'accept', lineKey: 'tut.accept', target: 'contract:0', complete: (s) => s.stats.contractsAccepted >= 1 },
  { id: 'deliver', lineKey: 'tut.deliver', doneKey: 'tut.deliver.done', target: 'contract:any', complete: (s) => s.stats.contractsCompleted >= 1 },
  { id: 'upgrades', lineKey: 'tut.upgrades', target: 'nav:upgrades', complete: (s) => s.flags.upgradesOpened },
  { id: 'farewell', lineKey: 'tut.farewell' },
];
