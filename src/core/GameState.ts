// The whole game is this one plain, JSON-serializable object. Systems mutate it; nothing visual is stored
// here if it can be derived (farm stage, capacity, rates are all computed on demand).
import { SAVE_VERSION } from './Constants';
import { Progression } from '../data/progression';
import { UPGRADES, type UpgradeId } from '../data/upgrades';
import type { ItemId, Rarity } from '../data/contracts';
import type { Locale } from '../data/localization';

export type ContractStatus = 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';

export interface ContractInstance {
  uid: number;
  npcId: string;
  items: { item: ItemId; qty: number }[];
  rewardGold: number;
  rewardEssence: number;
  durationSec: number;
  rarity: Rarity;
  dialogueKey: string;
  status: ContractStatus;
  /** Epoch ms. ACTIVE: deadline. COMPLETED/EXPIRED: when the slot refills. */
  until: number;
}

export interface Settings {
  master: number;
  music: boolean;
  sfx: boolean;
  language: Locale;
  reducedEffects: boolean;
}

export interface GameState {
  saveVersion: number;
  createdAt: number;
  lastSaveTimestamp: number;

  resources: { blood: number; gold: number; essence: number };
  /** Blood produced but not yet collected, sitting in the tank. */
  tank: number;
  humans: number;
  upgrades: Record<UpgradeId, number>;
  /** Legacy tree levels by node id. Survives New Lineage. */
  legacy: Record<string, number>;
  /** Player toggle for the Delivery Cart's automatic selling. */
  autoSell: boolean;

  stats: {
    bloodProduced: number;
    bloodCollected: number;
    goldEarned: number;
    humansBought: number;
    manualCollects: number;
    contractsAccepted: number;
    contractsCompleted: number;
    playTimeSec: number;
  };
  /** Survives New Lineage. */
  lifetime: { bloodProduced: number; lineages: number; essenceEarned: number };

  unlocks: { market: boolean; legacy: boolean };
  flags: { marketOpened: boolean; upgradesOpened: boolean; legacyTeased: boolean; hints: string[] };

  mission: { index: number; baseline: number; complete: boolean };
  contracts: { slots: ContractInstance[]; nextFreeRefreshAt: number; nextUid: number };
  tutorial: { step: number; done: boolean };

  settings: Settings;
}

export function defaultLocale(): Locale {
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US';
}

export function createNewState(now = Date.now(), settings?: Settings): GameState {
  const upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, 0])) as Record<UpgradeId, number>;
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    lastSaveTimestamp: now,
    resources: { blood: 0, gold: Progression.startingGold, essence: 0 },
    tank: 0,
    humans: Progression.startingHumans,
    upgrades,
    legacy: {},
    autoSell: true,
    stats: {
      bloodProduced: 0, bloodCollected: 0, goldEarned: 0, humansBought: 0, manualCollects: 0,
      contractsAccepted: 0, contractsCompleted: 0, playTimeSec: 0,
    },
    lifetime: { bloodProduced: 0, lineages: 0, essenceEarned: 0 },
    unlocks: { market: false, legacy: false },
    flags: { marketOpened: false, upgradesOpened: false, legacyTeased: false, hints: [] },
    mission: { index: 0, baseline: 0, complete: false },
    contracts: { slots: [], nextFreeRefreshAt: 0, nextUid: 1 },
    tutorial: { step: 0, done: false },
    settings: settings ?? { master: 0.8, music: true, sfx: true, language: defaultLocale(), reducedEffects: false },
  };
}

/**
 * Fills fields missing from older/partial saves with defaults. Keeps saves forward-compatible for
 * additive changes; structural changes go through SaveSystem migrations.
 */
export function normalizeState(raw: Partial<GameState>): GameState {
  const base = createNewState(raw.createdAt ?? Date.now());
  const merge = <T extends object>(def: T, val: unknown): T =>
    val && typeof val === 'object' && !Array.isArray(val) ? { ...def, ...(val as Partial<T>) } : def;
  return {
    ...base,
    ...raw,
    resources: merge(base.resources, raw.resources),
    upgrades: merge(base.upgrades, raw.upgrades),
    legacy: merge(base.legacy, raw.legacy),
    stats: merge(base.stats, raw.stats),
    lifetime: merge(base.lifetime, raw.lifetime),
    unlocks: merge(base.unlocks, raw.unlocks),
    flags: merge(base.flags, raw.flags),
    mission: merge(base.mission, raw.mission),
    contracts: merge(base.contracts, raw.contracts),
    tutorial: merge(base.tutorial, raw.tutorial),
    settings: merge(base.settings, raw.settings),
    saveVersion: SAVE_VERSION,
  };
}
