// Dynamic layer: everything that appears as the farm grows (roads, pens, buildings, lights, carts,
// humans and collectors). sync() diffs the derived FarmVisualState against what is on screen, so any
// progress change — purchase, load, debug stage — ends up looking right.
import Phaser from 'phaser';
import { CHARACTER_SCALE, Colors, WORLD_SCALE } from '../core/Constants';
import { store } from '../core/Store';
import type { AssetKey } from '../data/assets';
import { BUILDINGS, ESTATE, EXTRA_TANK_TILES, GATE, MORDECAI_TILE, PENS, PIPE_TARGETS, ROADS, SMALL_CART_TILE, TANK_TILE, WAGON_PATH, type BuildingId, type TileRect } from '../data/farmLayout';
import { Human, lookFor } from '../entities/Human';
import { TankView } from './TankView';
import { VampireWorker, penPickupSpot } from '../entities/VampireWorker';
import { getFarmVisualState, type FarmVisualState } from './FarmVisualState';
import { DEPTH } from './FarmMap';
import { iso, tileCenter, type Pt } from './iso';

/** Humans with their own behaviour. Past this, a cheaper crowd (animation only, no AI) fills the pens. */
export const MAX_VISIBLE_HUMANS = 40;
const MAX_CROWD = 160;

export class FarmVisuals {
  private pensBuilt = 0;
  private roadsBuilt = new Set<number>();
  private buildings = new Map<BuildingId, Phaser.GameObjects.Image>();
  readonly humans: Human[] = [];
  private collectors: VampireWorker[] = [];
  private smallCart?: Phaser.GameObjects.Image;
  private wagonTimer?: Phaser.Time.TimerEvent;
  private crowd: Phaser.GameObjects.Sprite[] = [];
  private palisadeBuilt = false;
  private pipesBuilt = new Set<BuildingId>();
  readonly extraTanks: TankView[] = [];
  private first = true;
  current!: FarmVisualState;

  constructor(private scene: Phaser.Scene, private tankPos: () => Pt) {
    // Mordecai, the overseer, loiters by the tank.
    const m = iso(MORDECAI_TILE.i, MORDECAI_TILE.j);
    const mord = scene.add.sprite(m.x, m.y, 'vampire_manager', 8).setOrigin(0.5, 1).setScale(CHARACTER_SCALE).setDepth(m.y).setFlipX(true);
    mord.play('manager_idle');
    scene.time.addEvent({ delay: 7000, loop: true, callback: () => {
      mord.play(Math.random() < 0.5 ? 'manager_talk' : 'manager_idle');
    } });
    // Cabin torches are always lit.
    this.addTorch(iso(10.3, 11.2));
    this.addTorch(iso(7.8, 8.2));
  }

  private get reduced() { return store.state.settings.reducedEffects; }

  sync() {
    const v = getFarmVisualState(store.state);
    this.current = v;
    const animate = !this.first;

    ROADS.forEach((r, idx) => {
      if (v.pens >= r.minPens && !this.roadsBuilt.has(idx)) { this.roadsBuilt.add(idx); this.paintRect(r.rect, 'path_dirt', animate); }
    });
    while (this.pensBuilt < v.pens) this.buildPen(this.pensBuilt++, animate);

    for (const id of v.buildings) {
      if (!this.buildings.has(id)) this.buildings.set(id, this.placeBuilding(id, animate));
    }

    this.syncHumans(v, animate);
    this.syncCrowd(v, animate);
    this.syncCollectors(v);
    if (v.palisade && !this.palisadeBuilt) { this.palisadeBuilt = true; this.buildPalisade(animate); }
    if (v.pipes) for (const id of PIPE_TARGETS) if (v.buildings.includes(id) && !this.pipesBuilt.has(id)) { this.pipesBuilt.add(id); this.buildPipe(id, animate); }
    while (this.extraTanks.length < v.extraTanks) {
      const tt = EXTRA_TANK_TILES[this.extraTanks.length];
      const tank = new TankView(this.scene, iso(tt.i, tt.j));
      tank.setScale(0.85);
      this.extraTanks.push(tank);
      if (animate) { this.pop(tank.container, true); this.puff(iso(tt.i, tt.j)); }
    }

    if (v.smallCart && !this.smallCart) {
      const p = iso(SMALL_CART_TILE.i, SMALL_CART_TILE.j);
      this.smallCart = this.pop(this.scene.add.image(p.x, p.y, 'small_cart').setOrigin(0.5, 0.9).setScale(WORLD_SCALE).setDepth(p.y), animate);
    }
    if (v.wagonTraffic && !this.wagonTimer) {
      this.wagonTimer = this.scene.time.addEvent({ delay: 26000, loop: true, startAt: 20000, callback: () => this.runWagon() });
    }
    this.first = false;
  }

