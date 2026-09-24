import type { ContractInstance } from '../../core/GameState';
import { assetUrl } from '../../data/assets';
import { ITEMS, NPC_BY_ID } from '../../data/contracts';
import { t } from '../../data/localization';
import { ContractSystem } from '../../systems/ContractSystem';
import { AudioManager } from '../../systems/AudioManager';
import { formatDuration, formatNumber } from '../../utils/format';
import { flash, h, setText, toggleClass } from '../dom';

export class ContractCard {
  readonly root: HTMLElement;
  private uid = -1;
  private portrait = h('img', { class: 'contract-portrait', alt: '' });
  private name = h('div', { class: 'contract-name' });
  private title = h('div', { class: 'contract-title' });
  private rarity = h('span', { class: 'contract-rarity' });
  private quote = h('div', { class: 'contract-quote' });
  private items = h('div', { class: 'contract-items' });
  private gold = h('span');
  private essence = h('span');
  private essenceWrap: HTMLElement;
  private time = h('div', { class: 'contract-time' });
  private btn = h('button', { class: 'btn btn-buy btn-contract' });
  private status = h('div', { class: 'contract-status' });

  constructor(index: number) {
    this.essenceWrap = h('span', { class: 'reward' }, h('img', { src: assetUrl('icon_ancestral_essence'), alt: '' }), this.essence);
    this.root = h('article', { class: 'contract-card panel-parchment', 'data-tut': `contract:${index}` },
      h('header', { class: 'contract-head' },
        h('div', { class: 'contract-portrait-wrap' }, this.portrait),
        h('div', { class: 'contract-who' }, this.name, this.title, this.rarity),
      ),
      this.quote,
      this.items,
      h('div', { class: 'contract-rewards' },
        h('span', { class: 'rewards-label' }, t('market.rewards')),
        h('span', { class: 'reward' }, h('img', { src: assetUrl('icon_gold'), alt: '' }), this.gold),
        this.essenceWrap,
      ),
      this.time,
      this.btn,
      this.status,
    );
    this.btn.addEventListener('click', () => this.act());
  }

  private act() {
    const c = ContractSystem.slots().find((x) => x.uid === this.uid);
    if (!c) return;
    if (c.status === 'AVAILABLE') {
      ContractSystem.accept(c.uid);
      AudioManager.ui('sfx_contract_accept');
      flash(this.root, 'is-bought');
    } else if (c.status === 'ACTIVE') {
      if (ContractSystem.deliver(c.uid)) {
        AudioManager.play('sfx_contract_complete');
        AudioManager.play('sfx_gold');
        flash(this.root, 'is-bought');
      } else {
        AudioManager.ui('sfx_error');
        flash(this.root, 'is-denied');
      }
    }
  }

  update(c: ContractInstance | undefined, now: number) {
    this.root.hidden = !c;
    if (!c) return;
    const npc = NPC_BY_ID[c.npcId];
    if (this.uid !== c.uid) {
      this.uid = c.uid;
      this.portrait.src = assetUrl(npc.portrait);
      this.items.replaceChildren(...c.items.map((it) => {
        const def = ITEMS[it.item];
        return h('div', { class: 'contract-item', 'data-item': it.item },
          h('img', { src: assetUrl(def.icon), alt: '' }),
          h('span', { class: 'item-name' }, t(def.nameKey)),
          h('span', { class: 'item-qty' }),
        );
      }));
      flash(this.root, 'is-new');
    }
    setText(this.name, npc.name);
    setText(this.title, t(npc.titleKey));
    setText(this.rarity, t(`market.rarity.${c.rarity}`));
    this.rarity.dataset.rarity = c.rarity;
    setText(this.quote, `“${t(c.dialogueKey)}”`);
    c.items.forEach((it, k) => {
      const row = this.items.children[k] as HTMLElement | undefined;
      const qty = row?.querySelector('.item-qty') as HTMLElement | null;
      if (!row || !qty) return;
      const have = Math.min(ContractSystem.have(it.item), it.qty);
      setText(qty, `${formatNumber(have)}/${formatNumber(it.qty)}`);
      toggleClass(row, 'is-met', have >= it.qty);
    });
    setText(this.gold, formatNumber(c.rewardGold));
    setText(this.essence, formatNumber(c.rewardEssence));
    this.essenceWrap.hidden = c.rewardEssence <= 0;

    const state = c.status;
    this.root.dataset.status = state;
    const remaining = (c.until - now) / 1000;
    if (state === 'AVAILABLE') {
      setText(this.time, `⏱ ${formatDuration(c.durationSec)}`);
      setText(this.btn, t('market.accept'));
      this.btn.disabled = false;
      toggleClass(this.btn, 'is-affordable', true);
      setText(this.status, '');
    } else if (state === 'ACTIVE') {
      const ready = ContractSystem.canDeliver(c);
      setText(this.time, t('market.active', { t: formatDuration(remaining) }));
      setText(this.btn, t('market.deliver'));
      this.btn.disabled = false;
      toggleClass(this.btn, 'is-affordable', ready);
      setText(this.status, '');
    } else {
      setText(this.time, '');
      this.btn.disabled = true;
      toggleClass(this.btn, 'is-affordable', false);
      setText(this.btn, state === 'COMPLETED' ? t('market.completed') : t('market.expired'));
      setText(this.status, t('market.nextClient', { t: formatDuration(remaining) }));
    }
  }
}
