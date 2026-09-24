// The living farm. This scene only renders and forwards taps; all rules live in systems/.
import Phaser from 'phaser';
import { bus } from '../core/EventBus';
import { store } from '../core/Store';
import { EconomySystem } from '../systems/EconomySystem';
import { HumanSystem } from '../systems/HumanSystem';
import { ProductionSystem } from '../systems/ProductionSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { AudioManager } from '../systems/AudioManager';
import { formatNumber } from '../utils/format';
import { Progression } from '../data/progression';
import { TANK_TILE } from '../data/farmLayout';
import { buildFarmMap, DEPTH } from '../world/FarmMap';
import { FarmVisuals } from '../world/FarmVisuals';
import { TankView } from '../world/TankView';
import { CameraController } from '../world/CameraController';
import { FloatingText } from '../world/FloatingText';
import { startAmbience } from '../world/Ambience';
import { getFramingRect, setStageOverride } from '../world/FarmVisualState';
import { createHumanAnims, type Human } from '../entities/Human';
import { createWorkerAnims } from '../entities/VampireWorker';
import { queueBundle } from './PreloadScene';
import { iso } from '../world/iso';

export class FarmScene extends Phaser.Scene {
  private visuals!: FarmVisuals;
  private tank!: TankView;
  private cam!: CameraController;
  private floats!: FloatingText;
  private tutArrow?: Phaser.GameObjects.Container;
  private lastFramingKey = '';

  constructor() { super('Farm'); }

  create() {
    createHumanAnims(this);
    createWorkerAnims(this);
    buildFarmMap(this);

    const tankBase = iso(TANK_TILE.i, TANK_TILE.j);
    this.tank = new TankView(this, tankBase, () => this.collectTank());
    this.visuals = new FarmVisuals(this, () => this.tank.base);
    this.floats = new FloatingText(this);
    this.cam = new CameraController(this);
    this.visuals.sync();
    this.reframe(true);
    startAmbience(this);

    this.input.on('gameobjectup', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (this.registry.get('dragging')) return;
      const h = this.visuals.humanAt(obj);
      if (h) this.tapHuman(h);
    });

    const offs = [
      bus.on('human:bought', () => { this.visuals.sync(); this.reframe(false); }),
      bus.on('upgrade:bought', ({ id }) => this.onUpgrade(id)),
      bus.on('resources:changed', () => this.visuals.sync()),
      bus.on('state:replaced', () => this.scene.restart()),
      bus.on('layout:changed', ({ farmArea }) => this.cam.setArea(farmArea)),
      bus.on('blood:collected', ({ amount, manual }) => this.onCollected(amount, manual)),
      bus.on('tutorial:changed', () => this.syncTutorialArrow()),
      bus.on('milestone:reached', ({ multiplier }) => this.celebrate(multiplier)),
      bus.on('debug:setStage', ({ stage }) => { setStageOverride(stage); this.scene.restart(); }),
    ];
    const recenter = () => this.cam.recenter();
    window.addEventListener('hemofarm:recenter', recenter);
    this.events.once('shutdown', () => { offs.forEach((off) => off()); window.removeEventListener('hemofarm:recenter', recenter); });

    const area = this.registry.get('farmArea');
    if (area) this.cam.setArea(area);
    this.syncTutorialArrow();

