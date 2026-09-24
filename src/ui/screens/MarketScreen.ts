import { store } from '../../core/Store';
import { assetUrl } from '../../data/assets';
import { t } from '../../data/localization';
import { Progression } from '../../data/progression';
import { ContractSystem } from '../../systems/ContractSystem';
import { AudioManager } from '../../systems/AudioManager';
import { formatDuration, formatNumber } from '../../utils/format';
import { ContractCard } from '../components/ContractCard';
import { flash, h, setText, toggleClass } from '../dom';

export class MarketScreen {
  readonly root: HTMLElement;
  private cards: ContractCard[] = [];
  private stored = h('span', { class: 'stored-value' });
  private refreshBtn = h('button', { class: 'btn btn-buy btn-refresh' });
  private refreshLabel = h('span');
  private refreshSub = h('div', { class: 'refresh-sub' });

  constructor() {
    this.cards = Array.from({ length: Progression.contractSlots }, (_, i) => new ContractCard(i));
    this.refreshBtn.append(this.refreshLabel);
    this.refreshBtn.addEventListener('click', () => {
      if (ContractSystem.refresh()) AudioManager.ui('sfx_contract_accept');
      else { AudioManager.ui('sfx_error'); flash(this.refreshBtn, 'is-denied'); }
    });
    this.root = h('section', { class: 'screen screen-market' },
      h('header', { class: 'screen-head' }, h('h1', {}, t('market.title')), h('p', { class: 'flavor' }, t('market.flavor'))),
      h('div', { class: 'screen-scroll' },
        h('div', { class: 'contracts' }, ...this.cards.map((c) => c.root)),
        h('div', { class: 'market-footer' },
          h('div', { class: 'stored panel-dark-soft' },
            h('img', { src: assetUrl('icon_blood'), alt: '' }),
            h('div', {}, h('div', { class: 'stored-label' }, t('market.storage')), this.stored)),
          h('div', { class: 'refresh panel-dark-soft' },
            h('div', {}, h('div', { class: 'refresh-title' }, t('market.refresh')), this.refreshSub),
            this.refreshBtn),
        ),
      ),
    );
  }

  update() {
    const now = Date.now();
    ContractSystem.slots().forEach((c, i) => this.cards[i]?.update(c, now));
    setText(this.stored, formatNumber(store.state.resources.blood));
    const free = ContractSystem.isFreeRefreshReady(now);
    setText(this.refreshSub, free ? t('market.refreshFree') : t('market.refreshIn', { t: formatDuration((store.state.contracts.nextFreeRefreshAt - now) / 1000) }));
    setText(this.refreshLabel, free ? '↻' : `↻ ${formatNumber(ContractSystem.paidRefreshCost())}`);
    toggleClass(this.refreshBtn, 'is-affordable', free || store.state.resources.gold >= ContractSystem.paidRefreshCost());
  }
}
