// Every balance knob that is not per-upgrade lives here. Tune freely; nothing else hardcodes these.
export const Progression = {
  startingHumans: 1,
  startingGold: 0,

  baseBloodPerHuman: 1, // per second
  humanBaseCost: 25,
  humanCostGrowth: 1.17,

  // Human capacity by Expand Estate level (index = level). Past the table: +30 per level.
  capacityByEstateLevel: [2, 5, 10, 16, 24, 34, 46, 60, 80, 100, 125, 150, 180, 220, 270, 330],
  capacityPastTable: 60,

  baseTankCapacity: 50,
  baseSellPrice: 1, // gold per blood
  manualTapBlood: 1, // tapping a human squeezes this much (× production multipliers) into the tank
  humanTapCooldownSec: 1.2,

  autoCollectBaseInterval: 5, // seconds between automatic tank collections at level 1

  offlineEfficiency: 0.5,
  offlineCapSec: 8 * 3600,

  // Market
  marketUnlockBloodCollected: 250, // safety net if the tutorial is skipped
  contractSlots: 3,
  contractFreeRefreshSec: 30 * 60,
  contractRefillDelaySec: 20,
  contractPaidRefreshBase: 50,
  contractPriceMultiplier: 2.2, // contracts pay this × the plain sell price
  contractMinQuantity: 20,

  // Legacy (prestige) — locked in 0.1, formula already centralized.
  legacyUnlockTotalBlood: 1_000_000,
  // essence = floor((bloodProduced / threshold) ^ exponent)
  prestigeThreshold: 50_000,
  prestigeExponent: 0.45,

  // Farm visual stages, by humans owned. Index = stage.
  stageHumanThresholds: [0, 4, 10, 30, 100, 300],
} as const;

export function humanCost(owned: number): number {
  // First human is free (starting worker), so the price curve starts on the 2nd.
  const bought = Math.max(0, owned - Progression.startingHumans);
  return Math.ceil(Progression.humanBaseCost * Math.pow(Progression.humanCostGrowth, bought));
}

export function capacityForEstateLevel(level: number): number {
  const t = Progression.capacityByEstateLevel;
  if (level < t.length) return t[level];
  return t[t.length - 1] + (level - t.length + 1) * Progression.capacityPastTable;
}
