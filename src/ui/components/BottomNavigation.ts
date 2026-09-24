import type { ScreenId } from '../../core/Constants';
import { store } from '../../core/Store';
import { assetUrl, type AssetKey } from '../../data/assets';
import { t } from '../../data/localization';
import { PrestigeSystem } from '../../systems/PrestigeSystem';
import { LegacySystem } from '../../systems/LegacySystem';
import { LEGACY_NODES } from '../../data/prestige';
import { h, onTap, setText, toggleClass } from '../dom';

const TABS: { id: ScreenId; icon: AssetKey; label: string }[] = [
  { id: 'farm', icon: 'nav_farm', label: 'nav.farm' },
  { id: 'upgrades', icon: 'nav_upgrades', label: 'nav.upgrades' },
  { id: 'market', icon: 'nav_market', label: 'nav.market' },
  { id: 'legacy', icon: 'nav_legacy', label: 'nav.legacy' },
];

export class BottomNavigation {
  readonly root: HTMLElement;
  private buttons = new Map<ScreenId, { btn: HTMLButtonElement; label: HTMLElement; badge: HTMLElement; lockBar: HTMLElement }>();
  private active: ScreenId = 'farm';

  constructor(private onSelect: (id: ScreenId) => void) {
    this.root = h('nav', { class: 'bottom-nav', 'aria-label': 'Main' });
    for (const tab of TABS) {
      const label = h('span', { class: 'nav-label' });
      const badge = h('span', { class: 'nav-badge', hidden: true });
      const lockBar = h('span', { class: 'nav-lockbar' }, h('span'));
      const btn = h('button', { class: `nav-btn nav-${tab.id}`, 'data-tut': `nav:${tab.id}` },
        h('img', { class: 'nav-icon', src: assetUrl(tab.icon), alt: '' }),
        label, h('img', { class: 'nav-lock', src: assetUrl('legacy_locked'), alt: '' }), badge, lockBar);
      onTap(btn, () => this.onSelect(tab.id), null);
      this.buttons.set(tab.id, { btn, label, badge, lockBar });
      this.root.append(btn);
    }
  }

  setActive(id: ScreenId) {
    this.active = id;
    this.update();
  }

  /** Legacy can be peeked at while sealed (it is the long-term goal); the Market cannot. */
  canOpen(id: ScreenId): boolean {
    return id !== 'market' || store.state.unlocks.market;
  }

  isLocked(id: ScreenId): boolean {
    const u = store.state.unlocks;
    return (id === 'market' && !u.market) || (id === 'legacy' && !u.legacy);
  }

  update() {
    for (const tab of TABS) {
      const b = this.buttons.get(tab.id)!;
      const locked = this.isLocked(tab.id);
      setText(b.label, t(tab.label));
      toggleClass(b.btn, 'is-active', this.active === tab.id);
      toggleClass(b.btn, 'is-locked', locked);
      b.btn.setAttribute('aria-pressed', String(this.active === tab.id));
      // Legacy shows how close it is to unlocking (design doc §41).
      const showBar = tab.id === 'legacy' && locked && PrestigeSystem.unlockProgress() > 0.2;
      b.lockBar.hidden = !showBar;
      if (showBar) (b.lockBar.firstElementChild as HTMLElement).style.width = `${PrestigeSystem.unlockProgress() * 100}%`;
    }
    const market = this.buttons.get('market')!;
    const ready = store.state.contracts.slots.some((c) => c.status === 'AVAILABLE' || c.status === 'ACTIVE');
    market.badge.hidden = this.isLocked('market') || this.active === 'market' || !ready || store.state.flags.marketOpened;
    // Legacy badge: a reset is worth it, or essence can buy something.
    const legacy = this.buttons.get('legacy')!;
    const worth = PrestigeSystem.essenceForReset() >= Math.max(5, store.state.resources.essence * 0.5);
    legacy.badge.hidden = this.isLocked('legacy') || this.active === 'legacy' || !(worth || LEGACY_NODES.some((n) => LegacySystem.canBuy(n)));
  }
}
