// A human living in a pen. Purely ambient behaviour, scheduled with timers (no per-frame AI):
// idle / walk / talk / work / sleep, plus the occasional speech bubble.
import Phaser from 'phaser';
import { CHARACTER_SCALE, WORLD_SCALE } from '../core/Constants';
import type { AssetKey } from '../data/assets';
import type { TileRect } from '../data/farmLayout';
import { iso, type Pt } from '../world/iso';

export type HumanAction = 'front' | 'back' | 'idle' | 'talk' | 'work';

interface LookSpec { idle: number[]; talk: number[]; work: number[]; sleep: number }

// 16-frame strips: 0-3 walk toward camera, 4-7 walk away, 8+ actions.
const SHEET_LOOKS: Partial<Record<AssetKey, LookSpec>> = {
  human_male_02: { idle: [8, 9], talk: [10, 11], work: [13, 14], sleep: 15 },
  elderly_human_01: { idle: [8, 9], talk: [10, 11], work: [13, 14], sleep: 15 },
  human_male_03: { idle: [8, 9], talk: [10, 11], work: [14, 15], sleep: 8 },
  human_female_01: { idle: [8, 9], talk: [10, 11], work: [12, 13], sleep: 8 },
};
// 'human_male_01' is split across three sheets (walk front / walk back / actions).
export type Look = 'human_male_01' | 'human_male_02' | 'elderly_human_01' | 'human_male_03' | 'human_female_01';
// Gerald (index 0) is always human_male_02; the rest cycle for variety.
const LOOK_CYCLE: Look[] = ['human_male_02', 'human_male_01', 'human_female_01', 'human_male_03', 'elderly_human_01', 'human_male_01', 'human_female_01'];

export function lookFor(index: number): Look {
  return LOOK_CYCLE[index % LOOK_CYCLE.length];
}

export function createHumanAnims(scene: Phaser.Scene) {
  const a = scene.anims;
  const def = (key: string, tex: string, frames: number[], frameRate: number) => {
    if (!a.exists(key) && scene.textures.exists(tex)) a.create({ key, frames: a.generateFrameNumbers(tex, { frames }), frameRate, repeat: -1 });
  };
  def('human_male_01_front', 'human_male_01_walk_front', [0, 1, 2, 3], 7);
  def('human_male_01_back', 'human_male_01_walk_back', [0, 1, 2, 3], 7);
  def('human_male_01_idle', 'human_male_01_actions', [0, 1], 2);
  def('human_male_01_talk', 'human_male_01_actions', [2, 3], 3);
  def('human_male_01_work', 'human_male_01_actions', [5, 6], 3);
  for (const [k, L] of Object.entries(SHEET_LOOKS) as [string, LookSpec][]) {
    def(`${k}_front`, k, [0, 1, 2, 3], 7);
    def(`${k}_back`, k, [4, 5, 6, 7], 7);
    def(`${k}_idle`, k, L.idle, 2);
    def(`${k}_talk`, k, L.talk, 3);
    def(`${k}_work`, k, L.work, 3);
  }
}

const BUBBLES: AssetKey[] = ['bubble_heart', 'bubble_talk', 'bubble_alert', 'bubble_angry', 'bubble_star'];

export class Human {
  readonly sprite: Phaser.GameObjects.Sprite;
  private bubble?: Phaser.GameObjects.Image;
  private timer?: Phaser.Time.TimerEvent;
  private tween?: Phaser.Tweens.Tween;
  private asleep = false;
  lastTapped = -1e9;

