// One card = icon, name, level, short description, effect preview, cost button.
// The same component renders the Farm quick cards and the Upgrades screen rows. The Buy Human card also
// carries the ×1/×10/MAX selector and the progress toward the next population milestone.
import { bus } from '../../core/EventBus';
import { store } from '../../core/Store';
import { assetUrl, type AssetKey } from '../../data/assets';
import { t } from '../../data/localization';
import { UPGRADE_BY_ID, type UpgradeId } from '../../data/upgrades';
import { HumanSystem, type BuyAmount } from '../../systems/HumanSystem';
import { MilestoneSystem } from '../../systems/MilestoneSystem';
import { ProductionSystem } from '../../systems/ProductionSystem';
import { UpgradeSystem } from '../../systems/UpgradeSystem';
import { AudioManager } from '../../systems/AudioManager';
import { formatNumber } from '../../utils/format';
import { flash, h, onTap, setText, toggleClass } from '../dom';

export type CardId = UpgradeId | 'buy_human';

interface CardModel {
  icon: AssetKey; name: string; desc: string; level: string; effect: string;
  cost: number; maxed: boolean; blocked: boolean; blockedText: string;
}

const BUY_MODES: BuyAmount[] = [1, 10, 'max'];
let buyMode: BuyAmount = 1; // shared by every Buy Human card

function effectText(id: UpgradeId, level: number): string {
  const o = { id, level };
  switch (UPGRADE_BY_ID[id].effectType) {
    case 'collectSpeed': return level === 0 ? '—' : t('upgrade.effect.collect', { s: ProductionSystem.collectInterval(o).toFixed(1) });
    case 'humanCapacity': return t('upgrade.effect.capacity', { n: formatNumber(ProductionSystem.humanCapacity(o)) });
    case 'productionMult': { const m = ProductionSystem.globalMultiplier(o); return t('upgrade.effect.production', { n: m < 100 ? m.toFixed(2) : formatNumber(m) }); }
    case 'tankCapacityMult': return t('upgrade.effect.tank', { n: formatNumber(ProductionSystem.tankCapacity(o)) });
    case 'sellPriceMult': return t('upgrade.effect.price', { n: ProductionSystem.sellPrice(o) < 100 ? ProductionSystem.sellPrice(o).toFixed(2) : formatNumber(ProductionSystem.sellPrice(o)) });
    case 'autoSell': return level > 0 ? t('upgrade.effect.autosellOn') : t('upgrade.effect.autosellOff');
    default: return '';
  }
}

function model(id: CardId): CardModel {
  if (id === 'buy_human') {
    const full = HumanSystem.isFull();
    const n = HumanSystem.quantityFor(buyMode);
    return {
      icon: 'upgrade_buy_human', name: t('farm.buyHuman'), desc: t('farm.buyHuman.desc'),
      level: `${HumanSystem.count()}/${HumanSystem.capacity()}`, effect: `+${formatNumber(ProductionSystem.marginalPerHuman())}/s`,
      cost: HumanSystem.costFor(Math.max(1, n)), maxed: false, blocked: full, blockedText: t('farm.capacityFull'),
    };
  }
  const def = UPGRADE_BY_ID[id];
  const lvl = UpgradeSystem.level(id);
  const maxed = UpgradeSystem.isMaxed(id);
  return {
    icon: def.icon, name: t(def.nameKey), desc: t(def.descKey),
    level: t('farm.level', { n: lvl }),
    effect: maxed ? effectText(id, lvl) : `${effectText(id, lvl)} → ${effectText(id, lvl + 1)}`,
    cost: UpgradeSystem.cost(id), maxed, blocked: false, blockedText: '',
  };
}

export class UpgradeCard {
  readonly root: HTMLElement;
  private name: HTMLElement;
  private level: HTMLElement;
  private desc: HTMLElement;
  private effect: HTMLElement;
  private btn: HTMLButtonElement;
  private cost: HTMLElement;
  private qty = h('span', { class: 'btn-qty' });
  private progress: HTMLElement;
  private icon: HTMLImageElement;
  private ribbon = h('span', { class: 'card-ribbon', hidden: true }, t('card.next'));
  private modeBtn?: HTMLButtonElement;
  private milestone?: { root: HTMLElement; fill: HTMLElement; text: HTMLElement };

