// Data-driven upgrades. Effects are generic: each upgrade contributes `effectValue` per level to its
// `effectType`, combined by UpgradeSystem.getEffect(). Adding an upgrade = adding an entry here.
import type { AssetKey } from './assets';

export type EffectType =
  | 'productionMult' // multiplicative per level
  | 'collectSpeed' // auto-collect interval × value^(level-1); level 0 = manual only
  | 'humanCapacity' // uses the estate capacity table (see progression.ts)
  | 'tankCapacityMult' // multiplicative per level
  | 'sellPriceMult' // multiplicative per level
  | 'autoSell'; // level ≥ 1: collected blood is sold automatically (minus contract reserve)

export type UpgradeCategory = 'quick' | 'storage' | 'logistics';

export interface UpgradeDef {
  id: string;
  nameKey: string;
  descKey: string;
  icon: AssetKey;
  category: UpgradeCategory;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effectType: EffectType;
  effectValue: number;
}

export const UPGRADES = [
  {
    id: 'auto_collect',
    nameKey: 'upgrade.autoCollect.name',
    descKey: 'upgrade.autoCollect.desc',
    icon: 'upgrade_auto_collect',
    category: 'quick',
    maxLevel: 20,
    baseCost: 150,
    costGrowth: 1.6,
    effectType: 'collectSpeed',
    effectValue: 0.85,
  },
  {
    id: 'expand_estate',
    nameKey: 'upgrade.expandEstate.name',
    descKey: 'upgrade.expandEstate.desc',
    icon: 'upgrade_expand_estate',
    category: 'quick',
    maxLevel: 30,
    baseCost: 60,
    costGrowth: 2.8,
    effectType: 'humanCapacity',
    effectValue: 1,
  },
  {
    id: 'blood_processing',
    nameKey: 'upgrade.bloodProcessing.name',
    descKey: 'upgrade.bloodProcessing.desc',
    icon: 'upgrade_blood_processing',
    category: 'quick',
    maxLevel: 50,
    baseCost: 200,
    costGrowth: 2.1,
    effectType: 'productionMult',
    effectValue: 1.25,
  },
  {
    id: 'tank_storage',
    nameKey: 'upgrade.tankStorage.name',
    descKey: 'upgrade.tankStorage.desc',
    icon: 'upgrade_storage',
    category: 'storage',
    maxLevel: 60,
    baseCost: 80,
    costGrowth: 2.3,
    effectType: 'tankCapacityMult',
    effectValue: 2,
  },
  {
    id: 'merchant_relations',
    nameKey: 'upgrade.merchantRelations.name',
    descKey: 'upgrade.merchantRelations.desc',
    icon: 'upgrade_contracts',
    category: 'logistics',
    maxLevel: 40,
    baseCost: 150,
    costGrowth: 2.2,
    effectType: 'sellPriceMult',
    effectValue: 1.15,
  },
  {
    id: 'delivery_cart',
    nameKey: 'upgrade.deliveryCart.name',
    descKey: 'upgrade.deliveryCart.desc',
    icon: 'upgrade_logistics',
    category: 'logistics',
    maxLevel: 1,
    baseCost: 400,
    costGrowth: 1,
    effectType: 'autoSell',
    effectValue: 1,
  },
] as const satisfies readonly UpgradeDef[];

export type UpgradeId = (typeof UPGRADES)[number]['id'];

export const UPGRADE_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

