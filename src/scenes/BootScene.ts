import Phaser from 'phaser';

/** Minimal first scene: nothing to load yet — hands off to PreloadScene immediately. */
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.scene.start('Preload');
  }
}