  // ---------- pieces

  private paintRect(r: TileRect, tex: AssetKey, animate: boolean) {
    for (let i = r.i0; i <= r.i1; i++) for (let j = r.j0; j <= r.j1; j++) {
      const p = tileCenter(i, j);
      const img = this.scene.add.image(p.x, p.y, tex).setScale(WORLD_SCALE * 1.02).setDepth(DEPTH.groundOverlay);
      if (animate) { img.setAlpha(0); this.scene.tweens.add({ targets: img, alpha: 1, duration: 500, delay: (i - r.i0 + j - r.j0) * 30 }); }
    }
  }

  private buildPen(index: number, animate: boolean) {
    const p = PENS[index];
    this.paintRect(p, 'ground_dirt', animate);
    const pieces: Phaser.GameObjects.Image[] = [];
    const put = (k: AssetKey, x: number, y: number, depth = y) =>
      pieces.push(this.scene.add.image(x, y, k).setOrigin(0.5, 1).setScale(WORLD_SCALE).setDepth(depth));
    const gateAt = p.i0 + 1; // gap in the top fence where collectors come to pick up
    for (let t = p.j0; t <= p.j1; t++) for (const i of [p.i0, p.i1 + 1]) { const m = iso(i, t + 0.5); put('fence_wood_ne', m.x, m.y + 18, m.y); }
    for (let t = p.i0; t <= p.i1; t++) for (const j of [p.j0, p.j1 + 1]) {
      if (j === p.j0 && t === gateAt) continue;
      const m = iso(t + 0.5, j); put('fence_wood_nw', m.x, m.y + 18, m.y);
    }
    for (const [ci, cj] of [[p.i0, p.j0], [p.i1 + 1, p.j0], [p.i0, p.j1 + 1], [p.i1 + 1, p.j1 + 1]]) {
      const c = iso(ci, cj); put('fence_wood_post', c.x, c.y + 6, c.y + 1);
    }
    const mat = iso(p.i1 + 0.4, p.j0 + 0.6); put('mattress_pile', mat.x, mat.y + 10);
    if (index >= 1) { const b = iso(p.i1 + 1.15, p.j0 - 0.15); put('banner_red', b.x, b.y); }
    if (index >= 2) { const h = iso(p.i0 + 0.7, p.j1 + 0.5); put('harvest_basket', h.x, h.y + 6); }
    this.addTorch(iso(p.i1 + 1.35, p.j0 + 0.2));
    if (animate) {
      for (const img of pieces) this.pop(img, true, Phaser.Math.Between(0, 350));
      this.puff(tileCenter((p.i0 + p.i1) / 2, (p.j0 + p.j1) / 2));
    }
  }

  private placeBuilding(id: BuildingId, animate: boolean): Phaser.GameObjects.Image {
    const f = BUILDINGS[id].footprint;
    const front = iso(f.i1 + 1, f.j1 + 1);
    const img = this.scene.add.image(front.x, front.y + 6, BUILDINGS[id].texture).setOrigin(0.5, 1).setScale(WORLD_SCALE).setDepth(front.y - 20);
    if (animate) {
      // Brief scaffold, then the building pops in.
      img.setVisible(false);
      const site = this.scene.add.image(front.x, front.y + 6, 'construction_small').setOrigin(0.5, 1).setScale(WORLD_SCALE * 0.8).setDepth(front.y - 20);
      this.scene.time.delayedCall(900, () => {
        site.destroy();
        img.setVisible(true);
        this.pop(img, true);
        this.puff({ x: front.x, y: front.y - 40 });
      });
    }
    return img;
  }

