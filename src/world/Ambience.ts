// Things that happen when nobody touches the screen: bats, fireflies, a drifting mist.
// Low update rates on purpose — ambience does not need 60 Hz.
import Phaser from 'phaser';
import { store } from '../core/Store';
import { bus } from '../core/EventBus';
import { ESTATE } from '../data/farmLayout';
import { DEPTH } from './FarmMap';
import { iso } from './iso';

export function startAmbience(scene: Phaser.Scene) {
  const reduced = () => store.state.settings.reducedEffects;

  // Bats cross the sky every so often.
  scene.time.addEvent({
    delay: 9000, loop: true, startAt: 6000,
    callback: () => {
      if (reduced()) return;
      const from = iso(ESTATE.i0 - 2, Phaser.Math.Between(ESTATE.j0, ESTATE.j1));
      const to = iso(ESTATE.i1 + 2, Phaser.Math.Between(ESTATE.j0 - 6, ESTATE.j0 + 4));
      const bat = scene.add.sprite(from.x, from.y - 200, 'bat_01', 0).setScale(0.5).setDepth(DEPTH.fx + 10).setAlpha(0.9);
      bat.play('fx_bats');
      scene.tweens.add({ targets: bat, x: to.x, y: to.y - 320, duration: 9000, ease: 'Sine.InOut', onComplete: () => bat.destroy() });
    },
  });

  // Fireflies / will-o'-the-wisps drifting over the estate.
  const a = iso(ESTATE.i0, ESTATE.j1), b = iso(ESTATE.i1, ESTATE.j0), top = iso(ESTATE.i0, ESTATE.j0), bottom = iso(ESTATE.i1, ESTATE.j1);
  const emitter = scene.add.particles(0, 0, 'glow', {
    x: { min: a.x, max: b.x }, y: { min: top.y, max: bottom.y },
    lifespan: 6000, speedX: { min: -8, max: 8 }, speedY: { min: -14, max: -4 },
    scale: { start: 0.08, end: 0.02 }, alpha: { start: 0.9, end: 0 },
    tint: [0xffe9a8, 0xc8ffb0, 0xffb0d0], blendMode: Phaser.BlendModes.ADD, frequency: 450, quantity: 1,
  }).setDepth(DEPTH.fx);
  const sync = () => {
    emitter.setVisible(!reduced());
    if (reduced()) emitter.stop(); else emitter.start();
  };
  sync();
  const off = bus.on('settings:changed', sync);
  scene.events.once('shutdown', off);
}
