import { store } from '../../core/Store';
import { bus } from '../../core/EventBus';
import { assetUrl, type AssetKey } from '../../data/assets';
import { t } from '../../data/localization';
import { EconomySystem } from '../../systems/EconomySystem';
import { ProductionSystem } from '../../systems/ProductionSystem';
import { formatNumber, formatRate } from '../../utils/format';
import { flash, h, onTap, setText, toggleClass } from '../dom';

type Res = 'blood' | 'gold' | 'essence';

interface Card { root: HTMLElement; value: HTMLElement; rate: HTMLElement; last: number }

export class ResourceBar {
  readonly root: HTMLElement;
  private cards = {} as Record<Res, Card>;
  private sell: HTMLButtonElement;
  private auto: HTMLButtonElement;

  constructor() {
    this.sell = h('button', { class: 'btn btn-sell', 'data-tut': 'sell' }, t('res.sell'));
    onTap(this.sell, () => {
      const gold = EconomySystem.sellAll();
      if (gold > 0) this.popDelta('gold', gold);
    }, 'sfx_gold');
    this.auto = h('button', { class: 'btn btn-auto', title: t('res.autoHint') }, t('res.auto'));
    onTap(this.auto, () => {
      store.state.autoSell = !store.state.autoSell;
      if (store.state.autoSell) EconomySystem.autoSell();
      bus.emit('resources:changed');
    });
    this.root = h('div', { class: 'resources' },
      this.card('blood', 'icon_blood', h('div', { class: 'sell-group' }, this.sell, this.auto)),
      this.card('gold', 'icon_gold'),
      this.card('essence', 'icon_ancestral_essence'),
    );
    bus.on('contract:completed', ({ gold, essence }) => {
      this.popDelta('gold', gold);
      if (essence > 0) this.popDelta('essence', essence);
    });
    bus.on('mission:claimed', () => flash(this.cards.essence.root, 'is-bump'));
  }

  private card(res: Res, icon: AssetKey, extra?: HTMLElement): HTMLElement {
    const value = h('span', { class: 'res-value' });
    const rate = h('span', { class: 'res-rate' });
    const root = h('div', { class: `res-card res-${res}`, title: t(`res.${res}`) },
      h('img', { class: 'res-icon', src: assetUrl(icon), alt: t(`res.${res}`) }),
      h('div', { class: 'res-text' }, value, rate),
      extra,
    );
    this.cards[res] = { root, value, rate, last: 0 };
    return root;
  }

  /** "+120" floating out of a resource card. */
  popDelta(res: Res, amount: number) {
    const el = h('span', { class: `res-pop res-pop-${res}` }, `+${formatNumber(amount)}`);
    this.cards[res].root.append(el);
    flash(this.cards[res].root, 'is-bump');
    setTimeout(() => el.remove(), 1100);
  }

  update() {
    const s = store.state;
    const r = s.resources;
    const set = (res: Res, v: number, rate: string) => {
      const c = this.cards[res];
      setText(c.value, formatNumber(v));
      setText(c.rate, rate);
      c.last = v;
    };
    const spill = ProductionSystem.overflowPerSecond();
    const bloodRate = ProductionSystem.hasAutoCollect() ? ProductionSystem.collectedPerSecond() : ProductionSystem.bloodPerSecond();
    const spilling = spill > bloodRate * 0.02;
    set('blood', r.blood, spilling ? `${formatRate(bloodRate)} ⚠` : formatRate(bloodRate));
    this.cards.blood.root.title = spilling ? t('res.spill', { n: formatNumber(spill) }) : t('res.blood');
    toggleClass(this.cards.blood.root, 'is-spilling', spilling);
    const cart = ProductionSystem.hasDeliveryCart();
    this.auto.hidden = !cart;
    toggleClass(this.auto, 'is-on', store.state.autoSell);
    this.sell.hidden = cart && store.state.autoSell;
    const gps = ProductionSystem.goldPerSecond();
    set('gold', r.gold, gps > 0 ? formatRate(gps) : '');
    set('essence', r.essence, '');
    this.sell.disabled = r.blood < 1;
    this.sell.title = t('res.sellHint', { gold: formatNumber(r.blood * ProductionSystem.sellPrice()) });
    toggleClass(this.cards.blood.root, 'is-tank-full', EconomySystem.isTankFull() && !ProductionSystem.hasAutoCollect());
  }
}
