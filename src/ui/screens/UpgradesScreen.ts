import { t } from '../../data/localization';
import { UPGRADES } from '../../data/upgrades';
import { UpgradeCard, type CardId } from '../components/UpgradeCard';
import { h } from '../dom';

export class UpgradesScreen {
  readonly root: HTMLElement;
  private cards: UpgradeCard[] = [];

  constructor() {
    const groups: { key: string; ids: CardId[] }[] = [
      { key: 'upgrades.cat.quick', ids: ['buy_human', ...UPGRADES.filter((u) => u.category === 'quick').map((u) => u.id)] },
      { key: 'upgrades.cat.storage', ids: UPGRADES.filter((u) => u.category === 'storage').map((u) => u.id) },
      { key: 'upgrades.cat.logistics', ids: UPGRADES.filter((u) => u.category === 'logistics').map((u) => u.id) },
    ];
    this.root = h('section', { class: 'screen screen-upgrades' },
      h('header', { class: 'screen-head' }, h('h1', {}, t('upgrades.title')), h('p', { class: 'flavor' }, t('upgrades.flavor'))),
      h('div', { class: 'screen-scroll' }, ...groups.map((g) => {
        const cards = g.ids.map((id) => new UpgradeCard(id, 'row'));
        this.cards.push(...cards);
        return h('div', { class: 'upgrade-group' }, h('h2', {}, t(g.key)), h('div', { class: 'upgrade-grid' }, ...cards.map((c) => c.root)));
      })),
    );
    // Upgrade cards on this screen must not steal the Farm quick-card tutorial highlight.
    this.root.querySelectorAll('[data-tut]').forEach((el) => el.removeAttribute('data-tut'));
  }

  update() {
    for (const c of this.cards) c.update();
  }
}