  constructor(private scene: Phaser.Scene, readonly index: number, private pen: TileRect, readonly look: Look = lookFor(index)) {
    const p = this.randomSpot();
    const tex = look === 'human_male_01' ? 'human_male_01_actions' : look;
    this.sprite = scene.add.sprite(p.x, p.y, tex, 0).setOrigin(0.5, 1).setScale(CHARACTER_SCALE);
    this.sprite.setDepth(p.y);
    this.sprite.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-10, -10, this.sprite.width + 20, this.sprite.height + 20), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true });
    this.sprite.setData('human', this);
    this.anim('idle');
    this.schedule(Phaser.Math.Between(200, 2500));
  }

  setPen(pen: TileRect) {
    this.pen = pen;
  }

  private randomSpot(): Pt {
    const i = Phaser.Math.FloatBetween(this.pen.i0 + 0.4, this.pen.i1 + 0.6);
    const j = Phaser.Math.FloatBetween(this.pen.j0 + 0.4, this.pen.j1 + 0.6);
    return iso(i, j);
  }

  private anim(a: HumanAction) {
    this.asleep = false;
    return this.sprite.play(`${this.look}_${a}`, true);
  }

  private sleepPose() {
    this.sprite.stop();
    this.asleep = true;
    if (this.look === 'human_male_01') this.sprite.setTexture('human_male_01_actions', 7);
    else this.sprite.setTexture(this.look, SHEET_LOOKS[this.look]!.sleep);
  }

  private schedule(ms: number) {
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(ms, () => this.decide());
  }

  private decide() {
    const r = Math.random();
    if (r < 0.5) this.walk();
    else if (r < 0.68) { this.anim('talk').setFlipX(Math.random() < 0.5); this.maybeBubble(0.5); this.schedule(Phaser.Math.Between(2000, 4000)); }
    else if (r < 0.8) { this.anim('work').setFlipX(Math.random() < 0.5); this.schedule(Phaser.Math.Between(2000, 3500)); }
    else if (r < 0.9) { this.sleepPose(); this.showBubble('bubble_sleep', 3500); this.schedule(Phaser.Math.Between(5000, 9000)); }
    else { this.anim('idle'); this.maybeBubble(0.3); this.schedule(Phaser.Math.Between(1500, 3500)); }
  }

  private walk() {
    const to = this.randomSpot();
    const dx = to.x - this.sprite.x, dy = to.y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    this.anim(dy > 0 ? 'front' : 'back').setFlipX(dx < 0);
    this.tween?.stop();
    this.tween = this.scene.tweens.add({
      targets: this.sprite, x: to.x, y: to.y, duration: (dist / 28) * 1000,
      onUpdate: () => this.sprite.setDepth(this.sprite.y),
      onComplete: () => { this.anim('idle'); this.schedule(Phaser.Math.Between(800, 2500)); },
    });
  }

  private maybeBubble(chance: number) {
    if (Math.random() < chance) this.showBubble(Phaser.Utils.Array.GetRandom(BUBBLES), 2200);
  }

  showBubble(key: AssetKey, ms: number) {
    this.bubble?.destroy();
    const b = this.scene.add.image(this.sprite.x, this.sprite.y - this.sprite.displayHeight - 6, key).setScale(WORLD_SCALE * 1.4).setDepth(1e6);
    this.bubble = b;
    this.scene.tweens.add({ targets: b, y: b.y - 6, duration: 400, ease: 'Back.Out' });
    this.scene.time.delayedCall(ms, () => {
      if (this.bubble !== b) return;
      this.scene.tweens.add({ targets: b, alpha: 0, duration: 250, onComplete: () => b.destroy() });
      this.bubble = undefined;
    });
  }

  /** Visual reaction to being tapped (the economy part is handled by HumanSystem). */
  squeeze() {
    if (this.asleep) this.anim('idle');
    this.scene.tweens.add({ targets: this.sprite, scaleY: CHARACTER_SCALE * 0.82, scaleX: CHARACTER_SCALE * 1.12, yoyo: true, duration: 90 });
  }

  headPosition(): Pt {
    return { x: this.sprite.x, y: this.sprite.y - this.sprite.displayHeight };
  }

  destroy() {
    this.timer?.remove();
    this.tween?.stop();
    this.bubble?.destroy();
    this.sprite.destroy();
  }
}
