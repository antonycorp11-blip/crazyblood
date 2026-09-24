// Headless balance simulator. Runs the REAL systems (economy, upgrades, contracts, missions, prestige)
// with a scripted "active player" bot, second by second, and prints a pacing report.
//   npm run sim                 (defaults: 3 lineages)
//   npm run sim -- 5            (5 lineages)
import { store } from '../src/core/Store';
import { createNewState } from '../src/core/GameState';
import { EconomySystem } from '../src/systems/EconomySystem';
import { UpgradeSystem } from '../src/systems/UpgradeSystem';
import { HumanSystem } from '../src/systems/HumanSystem';
import { ProductionSystem } from '../src/systems/ProductionSystem';
import { ContractSystem } from '../src/systems/ContractSystem';
import { MissionSystem } from '../src/systems/MissionSystem';
import { PrestigeSystem } from '../src/systems/PrestigeSystem';
import { LegacySystem } from '../src/systems/LegacySystem';
import { MilestoneSystem } from '../src/systems/MilestoneSystem';
import { LEGACY_NODES } from '../src/data/prestige';
import { UPGRADE_BY_ID, type UpgradeId } from '../src/data/upgrades';
import { formatNumber } from '../src/utils/format';

const LINEAGES = Number(process.argv[2] ?? 3);
const MAX_RUN_SEC = 3 * 3600;
const fmtT = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

store.state = createNewState(0);
store.state.tutorial.done = true;
let clock = 0; // simulated epoch ms

function buyCheapest(): string | null {
  const opts: { id: string; cost: number; buy: () => boolean }[] = [];
  if (!HumanSystem.isFull()) opts.push({ id: 'human', cost: HumanSystem.cost(), buy: () => HumanSystem.buy(1) });
  const up = (id: UpgradeId, when = true) => {
    if (when && !UpgradeSystem.isMaxed(id)) opts.push({ id, cost: UpgradeSystem.cost(id), buy: () => UpgradeSystem.buy(id) });
  };
  up('expand_estate', HumanSystem.room() <= 1);
  up('auto_collect');
  up('blood_processing');
  up('tank_storage', ProductionSystem.overflowRatio() > 0.15);
  up('merchant_relations', ProductionSystem.isAutoSelling());
  up('delivery_cart', ProductionSystem.hasAutoCollect());
  opts.sort((a, b) => a.cost - b.cost);
  const best = opts[0];
  if (best && store.state.resources.gold >= best.cost && best.buy()) return best.id;
  return null;
}

function spendEssence() {
  // Greedy: cheapest affordable unlocked node, repeatedly.
  for (;;) {
    const opts = LEGACY_NODES.filter((n) => LegacySystem.canBuy(n)).sort((a, b) => LegacySystem.cost(a) - LegacySystem.cost(b));
    if (!opts.length || !LegacySystem.buy(opts[0].id)) return;
  }
}

