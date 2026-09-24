// Vampire collectors: the visible face of Auto Collect. They shuttle between the pens and the tank.
// Visual only — the actual collection happens in EconomySystem on a fixed interval.
import Phaser from 'phaser';
import { CHARACTER_SCALE, WORLD_SCALE } from '../core/Constants';
import type { AssetKey } from '../data/assets';
import { iso, type Pt } from '../world/iso';

// PLACEHOLDER: final art is `vampire_collector` (walk + collect + carry bucket).
const TEX: AssetKey = 'vampire_worker_01';

export function createWorkerAnims(scene: Phaser.Scene) {
  const a = scene.anims;
  const def = (key: string, tex: AssetKey, frames: number[], frameRate: number) => {
    if (!a.exists(key) && scene.textures.exists(tex)) a.create({ key, frames: a.generateFrameNumbers(tex, { frames }), frameRate, repeat: -1 });
  };
  def('collector_front', TEX, [0, 1, 2, 3], 8);
  def('collector_back', TEX, [4, 5, 6, 7], 8);
  def('collector_idle', TEX, [8, 9], 2);
  def('collector_work', TEX, [14, 15], 4);
  def('manager_idle', 'vampire_manager', [8, 9], 2);
  def('manager_talk', 'vampire_manager', [10, 11], 3);
}

export class VampireWorker {
  readonly sprite: Phaser.GameObjects.Sprite;
  private bucket: Phaser.GameObjects.Image;
  private alive = true;

  constructor(private scene: Phaser.Scene, private tank: () => Pt, private pickSpot: () => Pt, delay: number) {
    const t = tank();
    this.sprite = scene.add.sprite(t.x + 20, t.y + 16, TEX, 0).setOrigin(0.5, 1).setScale(CHARACTER_SCALE).setDepth(t.y + 16);
    this.sprite.setTint(0xf2e6ff);
    this.bucket = scene.add.image(0, 0, 'blood_bucket').setScale(WORLD_SCALE * 0.32).setVisible(false);
    this.sprite.play('collector_idle');
    this.sprite.setAlpha(0);
    scene.tweens.add({ targets: this.sprite, alpha: 1, duration: 500 });
    scene.time.delayedCall(delay, () => this.goCollect());
  }

  private walkTo(to: Pt, speed: number, done: () => void) {
    if (!this.alive) return;
    const dx = to.x - this.sprite.x, dy = to.y - this.sprite.y;
    this.sprite.play(dy > 0 ? 'collector_front' : 'collector_back', true).setFlipX(dx < 0);
    this.scene.tweens.add({
      targets: this.sprite, x: to.x, y: to.y, duration: (Math.hypot(dx, dy) / speed) * 1000,
      onUpdate: () => this.syncBucket(),
      onComplete: () => this.alive && done(),
    });
  }

  private syncBucket() {
    this.sprite.setDepth(this.sprite.y);
    this.bucket.setPosition(this.sprite.x + (this.sprite.flipX ? -9 : 9), this.sprite.y - 14).setDepth(this.sprite.y + 0.1);
  }

  private goCollect() {
    this.walkTo(this.pickSpot(), 42, () => {
      this.sprite.play('collector_work');
      this.scene.time.delayedCall(1200, () => {
        if (!this.alive) return;
        this.bucket.setVisible(true);
        const t = this.tank();
        this.walkTo({ x: t.x + Phaser.Math.Between(-24, 24), y: t.y + 14 }, 36, () => this.pour());
      });
    });
  }

  private pour() {
    this.sprite.play('collector_work');
    this.scene.time.delayedCall(700, () => {
      if (!this.alive) return;
      this.bucket.setVisible(false);
      this.scene.time.delayedCall(Phaser.Math.Between(200, 1200), () => this.goCollect());
    });
  }

  destroy() {
    this.alive = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.bucket.destroy();
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 300, onComplete: () => this.sprite.destroy() });
  }
}

/** Random point just outside a pen's top fence — where collectors "pick up" blood. */
export function penPickupSpot(pen: { i0: number; j0: number; i1: number; j1: number }): Pt {
  return iso(Phaser.Math.FloatBetween(pen.i0 + 0.5, pen.i1 + 0.5), pen.j0 - 0.35);
}