    // Lazy-load the Market bundle once the farm is up.
    queueBundle(this, 'market');
    this.load.start();
    AudioManager.playMusic('music_farm');
  }

  update(_time: number, deltaMs: number) {
    const cap = ProductionSystem.tankCapacity();
    const s = store.state;
    const label = EconomySystem.isTankFull() && !ProductionSystem.hasAutoCollect()
      ? `${formatNumber(cap)}/${formatNumber(cap)} ⚠`
      : `${formatNumber(Math.floor(s.tank))}/${formatNumber(cap)}`;
    this.tank.update(s.tank, cap, label);
    for (const extra of this.visuals.extraTanks) extra.update(s.tank, cap, '');
    this.tank.setScale(this.visuals.current.tankScale);
    this.cam.update(deltaMs / 1000);
  }

  private reframe(instant: boolean) {
    const r = getFramingRect(this.visuals.current);
    const key = `${r.i0},${r.j0},${r.i1},${r.j1}`;
    if (key === this.lastFramingKey) return;
    this.lastFramingKey = key;
    this.cam.setFraming(r, instant);
  }

  private collectTank() {
    const got = EconomySystem.collectTank(true);
    if (got <= 0) {
      this.tank.bump();
      return;
    }
  }

  private onCollected(amount: number, manual: boolean) {
    this.tank.bump();
    const top = this.tank.top();
    this.floats.show(top.x, top.y - 10, `+${formatNumber(amount)}`, '#ff5a6e', manual ? 22 : 16);
    if (manual) {
      AudioManager.play('sfx_blood_collect');
      this.spawnDrops(top.x, top.y, 3);
    } else if (!store.state.settings.reducedEffects) {
      this.spawnDrops(top.x, top.y, 1);
    }
  }

  private spawnDrops(x: number, y: number, n: number) {
    if (store.state.settings.reducedEffects) n = Math.min(n, 1);
    for (let k = 0; k < n; k++) {
      const d = this.add.sprite(x + Phaser.Math.Between(-18, 18), y + Phaser.Math.Between(-4, 8), 'blood_drop_particle', 0)
        .setScale(0.28).setDepth(DEPTH.fx);
      d.play('fx_drop').once('animationcomplete', () => d.destroy());
    }
  }

  private tapHuman(h: Human) {
    const now = this.time.now;
    if (now - h.lastTapped < Progression.humanTapCooldownSec * 1000) return;
    h.lastTapped = now;
    const got = HumanSystem.tap();
    h.squeeze();
    const head = h.headPosition();
    if (got > 0) {
      this.floats.show(head.x, head.y - 4, `+${formatNumber(got)}`, '#ff7b8b', 16);
      this.spawnDrops(head.x, head.y + 10, 1);
      AudioManager.play('sfx_blood_collect', 'sfx', 1.3);
    } else {
      this.floats.show(head.x, head.y - 4, 'FULL', '#ffb0b0', 13);
    }
  }

  private onUpgrade(id: string) {
    this.visuals.sync();
    this.reframe(false);
    const top = this.tank.top();
    if (id === 'blood_processing' || id === 'tank_storage') this.visuals.sparkle({ x: top.x, y: top.y + 10 });
    if (id === 'auto_collect') this.visuals.puff({ x: top.x + 30, y: top.y + 50 });
  }

  /** Population milestone: every human sparkles, the tank shouts the new multiplier. */
  private celebrate(mult: number) {
    const reduced = store.state.settings.reducedEffects;
    const top = this.tank.top();
    this.floats.show(top.x, top.y - 30, `×${mult}!`, '#f2c14e', 34);
    if (reduced) return;
    this.cameras.main.flash(300, 90, 10, 20);
    this.visuals.humans.slice(0, 20).forEach((h, k) => {
      this.time.delayedCall(k * 60, () => { this.visuals.sparkle(h.headPosition()); h.showBubble('bubble_star', 1800); });
    });
  }

  // Bouncing arrow over the tank while the tutorial asks the player to tap it.
  private syncTutorialArrow() {
    const view = TutorialSystem.view();
    const want = view?.target === 'world:tank';
    if (want && !this.tutArrow) {
      const top = this.tank.top();
      const g = this.add.graphics();
      g.fillStyle(0xf2c14e).fillTriangle(-14, -22, 14, -22, 0, 0).lineStyle(3, 0x3a1a00).strokeTriangle(-14, -22, 14, -22, 0, 0);
      const ring = this.add.ellipse(0, 70, 110, 50).setStrokeStyle(3, 0xf2c14e, 0.9);
      this.tutArrow = this.add.container(top.x, top.y - 50, [ring, g]).setDepth(DEPTH.ui);
      this.tweens.add({ targets: g, y: -12, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: ring, scale: 1.15, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
    } else if (!want && this.tutArrow) {
      this.tutArrow.destroy();
      this.tutArrow = undefined;
    }
  }
}
