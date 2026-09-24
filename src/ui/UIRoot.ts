// Builds the DOM shell over the canvas and wires components. Layout-specific arrangement is pure CSS
// (see ResponsiveLayout + styles.css) — no logic is duplicated between PC and mobile.
import { bus } from '../core/EventBus';
import { store } from '../core/Store';
import { Analytics } from '../core/Analytics';
import type { ScreenId } from '../core/Constants';
import { assetUrl } from '../data/assets';
import { t } from '../data/localization';
import { AudioManager } from '../systems/AudioManager';
import { SaveSystem } from '../systems/SaveSystem';
import { ProductionSystem } from '../systems/ProductionSystem';
import { BottomNavigation } from './components/BottomNavigation';
import { MissionCard } from './components/MissionCard';
import { ResourceBar } from './components/ResourceBar';
import { Toasts } from './components/Toasts';
import { TutorialBubble } from './components/TutorialBubble';
import { UpgradeCard, type CardId } from './components/UpgradeCard';
import { ResponsiveLayout } from './layouts/ResponsiveLayout';
import { LegacyScreen } from './screens/LegacyScreen';
import { MarketScreen } from './screens/MarketScreen';
import { UpgradesScreen } from './screens/UpgradesScreen';
import { openOfflineReport } from './OfflineModal';
import { openSettings, type SettingsHooks } from './SettingsModal';
import { flash, h, onTap } from './dom';

const QUICK: CardId[] = ['buy_human', 'auto_collect', 'expand_estate'];
// The 4th quick slot shows the "next best thing": Delivery Cart until owned, Bigger Tank while the tank
// spills, otherwise Blood Processing.
const FLEX: CardId[] = ['delivery_cart', 'tank_storage', 'blood_processing'];
type Screen = { root: HTMLElement; update(): void };

export class UIRoot {
  readonly root: HTMLElement;
  readonly modalLayer = h('div', { class: 'modal-layer' });
  readonly layout: ResponsiveLayout;
  private resources = new ResourceBar();
  private mission = new MissionCard();
  private quick = QUICK.map((id) => new UpgradeCard(id, 'quick'));
  private flex = FLEX.map((id) => new UpgradeCard(id, 'quick'));
  private banner = h('div', { class: 'milestone-banner', hidden: true });
  private nav: BottomNavigation;
  private tutorial = new TutorialBubble();
  private toasts = new Toasts();
  private screenLayer = h('div', { class: 'screen-layer' });
  private screens = {} as Record<Exclude<ScreenId, 'farm'>, Screen>;
  private current: ScreenId = 'farm';

  constructor(parent: HTMLElement, private hooks: SettingsHooks) {
    this.nav = new BottomNavigation((id) => this.show(id));
    const settingsBtn = h('button', { class: 'icon-btn btn-settings', 'aria-label': t('settings.title') }, h('img', { src: assetUrl('nav_settings'), alt: '' }));
    onTap(settingsBtn, () => openSettings(this.modalLayer, this.hooks));
    const recenter = h('button', { class: 'icon-btn btn-recenter', 'aria-label': 'Recenter' }, '⌖');
    onTap(recenter, () => window.dispatchEvent(new Event('hemofarm:recenter')));
    const farmArea = h('div', { class: 'farm-area' }, recenter);

    this.root = h('div', { id: 'ui', class: 'ui is-hidden', 'data-screen': 'farm' },
      h('header', { class: 'topbar' }, settingsBtn, this.resources.root),
      h('aside', { class: 'side-left' }, this.mission.root),
      farmArea,
      h('aside', { class: 'side-right' }, h('div', { class: 'quick-cards' }, ...this.quick.map((c) => c.root), ...this.flex.map((c) => c.root))),
      this.nav.root,
      this.screenLayer,
      this.tutorial.root,
      this.toasts.root,
      this.banner,
      this.modalLayer,
    );
    parent.append(this.root);
    this.buildScreens();
    this.layout = new ResponsiveLayout(this.root, farmArea);

    bus.on('offline:report', (r) => openOfflineReport(this.modalLayer, r));
    bus.on('state:replaced', () => { this.buildScreens(); this.show('farm'); });
    bus.on('milestone:reached', ({ humans, multiplier }) => this.showMilestone(humans, multiplier));
    bus.on('unlock', ({ feature }) => {
      AudioManager.play('sfx_unlock');
      flash(this.nav.root.querySelector(`.nav-${feature}`) as HTMLElement, 'is-unlocked');
    });
  }

  private buildScreens() {
    this.screenLayer.replaceChildren();
    this.screens = { upgrades: new UpgradesScreen(), market: new MarketScreen(), legacy: new LegacyScreen(this.modalLayer) };
    for (const s of Object.values(this.screens)) { s.root.hidden = true; this.screenLayer.append(s.root); }
  }

  private showMilestone(humans: number, mult: number) {
    AudioManager.play('sfx_legacy');
    this.banner.replaceChildren(
      h('div', { class: 'ms-title' }, t('milestone.title')),
      h('div', { class: 'ms-body' }, t('milestone.body', { n: humans, m: mult })),
    );
    this.banner.hidden = false;
    flash(this.banner, 'is-showing');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => { this.banner.hidden = true; }, 2600);
  }
  private bannerTimer = 0;

  private flexChoice(): CardId {
    if (ProductionSystem.hasAutoCollect() && !ProductionSystem.hasDeliveryCart()) return 'delivery_cart';
    if (ProductionSystem.overflowRatio() > 0.1) return 'tank_storage';
    return 'blood_processing';
  }

  reveal() {
    this.root.classList.remove('is-hidden');
    this.layout.measure();
  }

  show(id: ScreenId) {
    if (!this.nav.canOpen(id)) {
      AudioManager.ui('sfx_error');
      flash(this.nav.root.querySelector(`.nav-${id}`) as HTMLElement, 'is-denied');
      bus.emit('toast', { text: `${t(`nav.${id}`)}: ${t('nav.locked')}`, kind: 'error' });
      return;
    }
    if (id === this.current && id !== 'farm') id = 'farm'; // tapping the active tab returns to the farm
    AudioManager.ui(id === 'farm' ? 'sfx_close' : 'sfx_open');
    this.current = id;
    const f = store.state.flags;
    if (id === 'market') { f.marketOpened = true; Analytics.track('market_opened'); }
    if (id === 'upgrades') f.upgradesOpened = true;
    if (id === 'legacy') { f.legacyTeased = true; Analytics.track('legacy_opened'); }
    for (const [k, s] of Object.entries(this.screens)) {
      const on = k === id;
      if (on && s.root.hidden) { s.root.hidden = false; flash(s.root, 'is-entering'); }
      else if (!on) s.root.hidden = true;
    }
    this.root.dataset.screen = id;
    this.nav.setActive(id);
    AudioManager.playMusic(id === 'market' ? 'music_market' : 'music_farm');
    bus.emit('screen:changed', { screen: id });
    void SaveSystem.save();
    this.update();
  }

  /** Called ~8×/s by the game loop. Only the visible parts are refreshed. */
  update() {
    this.resources.update();
    this.nav.update();
    this.tutorial.update();
    if (this.current === 'farm') {
      this.mission.update();
      for (const c of this.quick) c.update();
      const pick = this.flexChoice();
      for (const c of this.flex) {
        const on = c.id === pick;
        c.root.hidden = !on;
        if (on) { c.setRecommended(pick !== 'blood_processing'); c.update(); }
      }
    } else {
      this.screens[this.current].update();
    }
  }
}
