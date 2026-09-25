import { RITUALS, UPGRADES, type UpgradeId } from './data';

const SAVE_KEY = 'hemofarm-colheita-v1';
const MAX_LEVEL = 10000;

export interface GameState {
  version: 1;
  blood: number;
  runHarvest: number;
  lifetimeHarvest: number;
  totalTaps: number;
  seals: number;
  upgrades: Record<UpgradeId, number>;
  sound: boolean;
}

export interface HarvestResult { amount: number; critical: boolean; combo: number }

function initialState(): GameState {
  return {
    version: 1, blood: 0, runHarvest: 0, lifetimeHarvest: 0, totalTaps: 0,
    seals: 0, upgrades: Object.fromEntries(UPGRADES.map((upgrade) => [upgrade.id, 0])) as Record<UpgradeId, number>, sound: true,
  };
}

function safeNumber(value: unknown, max = 1e300): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(value, max)) : 0;
}

function loadState(): GameState {
  const fresh = initialState();
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') as Partial<GameState> | null;
    if (!raw || raw.version !== 1) return fresh;
    for (const upgrade of UPGRADES) fresh.upgrades[upgrade.id] = Math.min(MAX_LEVEL, Math.floor(safeNumber(raw.upgrades?.[upgrade.id], MAX_LEVEL)));
    fresh.blood = safeNumber(raw.blood);
    fresh.runHarvest = safeNumber(raw.runHarvest);
    fresh.lifetimeHarvest = safeNumber(raw.lifetimeHarvest);
    fresh.totalTaps = safeNumber(raw.totalTaps);
    fresh.seals = Math.min(RITUALS.length, Math.floor(safeNumber(raw.seals, RITUALS.length)));
    fresh.sound = raw.sound !== false;
    return fresh;
  } catch { return fresh; }
}

export class IncrementalGame {
  state = loadState();
  combo = 0;
  charge = 0;
  surgeUntil = 0;
  lastTapAt = 0;

  get goal() { return RITUALS[this.state.seals] ?? null; }
  get completed() { return this.state.seals >= RITUALS.length; }
  get canRitual() { return !!this.goal && this.state.runHarvest >= this.goal.amount; }
  get permanentMultiplier() { return Math.pow(1.8, this.state.seals); }
  get baseTap() {
    return 1 + UPGRADES.filter((upgrade) => upgrade.effect === 'tap')
      .reduce((sum, upgrade) => sum + this.state.upgrades[upgrade.id] * upgrade.gain, 0);
  }
  get criticalChance() { return Math.min(0.65, 0.04 + this.state.upgrades.gloves * 0.02); }
  get criticalPower() { return 2 + this.state.upgrades.nectar * 0.5; }
  get comboBonus() { return 0.02 + this.state.upgrades.moonlight * 0.02; }
  get tapPower() { return Math.ceil(this.baseTap * this.permanentMultiplier); }

  harvest(now = Date.now()): HarvestResult {
    this.combo = now - this.lastTapAt <= 1800 ? Math.min(25, this.combo + 1) : 1;
    this.lastTapAt = now;
    const critical = Math.random() < this.criticalChance;
    const comboMultiplier = 1 + this.combo * this.comboBonus;
    const surgeMultiplier = this.surgeUntil > now ? 3 : 1;
    const amount = Math.max(1, Math.ceil(this.baseTap * this.permanentMultiplier * comboMultiplier * surgeMultiplier * (critical ? this.criticalPower : 1)));
    this.state.blood += amount;
    this.state.runHarvest += amount;
    this.state.lifetimeHarvest += amount;
    this.state.totalTaps++;
    if (this.surgeUntil <= now) this.charge = Math.min(30, this.charge + 1);
    return { amount, critical, combo: this.combo };
  }

  cost(id: UpgradeId): number {
    const upgrade = UPGRADES.find((item) => item.id === id)!;
    const cost = upgrade.baseCost * Math.pow(upgrade.growth, this.state.upgrades[id]);
    return Number.isFinite(cost) ? Math.floor(cost) : Infinity;
  }

  unlocked(id: UpgradeId): boolean {
    const upgrade = UPGRADES.find((item) => item.id === id)!;
    return this.state.lifetimeHarvest >= upgrade.unlockAt || this.state.upgrades[id] > 0;
  }

  buy(id: UpgradeId, quantity: 1 | 10 | 'max' = 1): number {
    if (!this.unlocked(id)) return 0;
    let bought = 0;
    const limit = quantity === 'max' ? 1000 : quantity;
    while (bought < limit && this.state.upgrades[id] < MAX_LEVEL) {
      const cost = this.cost(id);
      if (!Number.isFinite(cost) || this.state.blood < cost) break;
      this.state.blood -= cost;
      this.state.upgrades[id]++;
      bought++;
    }
    if (bought) this.save();
    return bought;
  }

  activateSurge(now = Date.now()): boolean {
    if (this.charge < 30 || this.surgeUntil > now) return false;
    this.charge = 0;
    this.surgeUntil = now + 12000;
    return true;
  }

  ritual(): boolean {
    if (!this.canRitual) return false;
    const previous = this.state;
    this.state = initialState();
    this.state.seals = previous.seals + 1;
    this.state.lifetimeHarvest = previous.lifetimeHarvest;
    this.state.totalTaps = previous.totalTaps;
    this.state.sound = previous.sound;
    this.combo = 0;
    this.charge = 0;
    this.surgeUntil = 0;
    this.save();
    return true;
  }

  save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch { /* private browsing */ }
  }

  reset() {
    this.state = initialState();
    this.combo = 0;
    this.charge = 0;
    this.surgeUntil = 0;
    this.save();
  }
}
