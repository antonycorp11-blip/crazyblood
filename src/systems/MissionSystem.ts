import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { MISSIONS, type MissionDef, type MissionGoal } from '../data/missions';
import { t } from '../data/localization';
import { formatNumber } from '../utils/format';
import { EconomySystem } from './EconomySystem';
import { ProductionSystem } from './ProductionSystem';

function baselineFor(goal: MissionGoal): number {
  const st = store.state.stats;
  if (goal.type === 'collectBlood') return st.bloodCollected;
  if (goal.type === 'completeContracts') return st.contractsCompleted;
  return 0;
}

export const MissionSystem = {
  current(): MissionDef | null {
    return MISSIONS[store.state.mission.index] ?? null;
  },

  progress(): { value: number; target: number } {
    const m = this.current();
    if (!m) return { value: 1, target: 1 };
    const s = store.state;
    const g = m.goal;
    const base = s.mission.baseline;
    switch (g.type) {
      case 'collectBlood': return { value: s.stats.bloodCollected - base, target: g.amount };
      case 'ownHumans': return { value: s.humans, target: g.amount };
      case 'upgradeLevel': return { value: s.upgrades[g.upgrade], target: g.level };
      case 'completeContracts': return { value: s.stats.contractsCompleted - base, target: g.amount };
      case 'productionRate': return { value: ProductionSystem.bloodPerSecond(), target: g.amount };
      case 'lineages': return { value: s.lifetime.lineages, target: g.amount };
    }
  },

  text(): string {
    const m = this.current();
    if (!m) return t('mission.allDone');
    const g = m.goal;
    const n = 'amount' in g ? formatNumber(g.amount) : '';
    return t(m.textKey, { n });
  },

  update() {
    const s = store.state;
    if (!this.current() || s.mission.complete) return;
    const p = this.progress();
    if (p.value >= p.target) {
      s.mission.complete = true;
      bus.emit('mission:changed');
      bus.emit('toast', { text: t('toast.missionDone'), kind: 'reward' });
    }
  },

  claim(): boolean {
    const s = store.state;
    const m = this.current();
    if (!m || !s.mission.complete) return false;
    if (m.reward.gold) EconomySystem.addGold(m.reward.gold);
    if (m.reward.essence) EconomySystem.addEssence(m.reward.essence);
    s.mission.index++;
    s.mission.complete = false;
    const next = this.current();
    s.mission.baseline = next ? baselineFor(next.goal) : 0;
    bus.emit('mission:claimed', { id: m.id });
    bus.emit('mission:changed');
    bus.emit('resources:changed');
    return true;
  },
};
