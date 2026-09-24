// Legacy tree. Nodes are bought with Ancestral Essence, survive New Lineage and have levels.
// Effects are generic (LegacyEffect) and read by the systems through LegacySystem.effect().
// Icons marked PLACEHOLDER reuse existing icons until the dedicated legacy_* icons exist (ASSETS.md §L).
import type { AssetKey } from './assets';

export type Branch = 'blood' | 'trade' | 'empire';

export type LegacyEffect =
  | 'productionMult' // ×value per level
  | 'humanCostMult' // ×value per level
  | 'startingHumans' // +value per level
  | 'processingBonus' // +value to Blood Processing's per-level multiplier
  | 'milestoneBonus' // +value to each milestone multiplier
  | 'tankMult' // ×value per level
  | 'sellPriceMult' // ×value per level
  | 'contractGoldMult' // ×value per level
  | 'startingGold' // value × 4^(level-1)
  | 'contractEssence' // +value per level on every contract
  | 'rarityBias' // +value per level
  | 'contractTimeMult' // ×value per level (refresh + refill timers)
  | 'startingAutoCollect' // +value levels of Auto Collect at lineage start
  | 'offlineEfficiency' // +value per level
  | 'offlineCapHours' // +value per level
  | 'autoContracts' // clerk accepts and delivers contracts
  | 'essenceMult' // ×value per level on New Lineage rewards
  | 'startingEstate'; // +value levels of Expand Estate at lineage start

export interface LegacyNode {
  id: string;
  branch: Branch;
  icon: AssetKey;
  row: number;
  col: 0 | 1;
  requires?: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effect: LegacyEffect;
  value: number;
}

export const LEGACY_BRANCHES: { id: Branch; nameKey: string; descKey: string; icon: AssetKey }[] = [
  { id: 'blood', nameKey: 'legacy.branch.blood', descKey: 'legacy.branch.blood.desc', icon: 'icon_blood' },
  { id: 'trade', nameKey: 'legacy.branch.trade', descKey: 'legacy.branch.trade.desc', icon: 'icon_ancestral_essence' },
  { id: 'empire', nameKey: 'legacy.branch.empire', descKey: 'legacy.branch.empire.desc', icon: 'nav_legacy' },
];

export const LEGACY_NODES: LegacyNode[] = [
  // Blood Production
  { id: 'vital_humors', branch: 'blood', icon: 'icon_blood', row: 0, col: 0, maxLevel: 10, baseCost: 1, costGrowth: 2, effect: 'productionMult', value: 1.25 },
  { id: 'old_blood', branch: 'blood', icon: 'upgrade_buy_human', row: 0, col: 1, requires: 'vital_humors', maxLevel: 5, baseCost: 2, costGrowth: 1.8, effect: 'startingHumans', value: 2 },
  { id: 'selective_breeding', branch: 'blood', icon: 'icon_population', row: 1, col: 0, requires: 'vital_humors', maxLevel: 5, baseCost: 3, costGrowth: 2, effect: 'humanCostMult', value: 0.9 },
  { id: 'sanguine_science', branch: 'blood', icon: 'upgrade_blood_processing', row: 1, col: 1, requires: 'old_blood', maxLevel: 5, baseCost: 5, costGrowth: 2, effect: 'processingBonus', value: 0.05 },
  { id: 'endless_vats', branch: 'blood', icon: 'upgrade_storage', row: 2, col: 0, requires: 'selective_breeding', maxLevel: 5, baseCost: 4, costGrowth: 2, effect: 'tankMult', value: 2 },
  { id: 'milestone_mastery', branch: 'blood', icon: 'icon_royal_blood', row: 2, col: 1, requires: 'sanguine_science', maxLevel: 1, baseCost: 25, costGrowth: 1, effect: 'milestoneBonus', value: 1 },
  // Trade & Contracts
  { id: 'silver_tongue', branch: 'trade', icon: 'icon_gold', row: 0, col: 0, maxLevel: 10, baseCost: 1, costGrowth: 2, effect: 'sellPriceMult', value: 1.2 },
  { id: 'inheritance', branch: 'trade', icon: 'upgrade_offline', row: 0, col: 1, requires: 'silver_tongue', maxLevel: 5, baseCost: 2, costGrowth: 1.8, effect: 'startingGold', value: 250 },
  { id: 'loyal_clientele', branch: 'trade', icon: 'upgrade_contracts', row: 1, col: 0, requires: 'silver_tongue', maxLevel: 5, baseCost: 3, costGrowth: 2, effect: 'contractGoldMult', value: 1.3 },
  { id: 'rare_tastes', branch: 'trade', icon: 'icon_fine_blood', row: 1, col: 1, requires: 'inheritance', maxLevel: 3, baseCost: 6, costGrowth: 2, effect: 'rarityBias', value: 10 },
  { id: 'old_friends', branch: 'trade', icon: 'icon_ancestral_essence', row: 2, col: 0, requires: 'loyal_clientele', maxLevel: 3, baseCost: 8, costGrowth: 2.5, effect: 'contractEssence', value: 1 },
  { id: 'swift_couriers', branch: 'trade', icon: 'upgrade_logistics', row: 2, col: 1, requires: 'rare_tastes', maxLevel: 3, baseCost: 5, costGrowth: 2, effect: 'contractTimeMult', value: 0.7 },
  // Empire Automation
  { id: 'tireless_servants', branch: 'empire', icon: 'upgrade_auto_collect', row: 0, col: 0, maxLevel: 3, baseCost: 2, costGrowth: 2, effect: 'startingAutoCollect', value: 1 },
  { id: 'night_shift', branch: 'empire', icon: 'icon_time', row: 0, col: 1, requires: 'tireless_servants', maxLevel: 5, baseCost: 2, costGrowth: 1.8, effect: 'offlineEfficiency', value: 0.1 },
  { id: 'long_night', branch: 'empire', icon: 'upgrade_offline', row: 1, col: 0, requires: 'tireless_servants', maxLevel: 4, baseCost: 3, costGrowth: 2, effect: 'offlineCapHours', value: 4 },
  { id: 'contract_clerk', branch: 'empire', icon: 'upgrade_contracts', row: 1, col: 1, requires: 'night_shift', maxLevel: 1, baseCost: 15, costGrowth: 1, effect: 'autoContracts', value: 1 },
  { id: 'dynasty', branch: 'empire', icon: 'nav_legacy', row: 2, col: 0, requires: 'long_night', maxLevel: 5, baseCost: 6, costGrowth: 2.5, effect: 'essenceMult', value: 1.2 },
  { id: 'estate_charter', branch: 'empire', icon: 'upgrade_expand_estate', row: 2, col: 1, requires: 'contract_clerk', maxLevel: 3, baseCost: 6, costGrowth: 2.5, effect: 'startingEstate', value: 1 },
];

export const LEGACY_BY_ID = Object.fromEntries(LEGACY_NODES.map((n) => [n.id, n])) as Record<string, LegacyNode>;