  private addTorch(p: Pt) {
    this.scene.add.image(p.x, p.y, 'torch').setOrigin(0.5, 0.97).setScale(WORLD_SCALE).setDepth(p.y);
    const glow = this.scene.add.image(p.x, p.y - 44, 'glow').setTint(Colors.torchLight).setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.5).setScale(0.9).setDepth(DEPTH.fx);
    if (!this.reduced) {
      this.scene.tweens.add({ targets: glow, alpha: { from: 0.35, to: 0.6 }, scale: { from: 0.85, to: 1 }, duration: Phaser.Math.Between(180, 320), yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }
  }

  private syncHumans(v: FarmVisualState, animate: boolean) {
    const want = Math.min(store.state.humans, MAX_VISIBLE_HUMANS);
    while (this.humans.length > want) this.humans.pop()!.destroy();
    while (this.humans.length < want) {
      const idx = this.humans.length;
      const h = new Human(this.scene, idx, PENS[idx % v.pens]);
      this.humans.push(h);
      if (animate) {
        this.pop(h.sprite, true);
        h.showBubble('bubble_heart', 1800);
        this.sparkle(h.headPosition());
      }
    }
    // New pens redistribute the population.
    this.humans.forEach((h, idx) => h.setPen(PENS[idx % v.pens]));
  }

  /** Crowd representation: beyond the AI humans, cheap animated extras fill the pens (no timers, no input). */
  private syncCrowd(v: FarmVisualState, animate: boolean) {
    const want = Math.min(Math.max(0, store.state.humans - MAX_VISIBLE_HUMANS), MAX_CROWD);
    while (this.crowd.length > want) this.crowd.pop()!.destroy();
    while (this.crowd.length < want) {
      const idx = MAX_VISIBLE_HUMANS + this.crowd.length;
      const pen = PENS[idx % v.pens];
      const p = iso(Phaser.Math.FloatBetween(pen.i0 + 0.3, pen.i1 + 0.7), Phaser.Math.FloatBetween(pen.j0 + 0.3, pen.j1 + 0.7));
      const look = lookFor(idx);
      const tex = look === 'human_male_01' ? 'human_male_01_actions' : look;
      const spr = this.scene.add.sprite(p.x, p.y, tex, 0).setOrigin(0.5, 1).setScale(CHARACTER_SCALE).setDepth(p.y).setFlipX(Math.random() < 0.5);
      spr.play({ key: `${look}_${Phaser.Utils.Array.GetRandom(['idle', 'idle', 'talk', 'work'])}`, startFrame: Phaser.Math.Between(0, 1) });
      this.crowd.push(spr);
      if (animate) this.pop(spr, true);
    }
  }

  private buildPalisade(animate: boolean) {
    const E = ESTATE;
    const pieces: Phaser.GameObjects.Image[] = [];
    const put = (k: AssetKey, x: number, y: number, depth = y) =>
      pieces.push(this.scene.add.image(x, y, k).setOrigin(0.5, 1).setScale(WORLD_SCALE).setDepth(depth));
    for (let t = E.j0; t <= E.j1; t++) for (const i of [E.i0, E.i1 + 1]) { const m = iso(i, t + 0.5); put('palisade_ne', m.x, m.y + 18, m.y); }
    for (let t = E.i0; t <= E.i1; t++) for (const j of [E.j0, E.j1 + 1]) {
      if (j === E.j1 + 1 && t >= GATE.gapFrom && t <= GATE.gapTo) continue;
      const m = iso(t + 0.5, j); put('palisade_nw', m.x, m.y + 18, m.y);
    }
    for (const [ci, cj] of [[E.i0, E.j0], [E.i1 + 1, E.j0], [E.i0, E.j1 + 1], [E.i1 + 1, E.j1 + 1]]) {
      const c = iso(ci, cj); put('palisade_post', c.x, c.y + 6, c.y + 1);
    }
    const g = iso(GATE.i, E.j1 + 1);
    put('fence_gate', g.x, g.y + 72, g.y + 8);
    this.addTorch(iso(GATE.gapFrom - 0.3, E.j1 + 1.6));
    this.addTorch(iso(GATE.gapTo + 1.3, E.j1 + 1.6));
    if (animate) pieces.forEach((img, k) => this.pop(img, true, k * 12));
  }

  /** Iso pipe from the main tank to a processing building, with blood "flowing" along it. */
  private buildPipe(id: BuildingId, animate: boolean) {
    const f = BUILDINGS[id].footprint;
    const a = iso(TANK_TILE.i + 0.35, TANK_TILE.j + 0.25);
    const corner = iso(f.i0 - 0.2, TANK_TILE.j + 0.25);
    const b = iso(f.i0 - 0.2, f.j1 + 0.6);
    const pts = [a, corner, b];
    const g = this.scene.add.graphics().setDepth(DEPTH.groundOverlay + 1);
    const stroke = (w: number, c: number, dy: number) => {
      g.lineStyle(w, c).beginPath().moveTo(pts[0].x, pts[0].y + dy);
      for (const p of pts.slice(1)) g.lineTo(p.x, p.y + dy);
      g.strokePath();
    };
    stroke(9, 0x1a0c0c, 1); stroke(6, 0x5a1a1f, 0); stroke(2, 0xb3434d, -2);
    for (const p of pts) g.fillStyle(0x2a2a30).fillCircle(p.x, p.y, 6).fillStyle(0x7a7a88).fillCircle(p.x - 1, p.y - 1, 2.5);
    if (animate) { g.setAlpha(0); this.scene.tweens.add({ targets: g, alpha: 1, duration: 600 }); }
    if (this.reduced) return;
    // Flow: glowing drops travelling tank → building.
    for (let k = 0; k < 3; k++) {
      const drop = this.scene.add.image(a.x, a.y, 'glow').setTint(0xff2a3c).setScale(0.09).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.groundOverlay + 2);
      const run = () => {
        drop.setPosition(a.x, a.y);
        this.scene.tweens.chain({ targets: drop, tweens: [
          { x: corner.x, y: corner.y, duration: Phaser.Math.Distance.BetweenPoints(a, corner) * 14 },
          { x: b.x, y: b.y, duration: Phaser.Math.Distance.BetweenPoints(corner, b) * 14, onComplete: run },
        ] });
      };
      this.scene.time.delayedCall(k * 900, run);
    }
  }

