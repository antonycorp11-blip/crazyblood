// PLACEHOLDER art for `small_blood_tank` (see ASSETS.md, P0). Drawn procedurally so the liquid level can
// be shown live: a wooden vat with a glass gauge. Final art = body sprite + separate liquid layer.
import Phaser from 'phaser';
import { Colors } from '../core/Constants';
import type { Pt } from './iso';

const RX = 34, RY = 16, H = 58;

export class TankView {
  readonly container: Phaser.GameObjects.Container;
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private glow: Phaser.GameObjects.Image;
  private lastFill = -1;
  private lastScale = 0;
  private full = false;
  private pulse?: Phaser.Tweens.Tween;

  constructor(private scene: Phaser.Scene, readonly base: Pt, onTap?: () => void) {
    this.glow = scene.add.image(0, -H * 0.5, 'glow').setTint(Colors.bloodBright).setAlpha(0).setScale(1.3).setBlendMode(Phaser.BlendModes.ADD);
    this.g = scene.add.graphics();
    this.label = scene.add.text(0, -H - 38, '', {
      fontFamily: 'Nunito, system-ui, sans-serif', fontSize: '15px', fontStyle: '800', color: '#ffe7e7',
      stroke: '#200509', strokeThickness: 4,
    }).setOrigin(0.5).setResolution(2);
    this.container = scene.add.container(base.x, base.y, [this.glow, this.g, this.label]).setDepth(base.y);
    if (!onTap) return; // decorative tank
    // Separate zone for input: generous and independent of the container's scale tween.
    const zone = scene.add.zone(base.x, base.y - H * 0.6, RX * 3.2, H * 2.2).setInteractive({ useHandCursor: true });
    zone.on('pointerup', () => {
      if (this.scene.registry.get('dragging')) return;
      onTap();
    });
  }

  /** Top of the tank in world coords (for FX/labels). */
  top(): Pt {
    return { x: this.base.x, y: this.base.y - H * this.container.scale };
  }

  setScale(s: number) {
    if (s === this.lastScale) return;
    this.lastScale = s;
    this.scene.tweens.add({ targets: this.container, scale: s, duration: 500, ease: 'Back.Out' });
  }

  update(amount: number, capacity: number, label: string) {
    const fill = capacity > 0 ? Math.min(1, amount / capacity) : 0;
    this.label.setText(label);
    const isFull = fill >= 0.999;
    if (isFull !== this.full) {
      this.full = isFull;
      this.pulse?.stop();
      if (isFull) this.pulse = this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.15, to: 0.55 }, duration: 600, yoyo: true, repeat: -1 });
      else this.glow.setAlpha(0);
      this.label.setColor(isFull ? '#ff8a8a' : '#ffe7e7');
    }
    if (Math.abs(fill - this.lastFill) < 0.004) return;
    this.lastFill = fill;
    this.draw(fill);
  }

  /** Little wobble when collected — the tank visibly "gives". */
  bump() {
    this.scene.tweens.add({ targets: this.g, scaleY: 0.9, scaleX: 1.06, yoyo: true, duration: 90, ease: 'Quad.Out' });
  }

  private draw(fill: number) {
    const g = this.g;
    g.clear();
    // shadow
    g.fillStyle(0x000000, 0.35).fillEllipse(4, 2, RX * 2.4, RY * 2.2);
    // back rim + inner dark
    g.fillStyle(0x2b1a12).fillEllipse(0, -H, RX * 2, RY * 2);
    // body
    g.fillStyle(0x4a2e1c).fillRect(-RX, -H, RX * 2, H);
    g.fillStyle(0x4a2e1c).fillEllipse(0, 0, RX * 2, RY * 2);
    // plank shading
    for (let k = -RX + 8; k < RX; k += 11) g.fillStyle(0x3a2316, 0.6).fillRect(k, -H + 2, 2, H);
    g.fillStyle(0x6b4428, 0.5).fillRect(-RX, -H, 7, H);
    // iron bands follow the lower half of the iso ellipse
    for (const y of [-H + 8, -H * 0.5, -8]) {
      const pts: Phaser.Math.Vector2[] = [];
      for (let a = 0; a <= Math.PI + 1e-6; a += Math.PI / 16) pts.push(new Phaser.Math.Vector2(RX * Math.cos(a), y + RY * Math.sin(a)));
      g.lineStyle(4, 0x2a2a30).strokePoints(pts);
      g.lineStyle(1.5, 0x7a7a88, 0.6).strokePoints(pts.slice(3, -3).map((p) => new Phaser.Math.Vector2(p.x, p.y - 1.5)));
    }
    // liquid surface inside the rim (lowers as the tank empties)
    if (fill > 0.01) {
      const depth = (1 - fill) * (RY * 1.2);
      g.fillStyle(0x6e0714).fillEllipse(0, -H + 3 + depth, RX * 1.7, RY * 1.6 - depth * 0.6);
      g.fillStyle(Colors.bloodBright, 0.9).fillEllipse(-4, -H + 1 + depth, RX * 1.3, RY * 1.1 - depth * 0.5);
      g.fillStyle(0xffffff, 0.25).fillEllipse(-12, -H - 1 + depth, 10, 3);
    }
    // front rim
    g.lineStyle(4, 0x2a1a10).strokeEllipse(0, -H, RX * 2, RY * 2);
    g.lineStyle(1.5, 0x8a5a36).strokeEllipse(0, -H - 1, RX * 2 - 3, RY * 2 - 3);
    // glass gauge on the front
    const gx = 10, gw = 9, gh = H - 18, gy = -H + 10;
    g.fillStyle(0x0c0a10).fillRoundedRect(gx - 2, gy - 2, gw + 4, gh + 4, 3);
    g.fillStyle(0x1d1520).fillRect(gx, gy, gw, gh);
    g.fillStyle(fill >= 0.999 ? 0xff4058 : Colors.bloodBright).fillRect(gx, gy + gh * (1 - fill), gw, gh * fill);
    g.fillStyle(0xffffff, 0.25).fillRect(gx + 1, gy, 2, gh);
    // spigot
    g.fillStyle(0x7a7a88).fillRect(-RX + 6, -12, 10, 5);
    g.fillStyle(0x9e0f22).fillCircle(-RX + 6, -9, 3);
  }
}
