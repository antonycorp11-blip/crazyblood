// Legacy: three branches of permanent upgrades bought with Ancestral Essence, and the New Lineage button.
// Before unlock the tree is visible but sealed, with a progress bar (design doc §41).
import { bus } from '../../core/EventBus';
import { store } from '../../core/Store';
import { assetUrl } from '../../data/assets';
import { t } from '../../data/localization';
import { LEGACY_BRANCHES, LEGACY_BY_ID, LEGACY_NODES, type LegacyEffect, type LegacyNode } from '../../data/prestige';
import { Progression } from '../../data/progression';
import { LegacySystem } from '../../systems/LegacySystem';
import { PrestigeSystem } from '../../systems/PrestigeSystem';
import { AudioManager } from '../../systems/AudioManager';
import { formatNumber } from '../../utils/format';
import { openModal } from '../components/Modal';
import { flash, h, onTap, setText, toggleClass } from '../dom';

function fmtEffect(type: LegacyEffect, v: number): string {
  switch (type) {
    case 'productionMult': case 'humanCostMult': case 'tankMult': case 'sellPriceMult':
    case 'contractGoldMult': case 'contractTimeMult': case 'essenceMult':
      return t('legacy.fx.mult', { v: v >= 100 ? formatNumber(v) : v.toFixed(2) });
    case 'startingGold': return t('legacy.fx.gold', { v: formatNumber(v) });
    case 'offlineEfficiency': return t('legacy.fx.pct', { v: Math.round(v * 100) });
    case 'offlineCapHours': return t('legacy.fx.hours', { v });
    case 'autoContracts': return v > 0 ? t('legacy.fx.on') : t('legacy.fx.off');
    case 'processingBonus': return t('legacy.fx.plus', { v: v.toFixed(2) });
    default: return t('legacy.fx.plus', { v: formatNumber(v) });
  }
}

interface NodeView { node: LegacyNode; el: HTMLButtonElement; lvl: HTMLElement }

export class LegacyScreen {
  readonly root: HTMLElement;
  private essence = h('span', { class: 'legacy-essence-value' });
  private fill = h('div', { class: 'bar-fill bar-purple' });
  private barText = h('div', { class: 'bar-text' });
  private stats = h('div', { class: 'legacy-stats' });
  private cta: HTMLButtonElement;
  private nodes: NodeView[] = [];
  private selected: LegacyNode | null = null;
  private detail = { root: h('div', { class: 'legacy-detail panel-dark-soft' }), name: h('h3'), desc: h('p'), fx: h('div', { class: 'detail-fx' }), req: h('div', { class: 'detail-req' }), buy: h('button', { class: 'btn btn-buy btn-legacy-buy' }) };

  constructor(private layer: HTMLElement) {
    const d = this.detail;
    d.root.append(d.name, d.desc, d.fx, d.req, d.buy);
    onTap(d.buy, () => this.buySelected(), null);

    const branches = LEGACY_BRANCHES.map((b) => {
      const views = LEGACY_NODES.filter((n) => n.branch === b.id).sort((a, c) => a.row - c.row || a.col - c.col).map((n) => {
        const lvl = h('span', { class: 'node-level' });
        const el = h('button', { class: 'legacy-node', 'aria-label': t(`legacy.node.${n.id}`) },
          h('img', { class: 'node-icon', src: assetUrl(n.icon), alt: '' }),
          h('img', { class: 'node-lock', src: assetUrl('legacy_locked'), alt: '' }),
          lvl);
        onTap(el, () => { this.selected = n; this.update(); });
        const v = { node: n, el, lvl };
        this.nodes.push(v);
        return v;
      });
      return h('div', { class: `legacy-branch branch-${b.id}` },
        h('div', { class: 'branch-head' }, h('img', { src: assetUrl(b.icon), alt: '' }), h('h3', {}, t(b.nameKey)), h('p', {}, t(b.descKey))),
        h('div', { class: 'branch-nodes' }, ...views.map((v) => v.el)));
    });

    this.cta = h('button', { class: 'btn btn-legacy' });
    onTap(this.cta, () => this.confirmPrestige(), null);
    this.root = h('section', { class: 'screen screen-legacy' },
      h('header', { class: 'screen-head legacy-head' },
        h('h1', {}, t('legacy.title')),
        h('p', { class: 'flavor' }, t('legacy.subtitle')),
        h('div', { class: 'legacy-essence' }, h('img', { src: assetUrl('icon_ancestral_essence'), alt: '' }), this.essence)),
      h('div', { class: 'screen-scroll' },
        h('div', { class: 'legacy-tree' }, ...branches),
        d.root,
        h('div', { class: 'legacy-footer' },
          this.stats,
          h('div', { class: 'legacy-cta' }, this.cta, h('div', { class: 'bar' }, this.fill, this.barText))),
      ),
    );
  }

  private buySelected() {
    const n = this.selected;
    if (!n) return;
    if (LegacySystem.buy(n.id)) {
      AudioManager.play('sfx_legacy');
      const v = this.nodes.find((x) => x.node === n);
      if (v) flash(v.el, 'is-bought');
    } else {
      AudioManager.ui('sfx_error');
      flash(this.detail.buy, 'is-denied');
    }
    this.update();
  }

