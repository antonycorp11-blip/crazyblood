// Static layer: sky, distant castle, ground tiles, forest ring and scattered decoration. Deterministic
// (seeded) so the estate always looks the same. Roads/pen soil are painted dynamically by FarmVisuals.
import Phaser from 'phaser';
import { WORLD_SCALE } from '../core/Constants';
import { DECAL_KEYS, type AssetKey } from '../data/assets';
import { BUILDINGS, CASTLE_TILE, ESTATE, GRID_SIZE, PENS, ROADS, TANK_TILE, type TileRect } from '../data/farmLayout';
import { iso, mulberry32, tileCenter } from './iso';

export const DEPTH = { sky: -1e7, castle: -9e6, ground: -8e6, groundOverlay: -7.9e6, decal: -7.8e6, fx: 1e6, ui: 2e6 } as const;

const inRect = (i: number, j: number, r: TileRect, pad = 0) =>
  i >= r.i0 - pad && i <= r.i1 + pad && j >= r.j0 - pad && j <= r.j1 + pad;

/** Tiles that must stay clear of trees/rocks (pens, roads, buildings, tank). */
function isReserved(i: number, j: number): boolean {
  if (PENS.some((p) => inRect(i, j, p, 1))) return true;
  if (ROADS.some((r) => inRect(i, j, r.rect, 0))) return true;
  if (Object.values(BUILDINGS).some((b) => inRect(i, j, b.footprint, 1))) return true;
  return Math.abs(i - TANK_TILE.i) < 2 && Math.abs(j - TANK_TILE.j) < 2;
}

export function buildFarmMap(scene: Phaser.Scene) {
  const rnd = mulberry32(666);

  // Sky: fixed to the camera, fills the screen.
  const sky = scene.add.image(0, 0, 'night_sky').setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.sky);
  const fitSky = () => {
    const { width, height } = scene.scale;
    sky.setPosition(width / 2, height / 2).setScale(Math.max(width / sky.width, height / sky.height) * 1.05);
  };
  fitSky();
  scene.scale.on('resize', fitSky);
  scene.events.once('shutdown', () => scene.scale.off('resize', fitSky));

  const c = iso(CASTLE_TILE.i, CASTLE_TILE.j);
  scene.add.image(c.x, c.y, 'castle_distant').setOrigin(0.5, 1).setScale(WORLD_SCALE * 1.25).setScrollFactor(0.85).setDepth(DEPTH.castle).setTint(0x8a96c8);

  // Ground. Grouped by texture so WebGL can batch them.
  const byTex = new Map<AssetKey, { x: number; y: number; flip: boolean }[]>();
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const inside = inRect(i, j, ESTATE);
      const tex: AssetKey = inside ? (rnd() < 0.5 ? 'ground_grass_dark_a' : 'ground_grass_dark_b') : 'ground_forest';
      const p = tileCenter(i, j);
      if (!byTex.has(tex)) byTex.set(tex, []);
      byTex.get(tex)!.push({ x: p.x, y: p.y, flip: rnd() < 0.5 });
    }
  }
  for (const [tex, list] of byTex) {
    for (const t of list) scene.add.image(t.x, t.y, tex).setScale(WORLD_SCALE * 1.02).setFlipX(t.flip).setDepth(DEPTH.ground);
  }

  // Decals (tiny grass tufts / stones) for texture.
  for (let n = 0; n < 260; n++) {
    const i = ESTATE.i0 + rnd() * (ESTATE.i1 - ESTATE.i0), j = ESTATE.j0 + rnd() * (ESTATE.j1 - ESTATE.j0);
    if (isReserved(Math.floor(i), Math.floor(j))) continue;
    const p = iso(i, j);
    scene.add.image(p.x, p.y, DECAL_KEYS[Math.floor(rnd() * DECAL_KEYS.length)]).setScale(WORLD_SCALE).setDepth(DEPTH.decal).setAlpha(0.9);
  }

  // Forest ring outside the estate + sparse nature inside.
  const trees: AssetKey[] = ['tree_pine_a', 'tree_pine_b', 'tree_pine_c', 'tree_pine_a', 'tree_dead_a', 'tree_pine_b'];
  const small: AssetKey[] = ['bush_a', 'bush_b', 'rock_a', 'rock_b', 'rock_c'];
  for (let i = -2; i < GRID_SIZE + 2; i++) {
    for (let j = -2; j < GRID_SIZE + 2; j++) {
      const inside = inRect(i, j, ESTATE);
      const edge = !inside && inRect(i, j, ESTATE, 3);
      const roll = rnd();
      const p = iso(i + 0.3 + rnd() * 0.4, j + 0.3 + rnd() * 0.4);
      if (!inside && roll < (edge ? 0.75 : 0.5)) {
        const k = trees[Math.floor(rnd() * trees.length)];
        scene.add.image(p.x, p.y, k).setOrigin(0.5, 0.97).setScale(WORLD_SCALE * (0.85 + rnd() * 0.35)).setFlipX(rnd() < 0.5)
          .setDepth(p.y).setTint(edge ? 0xd8dcf0 : 0xaab0d0);
      } else if (inside && !isReserved(i, j)) {
        if (roll < 0.05) scene.add.image(p.x, p.y, trees[Math.floor(rnd() * 3)]).setOrigin(0.5, 0.97).setScale(WORLD_SCALE * 0.8).setDepth(p.y);
        else if (roll < 0.13) scene.add.image(p.x, p.y, small[Math.floor(rnd() * small.length)]).setOrigin(0.5, 0.9).setScale(WORLD_SCALE * 0.9).setFlipX(rnd() < 0.5).setDepth(p.y);
      }
    }
  }

  // Fixed props around the cabin (stage 0 "miserable beginning": a well, a barrel, a bucket).
  const prop = (k: AssetKey, i: number, j: number, s = 1) => {
    const p = iso(i, j);
    return scene.add.image(p.x, p.y, k).setOrigin(0.5, 0.95).setScale(WORLD_SCALE * s).setDepth(p.y);
  };
  prop('well', 9.8, 13.7, 0.9);
  prop('barrel', 10.7, 11.2);
  prop('blood_bucket', 12.9, 11.2, 0.35);
  prop('chair', 9.2, 11.8, 0.9);
}
