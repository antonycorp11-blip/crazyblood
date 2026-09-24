// Mordecai's one-time nudges at key moments (after the tutorial). Each hint fires once per save and waits
// politely if he is already talking.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { ProductionSystem } from './ProductionSystem';
import { PrestigeSystem } from './PrestigeSystem';
import { TutorialSystem } from './TutorialSystem';

interface Pending { key: string; params?: Record<string, string | number>; stillValid?: () => boolean }
const queue: Pending[] = [];

function seen(key: string) { return store.state.flags.hints.includes(key); }

function request(key: string, params?: Record<string, string | number>, stillValid?: () => boolean) {
  if (seen(key) || queue.some((q) => q.key === key)) return;
  queue.push({ key, params, stillValid });
}

bus.on('hint', ({ key, params }) => request(key, params));
bus.on('milestone:reached', () => request('hint.milestone'));
bus.on('lineage:started', () => request('hint.lineage'));

export const HintSystem = {
  update() {
    const s = store.state;
    if (!s.tutorial.done) return;
    if (ProductionSystem.hasAutoCollect() && !ProductionSystem.hasDeliveryCart() && s.resources.gold >= 250) request('hint.cart', undefined, () => !ProductionSystem.hasDeliveryCart());
    if (ProductionSystem.overflowRatio() > 0.25) request('hint.overflow', undefined, () => ProductionSystem.overflowRatio() > 0.1);
    const gain = PrestigeSystem.essenceForReset();
    if (s.unlocks.legacy && gain >= 10 && s.lifetime.lineages === 0) request('hint.prestigeReady', { n: gain });

    // Drop hints that stopped being true while they waited in line (they may fire again later).
    while (queue[0]?.stillValid && !queue[0].stillValid()) queue.shift();
    const next = queue[0];
    if (next && TutorialSystem.say(next.key, next.params)) {
      queue.shift();
      s.flags.hints.push(next.key);
    }
  },
};
