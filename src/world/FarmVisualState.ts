// Farm visuals are DERIVED from progress — nothing visual is saved. Change the rules here to change
// what the estate looks like at each point of the game.
import type { GameState } from '../core/GameState';
import { Progression } from '../data/progression';
import { BUILDINGS, PENS, STAGE0_VIEW, type BuildingId, type TileRect } from '../data/farmLayout';

export interface FarmVisualState {
  stage: number;
  pens: number;
  collectors: number;
  buildings: BuildingId[];
  smallCart: boolean;
  wagonTraffic: boolean;
  tankScale: number;
  lights: number; // how many torches/lanterns are lit
  palisade: boolean;
  pipes: boolean;
  extraTanks: number;
}

let stageOverride: number | null = null;
export function setStageOverride(stage: number | null) { stageOverride = stage; }

export function getFarmStage(s: GameState): number {
  if (stageOverride !== null) return stageOverride;
  const th = Progression.stageHumanThresholds;
  let stage = 0;
  for (let i = 0; i < th.length; i++) if (s.humans >= th[i]) stage = i;
  return stage;
}

export function getFarmVisualState(s: GameState): FarmVisualState {
  const stage = getFarmStage(s);
  const u = s.upgrades;
  // A debug stage override also forces the matching amount of estate so the look can be previewed.
  const estate = stageOverride !== null ? Math.max(u.expand_estate, stage * 2) : u.expand_estate;
  const humans = stageOverride !== null ? Math.max(s.humans, Progression.stageHumanThresholds[stage]) : s.humans;
  const buildings: BuildingId[] = ['small_barn'];
  if (u.blood_processing >= 1 || stage >= 3) buildings.push('collection_station');
  if (u.tank_storage >= 2 || u.blood_processing >= 3 || stage >= 3) buildings.push('blood_storage');
  if (u.blood_processing >= 5 || stage >= 4) buildings.push('blood_lab');
  if (humans >= 8) buildings.push('worker_house');
  if (humans >= 20) buildings.push('worker_house_large');
  if (humans >= 40) buildings.push('large_barn');
  if (s.unlocks.market) buildings.push('market_cart');
  const auto = u.auto_collect;
  return {
    stage,
    pens: Math.min(PENS.length, 1 + estate),
    collectors: auto > 0 ? Math.min(6, 1 + Math.floor(auto / 3)) : 0,
    buildings,
    smallCart: u.delivery_cart >= 1,
    wagonTraffic: u.delivery_cart >= 1 && stage >= 2,
    tankScale: 1 + 0.08 * Math.min(u.tank_storage, 6),
    lights: 2 + estate + (auto > 0 ? 1 : 0),
    palisade: stage >= 3,
    pipes: u.blood_processing >= 2 || stage >= 3,
    extraTanks: u.tank_storage >= 10 ? 3 : u.tank_storage >= 6 ? 2 : u.tank_storage >= 3 ? 1 : 0,
  };
}

function union(a: TileRect, b: TileRect): TileRect {
  return { i0: Math.min(a.i0, b.i0), j0: Math.min(a.j0, b.j0), i1: Math.max(a.i1, b.i1), j1: Math.max(a.j1, b.j1) };
}

/** Tile area the default camera framing should cover: grows with the farm, so zooming out IS progress. */
export function getFramingRect(v: FarmVisualState): TileRect {
  let r = STAGE0_VIEW;
  for (let p = 0; p < v.pens; p++) r = union(r, PENS[p]);
  for (const b of v.buildings) r = union(r, BUILDINGS[b].footprint);
  return r;
}
