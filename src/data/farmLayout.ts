// Where things go on the iso grid. Pure data: to add a Farm Stage element, add its slot here and a rule
// in world/FarmVisualState.ts.
import type { AssetKey } from './assets';

export interface TileRect { i0: number; j0: number; i1: number; j1: number }

export const GRID_SIZE = 32;
/** Area that belongs to the estate; outside it is forest. */
export const ESTATE: TileRect = { i0: 5, j0: 4, i1: 25, j1: 25 };

// Pens unlock in this order as Expand Estate levels up.
export const PENS: TileRect[] = [
  { i0: 11, j0: 13, i1: 14, j1: 15 },
  { i0: 16, j0: 13, i1: 19, j1: 15 },
  { i0: 11, j0: 18, i1: 14, j1: 20 },
  { i0: 16, j0: 18, i1: 19, j1: 20 },
  { i0: 6, j0: 13, i1: 9, j1: 15 },
  { i0: 21, j0: 13, i1: 24, j1: 15 },
  { i0: 6, j0: 18, i1: 9, j1: 20 },
  { i0: 21, j0: 18, i1: 24, j1: 20 },
  { i0: 11, j0: 22, i1: 14, j1: 24 },
  { i0: 16, j0: 22, i1: 19, j1: 24 },
  { i0: 6, j0: 22, i1: 9, j1: 24 },
  { i0: 21, j0: 22, i1: 24, j1: 24 },
];

export type BuildingId =
  | 'small_barn' | 'worker_house' | 'worker_house_large' | 'large_barn'
  | 'collection_station' | 'blood_storage' | 'blood_lab' | 'market_cart';

export interface BuildingSlot { texture: AssetKey; footprint: TileRect }

export const BUILDINGS: Record<BuildingId, BuildingSlot> = {
  small_barn: { texture: 'small_barn', footprint: { i0: 8, j0: 8, i1: 9, j1: 10 } },
  worker_house: { texture: 'worker_house', footprint: { i0: 5, j0: 8, i1: 6, j1: 10 } },
  worker_house_large: { texture: 'worker_house_large', footprint: { i0: 9, j0: 4, i1: 10, j1: 6 } },
  large_barn: { texture: 'large_barn', footprint: { i0: 13, j0: 4, i1: 15, j1: 6 } },
  collection_station: { texture: 'collection_station', footprint: { i0: 14, j0: 8, i1: 15, j1: 10 } },
  blood_storage: { texture: 'blood_storage', footprint: { i0: 17, j0: 8, i1: 18, j1: 10 } },
  blood_lab: { texture: 'blood_lab', footprint: { i0: 20, j0: 8, i1: 21, j1: 10 } },
  market_cart: { texture: 'market_cart', footprint: { i0: 5, j0: 11, i1: 6, j1: 12 } },
};

/** Tile the blood tank stands on (its base sits at the tile center). */
export const TANK_TILE = { i: 11.6, j: 10.4 };
export const MORDECAI_TILE = { i: 12.2, j: 11.7 };

// Roads (tile rows) — revealed as the farm grows.
export const ROADS: { rect: TileRect; minPens: number }[] = [
  { rect: { i0: 7, j0: 11, i1: 15, j1: 12 }, minPens: 1 }, // yard in front of the cabin
  { rect: { i0: 15, j0: 12, i1: 15, j1: 17 }, minPens: 2 },
  { rect: { i0: 16, j0: 11, i1: 22, j1: 12 }, minPens: 2 },
  { rect: { i0: 10, j0: 16, i1: 20, j1: 17 }, minPens: 3 },
  { rect: { i0: 15, j0: 17, i1: 15, j1: 25 }, minPens: 3 },
  { rect: { i0: 5, j0: 16, i1: 9, j1: 17 }, minPens: 5 },
  { rect: { i0: 21, j0: 16, i1: 25, j1: 17 }, minPens: 6 },
  { rect: { i0: 5, j0: 21, i1: 25, j1: 21 }, minPens: 9 },
];

export const SMALL_CART_TILE = { i: 6.4, j: 13.9 };
export const WAGON_PATH = [{ i: 15.5, j: 30 }, { i: 15.5, j: 12.5 }];
export const CASTLE_TILE = { i: 1.5, j: -1.5 };

/** Extra storage tanks appear here as Bigger Tank levels up (behind the main tank). */
export const EXTRA_TANK_TILES = [{ i: 12.4, j: 8.5 }, { i: 13.5, j: 9.1 }, { i: 13.0, j: 7.5 }];
/** Pipes run from the main tank to these processing buildings once Blood Processing is established. */
export const PIPE_TARGETS: BuildingId[] = ['collection_station', 'blood_storage', 'blood_lab'];
/** Estate palisade (stage 3+). The gate sits where the south road leaves the estate. */
export const GATE = { i: 15.5, gapFrom: 13, gapTo: 17 };

/** Camera always shows at least this area. */
export const STAGE0_VIEW: TileRect = { i0: 8, j0: 9, i1: 14, j1: 15 };
