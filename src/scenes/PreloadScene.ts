import Phaser from 'phaser';
import { ASSETS, DECAL_KEYS, type AssetDef, type Bundle } from '../data/assets';

// Icons/portraits/screen backgrounds are shown by the DOM UI (the browser loads them lazily),
// so Phaser only loads what the world renders.
const DOM_ONLY = /^assets\/(icons|portraits)\/|^assets\/backgrounds\/(loading|upgrade)_/;

export function queueBundle(scene: Phaser.Scene, bundle: Bundle) {
  for (const [key, def] of Object.entries(ASSETS) as [string, AssetDef][]) {
    if (def.bundle !== bundle || scene.textures.exists(key) || scene.cache.audio.exists(key)) continue;
    if (def.type !== 'audio' && (def.generated || DOM_ONLY.test(def.path))) continue;
    if (def.type === 'image') scene.load.image(key, def.path);
    else if (def.type === 'sheet') scene.load.spritesheet(key, def.path, { frameWidth: def.frameWidth, frameHeight: def.frameHeight });
    else scene.load.audio(key, def.path);
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload'); }

  preload() {
    this.load.on('progress', (v: number) => window.dispatchEvent(new CustomEvent('hemofarm:load', { detail: v })));
    queueBundle(this, 'boot');
    queueBundle(this, 'farm');
    DECAL_KEYS.forEach((k) => this.load.image(k, `assets/decoration/${k}.webp`));
  }

  create() {
    this.makeGeneratedTextures();
    this.makeFxAnims();
    this.scene.start('Farm');
  }

  /** Procedural stand-ins for assets flagged `generated` in data/assets.ts. */
  private makeGeneratedTextures() {
    if (!this.textures.exists('glow')) {
      const size = 128;
      const tex = this.textures.createCanvas('glow', size, size)!;
      const ctx = tex.getContext();
      const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.35, 'rgba(255,255,255,0.45)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, size, size);
      tex.refresh();
    }
  }

  private makeFxAnims() {
    const a = this.anims;
    const def = (key: string, tex: string, end: number, frameRate: number, repeat = 0) => {
      if (!a.exists(key) && this.textures.exists(tex)) a.create({ key, frames: a.generateFrameNumbers(tex, { start: 0, end }), frameRate, repeat });
    };
    def('fx_smoke', 'smoke', 3, 9);
    def('fx_spark', 'purchase_spark', 3, 12);
    def('fx_drop', 'blood_drop_particle', 3, 12);
    def('fx_coins', 'gold_particle', 3, 10);
    def('fx_bats', 'bat_01', 15, 14, -1);
  }
}