  constructor(readonly id: CardId, variant: 'quick' | 'row' = 'quick') {
    this.icon = h('img', { class: 'card-icon', alt: '' });
    this.name = h('div', { class: 'card-name' });
    this.level = h('div', { class: 'card-level' });
    this.desc = h('div', { class: 'card-desc' });
    this.effect = h('div', { class: 'card-effect' });
    this.cost = h('span', { class: 'cost-value' });
    this.progress = h('span', { class: 'btn-progress' });
    this.btn = h('button', { class: 'btn btn-buy' }, this.progress, this.qty, h('img', { class: 'cost-icon', src: assetUrl('icon_gold'), alt: '' }), this.cost);
    const texts = h('div', { class: 'card-texts' }, this.desc, this.effect);
    if (id === 'buy_human') {
      const fill = h('span', { class: 'ms-fill' });
      const text = h('span', { class: 'ms-text' });
      this.milestone = { root: h('div', { class: 'card-milestone' }, fill, text), fill, text };
      texts.append(this.milestone.root);
      this.modeBtn = h('button', { class: 'btn-mode', 'aria-label': 'Buy amount' });
      onTap(this.modeBtn, () => {
        buyMode = BUY_MODES[(BUY_MODES.indexOf(buyMode) + 1) % BUY_MODES.length];
        bus.emit('resources:changed');
      });
    }
    this.root = h('div', { class: `upgrade-card card-${variant} card-${id}`, 'data-tut': `card:${id}` },
      this.ribbon,
      h('div', { class: 'card-head' }, this.name, this.level),
      h('div', { class: 'card-body' }, h('div', { class: 'card-icon-wrap' }, this.icon, this.modeBtn), texts),
      this.btn,
    );
    this.btn.addEventListener('click', () => this.buy());
  }

  setRecommended(on: boolean) {
    this.ribbon.hidden = !on;
    toggleClass(this.root, 'is-recommended', on);
  }

  private buy() {
    const ok = this.id === 'buy_human' ? HumanSystem.buy(HumanSystem.quantityFor(buyMode)) : UpgradeSystem.buy(this.id);
    if (!ok) {
      AudioManager.ui('sfx_error');
      flash(this.root, 'is-denied');
      if (this.id === 'buy_human' && HumanSystem.isFull()) bus.emit('toast', { text: t('toast.capacityFull'), kind: 'error' });
      return;
    }
    AudioManager.play(this.id === 'buy_human' ? 'sfx_purchase' : 'sfx_upgrade');
    flash(this.root, 'is-bought');
    this.update();
  }

  update() {
    const m = model(this.id);
    if (this.icon.getAttribute('src') !== assetUrl(m.icon)) this.icon.src = assetUrl(m.icon);
    setText(this.name, m.name);
    setText(this.level, m.maxed ? t('farm.max') : m.level);
    setText(this.desc, m.desc);
    setText(this.effect, m.effect);
    const gold = store.state.resources.gold;
    const affordable = !m.maxed && !m.blocked && gold >= m.cost;
    setText(this.cost, m.maxed ? t('farm.max') : m.blocked ? m.blockedText : formatNumber(m.cost));
    this.btn.disabled = m.maxed;
    toggleClass(this.btn, 'is-affordable', affordable);
    toggleClass(this.btn, 'is-blocked', m.blocked);
    toggleClass(this.root, 'is-affordable', affordable);
    toggleClass(this.root, 'is-maxed', m.maxed);
    // "Almost there" fill: always shows how close the next purchase is.
    const pct = m.maxed || m.blocked ? 0 : Math.min(100, (gold / m.cost) * 100);
    this.progress.style.width = `${pct}%`;

    if (this.id === 'buy_human') {
      const n = HumanSystem.quantityFor(buyMode);
      setText(this.qty, !m.blocked && n > 1 ? `×${n}` : '');
      setText(this.modeBtn!, buyMode === 'max' ? t('farm.buyMax') : `×${buyMode}`);
      const next = MilestoneSystem.next();
      const have = store.state.humans;
      this.milestone!.fill.style.width = `${Math.min(100, ((have - next.prev) / (next.at - next.prev)) * 100)}%`;
      setText(this.milestone!.text, t('farm.milestone', { n: next.at, m: MilestoneSystem.perMilestone() }));
    }
  }
}