  private syncCollectors(v: FarmVisualState) {
    while (this.collectors.length > v.collectors) this.collectors.pop()!.destroy();
    while (this.collectors.length < v.collectors) {
      const pens = () => PENS[Math.floor(Math.random() * this.current.pens)];
      this.collectors.push(new VampireWorker(this.scene, this.tankPos, () => penPickupSpot(pens()), this.collectors.length * 900));
    }
  }

  private runWagon() {
    const [a, b] = WAGON_PATH.map((p) => iso(p.i, p.j));
    const w = this.scene.add.image(a.x, a.y, 'delivery_wagon').setOrigin(0.5, 0.9).setScale(WORLD_SCALE * 0.9).setFlipX(true);
    const go = (to: Pt, flip: boolean, done: () => void) => {
      w.setFlipX(flip);
      this.scene.tweens.add({ targets: w, x: to.x, y: to.y, duration: 9000, ease: 'Sine.InOut', onUpdate: () => w.setDepth(w.y), onComplete: done });
    };
    go(b, true, () => this.scene.time.delayedCall(1800, () => go(a, false, () => w.destroy())));
  }

  // ---------- small FX helpers

  pop<T extends Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject>(obj: T, animate: boolean, delay = 0): T {
    if (!animate) return obj;
    const sx = obj.scaleX, sy = obj.scaleY;
    obj.setScale(0);
    this.scene.tweens.add({ targets: obj, scaleX: sx, scaleY: sy, duration: 420, delay, ease: 'Back.Out' });
    return obj;
  }

  puff(p: Pt) {
    if (this.reduced) return;
    const s = this.scene.add.sprite(p.x, p.y, 'smoke', 0).setScale(WORLD_SCALE * 1.4).setDepth(DEPTH.fx).setAlpha(0.8);
    s.play('fx_smoke').once('animationcomplete', () => s.destroy());
  }

  sparkle(p: Pt) {
    if (this.reduced) return;
    const s = this.scene.add.sprite(p.x, p.y, 'purchase_spark', 0).setScale(WORLD_SCALE * 1.2).setDepth(DEPTH.fx);
    s.play('fx_spark').once('animationcomplete', () => s.destroy());
  }

  humanAt(obj: Phaser.GameObjects.GameObject): Human | undefined {
    return obj.getData('human') as Human | undefined;
  }
}
