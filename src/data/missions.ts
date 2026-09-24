// Main objective chain shown on the Farm. "Delta" goals count from the moment the mission starts.
// Essence here is a small taste of the permanent currency; New Lineage is the real source.
import type { UpgradeId } from './upgrades';

export type MissionGoal =
  | { type: 'collectBlood'; amount: number } // delta of stats.bloodCollected
  | { type: 'ownHumans'; amount: number }
  | { type: 'upgradeLevel'; upgrade: UpgradeId; level: number }
  | { type: 'completeContracts'; amount: number } // delta
  | { type: 'productionRate'; amount: number } // blood/s
  | { type: 'lineages'; amount: number }; // lifetime New Lineages

export interface MissionDef {
  id: string;
  textKey: string;
  goal: MissionGoal;
  reward: { gold?: number; essence?: number };
}

export const MISSIONS: MissionDef[] = [
  { id: 'collect_50', textKey: 'mission.collectBlood', goal: { type: 'collectBlood', amount: 50 }, reward: { gold: 25 } },
  { id: 'humans_3', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 3 }, reward: { gold: 40 } },
  { id: 'auto_collect', textKey: 'mission.autoCollect', goal: { type: 'upgradeLevel', upgrade: 'auto_collect', level: 1 }, reward: { gold: 100 } },
  { id: 'first_contract', textKey: 'mission.completeContracts', goal: { type: 'completeContracts', amount: 1 }, reward: { essence: 1 } },
  { id: 'humans_10', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 10 }, reward: { gold: 400 } },
  { id: 'delivery_cart', textKey: 'mission.deliveryCart', goal: { type: 'upgradeLevel', upgrade: 'delivery_cart', level: 1 }, reward: { gold: 300 } },
  { id: 'collect_10000', textKey: 'mission.collectBlood', goal: { type: 'collectBlood', amount: 10_000 }, reward: { essence: 1 } },
  { id: 'humans_25', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 25 }, reward: { essence: 2 } },
  { id: 'contracts_5', textKey: 'mission.completeContracts', goal: { type: 'completeContracts', amount: 5 }, reward: { essence: 2 } },
  { id: 'production_500', textKey: 'mission.productionRate', goal: { type: 'productionRate', amount: 500 }, reward: { essence: 2 } },
  { id: 'humans_50', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 50 }, reward: { essence: 3 } },
  { id: 'lineage_1', textKey: 'mission.lineages', goal: { type: 'lineages', amount: 1 }, reward: { essence: 5 } },
  { id: 'humans_100', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 100 }, reward: { essence: 5 } },
  { id: 'production_100k', textKey: 'mission.productionRate', goal: { type: 'productionRate', amount: 100_000 }, reward: { essence: 5 } },
  { id: 'lineage_3', textKey: 'mission.lineages', goal: { type: 'lineages', amount: 3 }, reward: { essence: 10 } },
  { id: 'humans_200', textKey: 'mission.ownHumans', goal: { type: 'ownHumans', amount: 200 }, reward: { essence: 10 } },
  { id: 'production_1b', textKey: 'mission.productionRate', goal: { type: 'productionRate', amount: 1e9 }, reward: { essence: 20 } },
  { id: 'lineage_10', textKey: 'mission.lineages', goal: { type: 'lineages', amount: 10 }, reward: { essence: 50 } },
];