  private confirmPrestige() {
    if (!PrestigeSystem.canPrestige()) { AudioManager.ui('sfx_error'); flash(this.cta, 'is-denied'); return; }
    const gain = PrestigeSystem.essenceForReset();
    openModal(this.layer, {
      title: t('legacy.confirm.title'),
      className: 'modal-prestige',
      body: [
        h('img', { class: 'offline-portrait', src: assetUrl('npc_mordecai'), alt: '' }),
        h('p', { class: 'prestige-gain' }, t('legacy.confirm.gain', { n: formatNumber(gain) })),
        h('p', {}, t('legacy.confirm.lose')),
        h('p', {}, t('legacy.confirm.keep')),
      ],
      actions: [
        { label: t('legacy.confirm.cancel') },
        { label: t('legacy.confirm.ok'), primary: true, onClick: () => this.runPrestige(gain) },
      ],
    });
  }

  private runPrestige(gain: number) {
    AudioManager.play('sfx_legacy');
    const veil = h('div', { class: 'lineage-veil' }, h('div', { class: 'lineage-text' }, t('legacy.transition')));
    document.body.append(veil);
    setTimeout(() => {
      PrestigeSystem.performReset();
      bus.emit('toast', { text: t('legacy.started', { n: formatNumber(gain) }), kind: 'reward' });
    }, 1100);
    setTimeout(() => veil.classList.add('is-out'), 1900);
    setTimeout(() => veil.remove(), 2700);
  }

  update() {
    const s = store.state;
    setText(this.essence, formatNumber(s.resources.essence));

    for (const v of this.nodes) {
      const n = v.node;
      const lvl = LegacySystem.level(n.id);
      const unlocked = LegacySystem.isUnlocked(n) && s.unlocks.legacy;
      toggleClass(v.el, 'is-locked', !unlocked);
      toggleClass(v.el, 'is-owned', lvl > 0);
      toggleClass(v.el, 'is-maxed', LegacySystem.isMaxed(n));
      toggleClass(v.el, 'is-affordable', unlocked && LegacySystem.canBuy(n));
      toggleClass(v.el, 'is-selected', this.selected === n);
      setText(v.lvl, lvl > 0 ? `${lvl}/${n.maxLevel}` : '');
    }

    const d = this.detail;
    const n = this.selected;
    if (!n) {
      setText(d.name, '');
      setText(d.desc, t('legacy.selectNode'));
      setText(d.fx, ''); setText(d.req, '');
      d.buy.hidden = true;
    } else {
      const lvl = LegacySystem.level(n.id);
      const maxed = LegacySystem.isMaxed(n);
      setText(d.name, `${t(`legacy.node.${n.id}`)} · ${t('legacy.level', { l: lvl, m: n.maxLevel })}`);
      setText(d.desc, t(`legacy.node.${n.id}.desc`));
      const now = fmtEffect(n.effect, LegacySystem.effect(n.effect));
      const next = maxed ? '' : ` → ${t('legacy.next')}: ${fmtEffect(n.effect, LegacySystem.effect(n.effect, { id: n.id, level: lvl + 1 }))}`;
      setText(d.fx, `${t('legacy.now')}: ${now}${next}`);
      const req = n.requires && LegacySystem.level(n.requires) === 0 ? t('legacy.requires', { name: t(`legacy.node.${LEGACY_BY_ID[n.requires].id}`) }) : '';
      setText(d.req, !s.unlocks.legacy ? t('legacy.locked') : req);
      d.buy.hidden = false;
      d.buy.disabled = maxed;
      setText(d.buy, maxed ? t('legacy.maxed') : `${t('legacy.buy')}  ◆ ${formatNumber(LegacySystem.cost(n))}`);
      toggleClass(d.buy, 'is-affordable', s.unlocks.legacy && LegacySystem.canBuy(n));
    }

    const gain = PrestigeSystem.essenceForReset();
    const can = PrestigeSystem.canPrestige();
    setText(this.cta, can ? t('legacy.newLineageGain', { n: formatNumber(gain) }) : t('legacy.newLineage'));
    this.cta.disabled = !can;
    toggleClass(this.cta, 'is-ready', can);
    if (!s.unlocks.legacy) {
      const p = PrestigeSystem.unlockProgress();
      this.fill.style.width = `${p * 100}%`;
      setText(this.barText, t('legacy.requirement', { n: formatNumber(Progression.legacyUnlockTotalBlood) }) + ` (${Math.floor(p * 100)}%)`);
    } else {
      const next = PrestigeSystem.nextEssenceAt();
      const p = Math.min(1, s.stats.bloodProduced / next);
      this.fill.style.width = `${p * 100}%`;
      setText(this.barText, t('legacy.nextAt', { n: formatNumber(next) }));
    }
    setText(this.stats, t('legacy.stats', { n: s.lifetime.lineages, e: formatNumber(s.lifetime.essenceEarned) }));
  }
}
