// NPC clients and tradeable items. ContractSystem generates offers from this data only.
import type { AssetKey } from './assets';

export type ItemId = 'blood' | 'fine_blood' | 'royal_blood' | 'garlic';

export interface ItemDef {
  id: ItemId;
  nameKey: string;
  icon: AssetKey;
  /** Items not yet produced by the farm are listed for future content but never requested. */
  available: boolean;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  blood: { id: 'blood', nameKey: 'item.blood', icon: 'icon_blood', available: true },
  fine_blood: { id: 'fine_blood', nameKey: 'item.fineBlood', icon: 'icon_fine_blood', available: false },
  royal_blood: { id: 'royal_blood', nameKey: 'item.royalBlood', icon: 'icon_royal_blood', available: false },
  garlic: { id: 'garlic', nameKey: 'item.garlic', icon: 'icon_garlic', available: false },
};

export type Rarity = 'common' | 'rare' | 'epic';

export const RARITY = {
  common: { weight: 70, quantityMult: 1, rewardMult: 1, essence: [0, 0] },
  rare: { weight: 25, quantityMult: 1.6, rewardMult: 1.25, essence: [0, 1] },
  epic: { weight: 5, quantityMult: 2.5, rewardMult: 1.6, essence: [1, 2] },
} as const satisfies Record<Rarity, { weight: number; quantityMult: number; rewardMult: number; essence: readonly [number, number] }>;

export interface NpcDef {
  id: string;
  name: string; // proper noun, not localized
  titleKey: string;
  portrait: AssetKey;
  personality: string;
  dialogueKeys: string[];
  contractPreferences: {
    items: ItemId[];
    rewardMult: number;
    /** seconds of the farm's current production the order is sized to */
    productionSeconds: [number, number];
    durationSec: [number, number];
    rarityBias: number; // added to rare/epic weights
  };
  /** Client starts appearing after this many completed contracts. */
  unlockAfterContracts: number;
}

export const NPCS: NpcDef[] = [
  {
    id: 'lady_vespera',
    name: 'Lady Vespera',
    titleKey: 'npc.title.noble',
    portrait: 'npc_lady_vespera',
    personality: 'Elegant, demanding aristocrat. Never fully satisfied.',
    dialogueKeys: ['npc.vespera.1', 'npc.vespera.2', 'npc.vespera.3'],
    contractPreferences: { items: ['blood', 'fine_blood'], rewardMult: 1.1, productionSeconds: [50, 90], durationSec: [15 * 60, 90 * 60], rarityBias: 5 },
    unlockAfterContracts: 0,
  },
  {
    id: 'silas_blackbottle',
    name: 'Silas Blackbottle',
    titleKey: 'npc.title.shady',
    portrait: 'npc_silas_blackbottle',
    personality: 'Suspicious merchant. Fast deals, no receipts.',
    dialogueKeys: ['npc.silas.1', 'npc.silas.2', 'npc.silas.3'],
    contractPreferences: { items: ['blood', 'garlic'], rewardMult: 0.95, productionSeconds: [30, 60], durationSec: [10 * 60, 45 * 60], rarityBias: 0 },
    unlockAfterContracts: 0,
  },
  {
    id: 'count_drakan',
    name: 'Count Drakan',
    titleKey: 'npc.title.royal',
    portrait: 'npc_count_drakan',
    personality: 'Extremely arrogant noble. Big orders, big rewards.',
    dialogueKeys: ['npc.drakan.1', 'npc.drakan.2', 'npc.drakan.3'],
    contractPreferences: { items: ['blood', 'royal_blood'], rewardMult: 1.3, productionSeconds: [90, 160], durationSec: [60 * 60, 180 * 60], rarityBias: 12 },
    unlockAfterContracts: 0,
  },
  {
    id: 'dr_hematic',
    name: 'Dr. Hematic',
    titleKey: 'npc.title.scientist',
    portrait: 'npc_dr_hematic',
    personality: 'Vampire scientist. Wants samples for "research".',
    dialogueKeys: ['npc.hematic.1', 'npc.hematic.2'],
    contractPreferences: { items: ['blood', 'fine_blood'], rewardMult: 1.15, productionSeconds: [40, 80], durationSec: [20 * 60, 60 * 60], rarityBias: 8 },
    unlockAfterContracts: 3,
  },
  {
    id: 'baroness_nocturna',
    name: 'Baroness Nocturna',
    titleKey: 'npc.title.socialite',
    portrait: 'npc_baroness_nocturna',
    personality: 'Vampire socialite. Throws parties, orders in bulk.',
    dialogueKeys: ['npc.nocturna.1', 'npc.nocturna.2'],
    contractPreferences: { items: ['blood', 'fine_blood'], rewardMult: 1.2, productionSeconds: [80, 140], durationSec: [30 * 60, 120 * 60], rarityBias: 6 },
    unlockAfterContracts: 6,
  },
  {
    id: 'inspector_graves',
    name: 'Inspector Graves',
    titleKey: 'npc.title.bureaucrat',
    portrait: 'npc_inspector_graves',
    personality: 'Imperial bureaucrat. Pays in essence, demands paperwork.',
    dialogueKeys: ['npc.graves.1', 'npc.graves.2'],
    contractPreferences: { items: ['blood'], rewardMult: 0.9, productionSeconds: [60, 100], durationSec: [30 * 60, 90 * 60], rarityBias: 15 },
    unlockAfterContracts: 10,
  },
];

export const NPC_BY_ID = Object.fromEntries(NPCS.map((n) => [n.id, n])) as Record<string, NpcDef>;
