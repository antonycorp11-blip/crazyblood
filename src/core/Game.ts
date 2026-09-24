// Bootstraps everything and owns the wall-clock game loop. The loop is independent from Phaser's render
// loop: economy advances by real elapsed time, and big gaps (tab hidden, device asleep) go through the
// offline path instead of being "played back" frame by frame.
import Phaser from 'phaser';
import { bus } from './EventBus';
import { store } from './Store';
import { Analytics } from './Analytics';
import { AUTOSAVE_INTERVAL_MS, IS_DEV, OFFLINE_GAP_SEC } from './Constants';
import { createNewState } from './GameState';
import { createPhaserConfig } from './GameConfig';
import { setLocale, t } from '../data/localization';
import { EconomySystem } from '../systems/EconomySystem';
import { ContractSystem } from '../systems/ContractSystem';
import { MissionSystem } from '../systems/MissionSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { PrestigeSystem } from '../systems/PrestigeSystem';
import { HintSystem } from '../systems/HintSystem';
import { OfflineProgressSystem } from '../systems/OfflineProgressSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioManager } from '../systems/AudioManager';
import { platform } from '../platform/PlatformAdapter';
import { UIRoot } from '../ui/UIRoot';
import { showTitle } from '../ui/TitleScreen';
import { openSettings } from '../ui/SettingsModal';

const UI_TICK_MS = 125;

export class Game {
  private ui!: UIRoot;
  private phaser!: Phaser.Game;
  private running = false;
  private lastTick = 0;
  private lastUi = 0;
  private lastSave = 0;
  private hadSave = false;
  private prevUnlocks = { market: false, legacy: false };
  private saveStatus = 'not saved';

  async boot() {
    await platform.init();
    const saved = await SaveSystem.load();
    this.hadSave = !!saved;
    store.state = saved ?? createNewState();
    setLocale(store.state.settings.language);
    this.prevUnlocks = { ...store.state.unlocks };
    Analytics.track('game_started', { returning: this.hadSave });

    const hooks = { onReset: () => void this.resetSave(), onImport: (code: string) => this.importSave(code) };
    this.ui = new UIRoot(document.body, hooks);
    this.phaser = new Phaser.Game(createPhaserConfig(document.getElementById('game')!));
    AudioManager.attach(this.phaser.sound);

    bus.on('layout:changed', ({ farmArea }) => this.phaser.registry.set('farmArea', farmArea));
    this.phaser.registry.set('farmArea', this.ui.layout.farmArea);
    bus.on('save:status', ({ at }) => { this.saveStatus = `saved ${new Date(at).toLocaleTimeString()}`; });
    bus.on('settings:changed', () => { setLocale(store.state.settings.language); void SaveSystem.save(); });
    bus.on('lineage:started', () => void SaveSystem.save());

    this.hookLifecycle();
    platform.onPauseChange((paused) => {
      if (paused) { AudioManager.stopMusic(); SaveSystem.saveSync(); } else AudioManager.playMusic('music_farm');
    });
    // Dev tools: always on desktop dev builds; on touch devices only with ?dev in the URL (keeps phones clean).
    const wantDev = IS_DEV && (/[?&]dev\b/.test(location.search) || !matchMedia('(pointer: coarse)').matches);
    if (IS_DEV) (window as unknown as { __hemo: unknown }).__hemo = { game: this.phaser, store };
    if (wantDev) {
      const { mountDebug } = await import('../ui/DebugPanel');
      mountDebug(document.body, {
        resetSave: () => void this.resetSave(),
        getLayout: () => this.ui.layout.mode + (this.ui.layout.compact ? ' (compact)' : ''),
        saveStatus: () => this.saveStatus,
      });
    }

    await this.waitForAssets();
    showTitle(document.body, this.hadSave, () => this.start(), () => openSettings(this.ui.modalLayer, hooks));
  }

  private waitForAssets(): Promise<void> {
    const loader = document.getElementById('loading');
    const fill = loader?.querySelector<HTMLElement>('.fill');
    window.addEventListener('hemofarm:load', (e) => { if (fill) fill.style.width = `${(e as CustomEvent<number>).detail * 100}%`; });
    return new Promise((resolve) => {
      const check = () => {
        if (this.phaser.scene.isActive('Farm')) {
          loader?.classList.add('is-done');
          setTimeout(() => loader?.remove(), 500);
          resolve();
        } else requestAnimationFrame(check);
      };
      check();
    });
  }

  private start() {
    this.ui.reveal();
    AudioManager.playMusic('music_farm');
    if (this.hadSave) OfflineProgressSystem.apply((Date.now() - store.state.lastSaveTimestamp) / 1000);
    this.running = true;
    this.lastTick = performance.now();
    this.lastSave = Date.now();
    platform.gameplayStart();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  private loop(ts: number) {
    if (!this.running) return;
    const dt = (ts - this.lastTick) / 1000;
    this.lastTick = ts;
    if (dt > OFFLINE_GAP_SEC) OfflineProgressSystem.apply(dt);
    else if (dt > 0) EconomySystem.tick(dt);

    if (ts - this.lastUi >= UI_TICK_MS) {
      this.lastUi = ts;
      this.systemsUpdate();
      this.ui.update();
    }
    if (Date.now() - this.lastSave >= AUTOSAVE_INTERVAL_MS) {
      this.lastSave = Date.now();
      void SaveSystem.save();
    }
    requestAnimationFrame((t2) => this.loop(t2));
  }

  /** Low-frequency rules: contracts, missions, tutorial, unlocks. */
  private systemsUpdate() {
    const s = store.state;
    TutorialSystem.update();
    ContractSystem.update();
    MissionSystem.update();
    PrestigeSystem.update();
    HintSystem.update();
    if (s.unlocks.market && !this.prevUnlocks.market) {
      bus.emit('unlock', { feature: 'market' });
      bus.emit('toast', { text: t('toast.marketUnlocked'), kind: 'reward' });
      bus.emit('resources:changed');
    }
    this.prevUnlocks = { ...s.unlocks };
  }

  private hookLifecycle() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        SaveSystem.saveSync();
        platform.gameplayStop();
        Analytics.track('session_end', { reason: 'hidden' });
      } else if (this.running) {
        platform.gameplayStart();
      }
    });
    window.addEventListener('pagehide', () => SaveSystem.saveSync());
    window.addEventListener('beforeunload', () => SaveSystem.saveSync());
    window.addEventListener('blur', () => { if (this.running) SaveSystem.saveSync(); });
  }

  private async resetSave() {
    await SaveSystem.resetSave();
    TutorialSystem.reset();
    store.replace(createNewState(Date.now(), store.state.settings));
    this.prevUnlocks = { ...store.state.unlocks };
    await SaveSystem.save();
  }

  private importSave(code: string): boolean {
    const state = SaveSystem.importSave(code);
    if (!state) return false;
    TutorialSystem.reset();
    store.replace(state);
    setLocale(state.settings.language);
    this.prevUnlocks = { ...state.unlocks };
    void SaveSystem.save();
    return true;
  }
}
