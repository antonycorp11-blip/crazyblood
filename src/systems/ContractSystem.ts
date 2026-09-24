// Market contracts: 3 slots cycling AVAILABLE → ACTIVE → COMPLETED/EXPIRED → (refill) AVAILABLE.
// Offers are generated purely from data/contracts.ts and sized to the farm's current production.
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { Analytics } from '../core/Analytics';
import type { ContractInstance } from '../core/GameState';
import { ITEMS, NPCS, RARITY, type ItemId, type NpcDef, type Rarity } from '../data/contracts';
import { Progression } from '../data/progression';
import { EconomySystem } from './EconomySystem';
import { ProductionSystem } from './ProductionSystem';
import { LegacySystem } from './LegacySystem';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Rounds to 2 significant digits so orders read like "450", "1.2K" instead of "447". */
function niceRound(n: number): number {
  if (n < 10) return Math.max(1, Math.round(n));
  const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

function rollRarity(bias: number): Rarity {
  const w = { common: RARITY.common.weight, rare: RARITY.rare.weight + bias * 0.7, epic: RARITY.epic.weight + bias * 0.3 };
  let r = Math.random() * (w.common + w.rare + w.epic);
  for (const k of ['common', 'rare', 'epic'] as const) {
    if ((r -= w[k]) <= 0) return k;
  }
  return 'common';
}

function availableItem(pref: ItemId[]): ItemId {
  const ok = pref.filter((i) => ITEMS[i].available);
  return ok.length ? pick(ok) : 'blood';
}

export const ContractSystem = {
  slots(): ContractInstance[] { return store.state.contracts.slots; },

  availableNpcs(): NpcDef[] {
    return NPCS.filter((n) => store.state.stats.contractsCompleted >= n.unlockAfterContracts);
  },

  generate(excludeNpcs: string[] = []): ContractInstance {
    const s = store.state;
    const pool = this.availableNpcs();
    const fresh = pool.filter((n) => !excludeNpcs.includes(n.id));
    const npc = pick(fresh.length ? fresh : pool);
    const pref = npc.contractPreferences;
    const rarity = rollRarity(pref.rarityBias + LegacySystem.effect('rarityBias'));
    const r = RARITY[rarity];
    const rate = Math.max(1, this.effectiveRate());
    const qty = niceRound(Math.max(Progression.contractMinQuantity, rate * rand(...pref.productionSeconds) * r.quantityMult));
    const item = availableItem(pref.items);
    const rewardGold = Math.ceil(qty * ProductionSystem.sellPrice() * Progression.contractPriceMultiplier * pref.rewardMult * r.rewardMult
      * LegacySystem.effect('contractGoldMult'));
    const rewardEssence = Math.round(rand(r.essence[0], r.essence[1])) + LegacySystem.effect('contractEssence');
    const durationSec = Math.round(rand(...pref.durationSec) / 300) * 300;
    return {
      uid: s.contracts.nextUid++,
      npcId: npc.id,
      items: [{ item, qty }],
      rewardGold,
      rewardEssence,
      durationSec,
      rarity,
      dialogueKey: pick(npc.dialogueKeys),
      status: 'AVAILABLE',
      until: 0,
    };
  },

  /** Blood/s the farm really delivers (tank overflow excluded) — orders are sized to this. */
  effectiveRate(): number {
    return ProductionSystem.hasAutoCollect() ? ProductionSystem.collectedPerSecond() : ProductionSystem.bloodPerSecond();
  },

  refillMs(): number {
    return Progression.contractRefillDelaySec * 1000 * LegacySystem.effect('contractTimeMult');
  },

  freeRefreshMs(): number {
    return Progression.contractFreeRefreshSec * 1000 * LegacySystem.effect('contractTimeMult');
  },

  /** Called every UI tick: fills empty slots, expires overdue contracts, refills finished ones. */
  update(now = Date.now()) {
    const s = store.state;
    if (!s.unlocks.market) return;
    let changed = false;
    const slots = s.contracts.slots;
    while (slots.length < Progression.contractSlots) {
      slots.push(this.generate(slots.map((c) => c.npcId)));
      changed = true;
    }
    slots.forEach((c, i) => {
      if (c.status === 'ACTIVE' && now >= c.until) {
        c.status = 'EXPIRED';
        c.until = now + this.refillMs();
        changed = true;
      } else if ((c.status === 'COMPLETED' || c.status === 'EXPIRED') && now >= c.until) {
        slots[i] = this.generate(slots.filter((o) => o !== c).map((o) => o.npcId));
        changed = true;
      }
    });
    if (s.contracts.nextFreeRefreshAt === 0) s.contracts.nextFreeRefreshAt = now + this.freeRefreshMs();
    // Legacy "Contract Clerk": accepts every offer and delivers as soon as the blood is there.
    if (LegacySystem.has('autoContracts')) {
      for (const c of slots) {
        if (c.status === 'AVAILABLE') { this.accept(c.uid, now); changed = true; }
        if (c.status === 'ACTIVE' && this.canDeliver(c)) { this.deliver(c.uid, now); changed = true; }
      }
    }
    if (changed) bus.emit('contracts:changed');
  },

  accept(uid: number, now = Date.now()): boolean {
    const c = this.slots().find((x) => x.uid === uid);
    if (!c || c.status !== 'AVAILABLE') return false;
    c.status = 'ACTIVE';
    c.until = now + c.durationSec * 1000;
    store.state.stats.contractsAccepted++;
    Analytics.track('contract_accepted', { npc: c.npcId, rarity: c.rarity });
    bus.emit('contracts:changed');
    return true;
  },

  have(item: ItemId): number {
    return item === 'blood' ? store.state.resources.blood : 0;
  },

  canDeliver(c: ContractInstance): boolean {
    return c.status === 'ACTIVE' && c.items.every((it) => this.have(it.item) >= it.qty);
  },

  deliver(uid: number, now = Date.now()): boolean {
    const s = store.state;
    const c = this.slots().find((x) => x.uid === uid);
    if (!c || !this.canDeliver(c)) return false;
    for (const it of c.items) if (it.item === 'blood') s.resources.blood -= it.qty;
    EconomySystem.addGold(c.rewardGold);
    EconomySystem.addEssence(c.rewardEssence);
    c.status = 'COMPLETED';
    c.until = now + this.refillMs();
    s.stats.contractsCompleted++;
    Analytics.track('contract_completed', { npc: c.npcId, gold: c.rewardGold, essence: c.rewardEssence });
    bus.emit('contract:completed', { gold: c.rewardGold, essence: c.rewardEssence });
    bus.emit('contracts:changed');
    bus.emit('resources:changed');
    return true;
  },

  isFreeRefreshReady(now = Date.now()): boolean {
    return now >= store.state.contracts.nextFreeRefreshAt;
  },

  paidRefreshCost(): number {
    return Math.max(Progression.contractPaidRefreshBase, niceRound(this.effectiveRate() * 20));
  },

  /** Replaces AVAILABLE offers only; accepted contracts are never yanked away. */
  refresh(now = Date.now()): boolean {
    const s = store.state;
    const free = this.isFreeRefreshReady(now);
    if (!free) {
      const cost = this.paidRefreshCost();
      if (!EconomySystem.canAfford(cost)) return false;
      EconomySystem.spendGold(cost);
    } else {
      s.contracts.nextFreeRefreshAt = now + this.freeRefreshMs();
    }
    const slots = s.contracts.slots;
    slots.forEach((c, i) => {
      if (c.status === 'AVAILABLE') slots[i] = this.generate(slots.map((o) => o.npcId));
    });
    bus.emit('contracts:changed');
    bus.emit('resources:changed');
    return true;
  },
};
