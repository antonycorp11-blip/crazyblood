// Pooled "+12" pop-ups in the world. Capped so they never pile up into noise.
import Phaser from 'phaser';
import { DEPTH } from './FarmMap';

const MAX_ACTIVE = 8;

export class FloatingText {
  private pool: Phaser.GameObjects.Text[] = [];
  private active = 0;

  constructor(private scene: Phaser.Scene) {}

  show(x: number, y: number, text: string, color = '#ff5a6e', size = 18) {
    if (this.active >= MAX_ACTIVE) return;
    let t = this.pool.pop();
    if (!t) {
      t = this.scene.add.text(0, 0, '', {
        fontFamily: 'Nunito, system-ui, sans-serif', fontStyle: '900', stroke: '#16050a', strokeThickness: 5,
      }).setOrigin(0.5).setResolution(2).setDepth(DEPTH.fx + 50);
    }
    this.active++;
    const zoom = this.scene.cameras.main.zoom;
    t.setText(text).setColor(color).setFontSize(size).setPosition(x, y).setAlpha(1).setVisible(true).setScale(1 / Math.max(0.6, zoom));
    this.scene.tweens.add({
      targets: t, y: y - 46 / Math.max(0.6, zoom), alpha: 0, duration: 1100, ease: 'Cubic.Out',
      onComplete: () => { t!.setVisible(false); this.pool.push(t!); this.active--; },
    });
  }
}