for (let lineage = 1; lineage <= LINEAGES; lineage++) {
  const log: string[] = [];
  const once = new Set<string>();
  const mark = (t: number, key: string, text: string) => { if (!once.has(key)) { once.add(key); log.push(`  ${fmtT(t).padStart(6)}  ${text}`); } };
  let lastBuy = 0, longestWait = 0, longestAt = 0, buys = 0;
  let prestigeAt = -1;
  let milestonesSeen = MilestoneSystem.reached();

  for (let t = 1; t <= MAX_RUN_SEC; t++) {
    clock += 1000;
    const s = store.state;
    EconomySystem.tick(1);
    if (!ProductionSystem.hasAutoCollect() && t % 8 === 0) EconomySystem.collectTank(true);
    if (!ProductionSystem.isAutoSelling() && t % 8 === 0) EconomySystem.sellAll();

    // Market opens with Auto Collect (tutorial step), contracts are worked when reasonable.
    if (s.upgrades.auto_collect > 0) s.unlocks.market = true;
    ContractSystem.update(clock);
    for (const c of ContractSystem.slots()) {
      if (c.status === 'AVAILABLE' && s.contracts.slots.filter((x) => x.status === 'ACTIVE').length < 2) ContractSystem.accept(c.uid, clock);
      if (c.status === 'ACTIVE') ContractSystem.deliver(c.uid, clock);
    }
    MissionSystem.update();
    if (s.mission.complete) MissionSystem.claim();
    PrestigeSystem.update();

    for (let k = 0; k < 50; k++) {
      const id = buyCheapest();
      if (!id) break;
      buys++;
      const gap = t - lastBuy;
      if (gap > longestWait && t > 60) { longestWait = gap; longestAt = t; }
      lastBuy = t;
      if (id === 'auto_collect' && s.upgrades.auto_collect === 1) mark(t, 'ac', 'Auto Collect');
      if (id === 'delivery_cart') mark(t, 'cart', 'Delivery Cart (auto-sell)');
      if (id === 'expand_estate') mark(t, `e${s.upgrades.expand_estate}`, `Expand Estate ${s.upgrades.expand_estate} → cap ${HumanSystem.capacity()}`);
    }
    const ms = MilestoneSystem.reached();
    if (ms > milestonesSeen) { milestonesSeen = ms; mark(t, `m${ms}`, `★ milestone ${MilestoneSystem.next().prev} humans (×${MilestoneSystem.multiplier()})`); }
    if (s.unlocks.market) mark(t, 'market', 'Market open');
    if (s.stats.contractsCompleted >= 1) mark(t, 'c1', 'first contract delivered');
    if (s.unlocks.legacy) mark(t, 'legacy', `Legacy unlocked (reset now = +${PrestigeSystem.essenceForReset()} essence)`);
    if (t % 600 === 0) {
      log.push(`  ${fmtT(t).padStart(6)}  · ${s.humans} humans, ${formatNumber(ProductionSystem.bloodPerSecond())} blood/s` +
        ` (overflow ${Math.round(ProductionSystem.overflowRatio() * 100)}%), gold/s ${formatNumber(ProductionSystem.goldPerSecond())},` +
        ` essence now ${formatNumber(s.resources.essence)} / reset +${PrestigeSystem.essenceForReset()}, idle ${t - lastBuy}s`);
    }

    // Bot prestiges when the reset is worth at least as much as everything it owns, and not too early.
    const gain = PrestigeSystem.essenceForReset();
    const owned = s.resources.essence + Object.entries(s.legacy).reduce((a, [id, l]) => a + (l > 0 ? LegacySystem.cost(LEGACY_NODES.find((n) => n.id === id)!, 0) * l : 0), 0);
    if (PrestigeSystem.canPrestige() && t > 25 * 60 && gain >= Math.max(10, owned * 0.8)) { prestigeAt = t; break; }
  }

  const s = store.state;
  console.log(`\n=== Lineage ${lineage}${prestigeAt > 0 ? ` — New Lineage at ${fmtT(prestigeAt)}` : ' — no prestige within 3h'} ===`);
  console.log(`  start: ${s.humans} humans, legacy ${JSON.stringify(s.legacy)}`);
  console.log(log.join('\n'));
  console.log(`  purchases: ${buys}, longest wait between purchases: ${longestWait}s (at ${fmtT(longestAt)})`);
  console.log(`  end: ${s.humans} humans, ${formatNumber(ProductionSystem.bloodPerSecond())}/s, upgrades ${JSON.stringify(Object.fromEntries(Object.entries(s.upgrades).filter(([, v]) => v > 0)))}`);
  if (prestigeAt < 0) break;
  const gained = PrestigeSystem.essenceForReset();
  PrestigeSystem.performReset();
  spendEssence();
  console.log(`  → reset for +${gained} essence; tree now ${JSON.stringify(store.state.legacy)}; essence left ${store.state.resources.essence}`);
  void UPGRADE_BY_ID;
}
