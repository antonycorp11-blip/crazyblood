// Single source of truth for asset IDs and paths. Code references assets only through these keys.
// `placeholder: true` marks art borrowed/stubbed until final art exists (see ASSETS.md).
// Entries with `generated: true` have no file yet: PreloadScene draws them procedurally under the same key,
// so dropping a real file at `path` and removing the flag is all it takes to swap in final art.

export type Bundle = 'boot' | 'farm' | 'market';

interface BaseAsset { path: string; bundle: Bundle; placeholder?: boolean; generated?: boolean }
export interface ImageAsset extends BaseAsset { type: 'image' }
export interface SheetAsset extends BaseAsset { type: 'sheet'; frameWidth: number; frameHeight: number }
export interface AudioAsset extends BaseAsset { type: 'audio' }
export type AssetDef = ImageAsset | SheetAsset | AudioAsset;

const img = (path: string, bundle: Bundle = 'farm', extra: Partial<ImageAsset> = {}): ImageAsset =>
  ({ type: 'image', path: `assets/${path}`, bundle, ...extra });
const sheet = (path: string, frameWidth: number, frameHeight: number, extra: Partial<SheetAsset> = {}): SheetAsset =>
  ({ type: 'sheet', path: `assets/${path}`, frameWidth, frameHeight, bundle: 'farm', ...extra });
const sfx = (name: string, bundle: Bundle = 'farm'): AudioAsset => ({ type: 'audio', path: `audio/${name}.mp3`, bundle });

export const ASSETS = {
  // backgrounds
  loading_background: img('backgrounds/loading_background.jpg', 'boot'),
  night_sky: img('backgrounds/night_sky.jpg'),
  upgrade_background: img('backgrounds/upgrade_background.jpg', 'market'),

  // terrain
  ground_grass_dark_a: img('terrain/ground_grass_dark_a.webp'),
  ground_grass_dark_b: img('terrain/ground_grass_dark_b.webp'),
  ground_forest: img('terrain/ground_forest.webp'),
  ground_dirt: img('terrain/ground_dirt.webp'),
  ground_stone: img('terrain/ground_stone.webp'),
  path_dirt: img('terrain/path_dirt.webp'),
  path_stone: img('terrain/path_stone.webp'),
  fence_wood_ne: img('terrain/fence_wood_ne.webp'),
  fence_wood_nw: img('terrain/fence_wood_nw.webp'),
  fence_wood_post: img('terrain/fence_wood_post.webp'),
  palisade_ne: img('terrain/palisade_ne.webp'),
  palisade_nw: img('terrain/palisade_nw.webp'),
  palisade_post: img('terrain/palisade_post.webp'),
  fence_gate: img('terrain/fence_gate.webp'),

  // structures
  small_barn: img('structures/small_barn.webp'),
  worker_house: img('structures/worker_house.webp'),
  worker_house_large: img('structures/worker_house_large.webp'),
  large_barn: img('structures/large_barn.webp'),
  collection_station: img('structures/collection_station.webp'),
  blood_storage: img('structures/blood_storage.webp'),
  blood_lab: img('structures/blood_lab.webp'),
  market_cart: img('structures/market_cart.webp'),
  construction_small: img('structures/construction_small.webp'),
  castle_distant: img('structures/castle_distant.webp'),
  well: img('structures/well.webp'),
  fire_pit: img('structures/fire_pit.webp'),
  small_blood_tank: img('structures/small_blood_tank.webp', 'farm', { placeholder: true, generated: true }),
  small_cart: img('transport/small_cart.webp'),
  delivery_wagon: img('transport/delivery_wagon.webp'),

  // characters — 16-frame strips: 0-3 walk front, 4-7 walk back, 8+ actions
  human_male_01_actions: sheet('characters/human_male_01_actions.webp', 82, 88),
  human_male_01_walk_front: sheet('characters/human_male_01_walk_front.webp', 57, 88),
  human_male_01_walk_back: sheet('characters/human_male_01_walk_back.webp', 44, 88),
  human_male_02: sheet('characters/human_male_02.webp', 88, 88),
  human_male_03: sheet('characters/human_male_03.webp', 76, 109),
  elderly_human_01: sheet('characters/elderly_human_01.webp', 88, 92),
  human_female_01: sheet('characters/human_female_01.webp', 54, 88),
  // PLACEHOLDER: vampire_collector (walk + collect + carry bucket) — reuses worker_01 tinted
  vampire_worker_01: sheet('characters/vampire_worker_01.webp', 79, 115),
  vampire_worker_02: sheet('characters/vampire_worker_02.webp', 77, 109),
  vampire_manager: sheet('characters/vampire_manager.webp', 73, 106),

  // portraits
  npc_mordecai: img('portraits/npc_mordecai.webp', 'boot'),
  npc_lady_vespera: img('portraits/npc_lady_vespera.webp', 'market'),
  npc_silas_blackbottle: img('portraits/npc_silas_blackbottle.webp', 'market'),
  npc_count_drakan: img('portraits/npc_count_drakan.webp', 'market'),
  npc_dr_hematic: img('portraits/npc_dr_hematic.webp', 'market'),
  npc_baroness_nocturna: img('portraits/npc_baroness_nocturna.webp', 'market', { placeholder: true }),
  npc_inspector_graves: img('portraits/npc_inspector_graves.webp', 'market'),

  // icons
  icon_blood: img('icons/icon_blood.webp', 'boot'),
  icon_gold: img('icons/icon_gold.webp', 'boot'),
  icon_ancestral_essence: img('icons/icon_ancestral_essence.webp', 'boot'),
  icon_fine_blood: img('icons/icon_fine_blood.webp', 'market'),
  icon_royal_blood: img('icons/icon_royal_blood.webp', 'market'),
  icon_garlic: img('icons/icon_garlic.webp', 'market', { placeholder: true, generated: true }),
  icon_population: img('icons/icon_population.webp', 'boot'),
  icon_time: img('icons/icon_time.webp', 'boot'),
  icon_quest: img('icons/icon_quest.webp', 'boot'),
  legacy_locked: img('icons/legacy_locked.webp', 'boot'),
  upgrade_buy_human: img('icons/upgrade_buy_human.webp', 'boot', { placeholder: true }),
  upgrade_auto_collect: img('icons/upgrade_auto_collect.webp', 'boot'),
  upgrade_expand_estate: img('icons/upgrade_expand_estate.webp', 'boot'),
  upgrade_blood_processing: img('icons/upgrade_blood_processing.webp', 'boot'),
  upgrade_contracts: img('icons/upgrade_contracts.webp', 'boot'),
  upgrade_offline: img('icons/upgrade_offline.webp', 'boot'),
  upgrade_storage: img('icons/upgrade_storage.webp', 'boot', { placeholder: true }),
  upgrade_logistics: img('icons/upgrade_logistics.webp', 'boot', { placeholder: true }),
  nav_farm: img('icons/nav_farm.webp', 'boot', { placeholder: true }),
  nav_upgrades: img('icons/nav_upgrades.webp', 'boot'),
  nav_market: img('icons/nav_market.webp', 'boot', { placeholder: true }),
  nav_legacy: img('icons/nav_legacy.webp', 'boot'),
  nav_settings: img('icons/nav_settings.webp', 'boot'),

  // world bubbles
  bubble_sleep: img('ui/bubble_sleep.webp'),
  bubble_heart: img('ui/bubble_heart.webp'),
  bubble_alert: img('ui/bubble_alert.webp'),
  bubble_talk: img('ui/bubble_talk.webp'),
  bubble_angry: img('ui/bubble_angry.webp'),
  bubble_star: img('ui/bubble_star.webp'),

  // decoration
  torch: img('decoration/torch.webp'),
  lantern: img('decoration/lantern.webp'),
  barrel: img('decoration/barrel.webp'),
  crate: img('decoration/crate.webp'),
  blood_bottle: img('decoration/blood_bottle.webp'),
  blood_bucket: img('decoration/blood_bucket.webp'),
  chair: img('decoration/chair.webp'),
  banner_red: img('decoration/banner_red.webp'),
  tree_pine_a: img('decoration/tree_pine_a.webp'),
  tree_pine_b: img('decoration/tree_pine_b.webp'),
  tree_pine_c: img('decoration/tree_pine_c.webp'),
  tree_dead_a: img('decoration/tree_dead_a.webp'),
  tree_dead_b: img('decoration/tree_dead_b.webp'),
  bush_a: img('decoration/bush_a.webp'),
  bush_b: img('decoration/bush_b.webp'),
  rock_a: img('decoration/rock_a.webp'),
  rock_b: img('decoration/rock_b.webp'),
  rock_c: img('decoration/rock_c.webp'),
  mattress_pile: img('decoration/mattress_pile.webp'),
  harvest_basket: img('decoration/harvest_basket.webp'),

  // vfx
  blood_drop_particle: sheet('vfx/blood_drop_particle.webp', 42, 86),
  gold_particle: sheet('vfx/gold_particle.webp', 58, 50),
  purchase_spark: sheet('vfx/purchase_spark.webp', 76, 74),
  smoke: sheet('vfx/smoke.webp', 84, 82),
  bat_01: sheet('vfx/bat_01.webp', 120, 120),
  glow: img('vfx/glow.webp', 'farm', { generated: true }),

  // audio
  music_farm: sfx('music_farm'),
  music_market: sfx('music_market', 'market'),
  sfx_click: sfx('sfx_click'),
  sfx_purchase: sfx('sfx_purchase'),
  sfx_gold: sfx('sfx_gold'),
  sfx_error: sfx('sfx_error'),
  sfx_contract_accept: sfx('sfx_contract_accept'),
  sfx_contract_complete: sfx('sfx_contract_complete'),
  sfx_blood_collect: sfx('sfx_blood_collect'),
  sfx_upgrade: sfx('sfx_upgrade'),
  sfx_unlock: sfx('sfx_unlock'),
  sfx_legacy: sfx('sfx_legacy'),
  sfx_open: sfx('sfx_open'),
  sfx_close: sfx('sfx_close'),
  voice_mordecai_1: sfx('voice_mordecai_1'),
  voice_mordecai_2: sfx('voice_mordecai_2'),
  voice_mordecai_3: sfx('voice_mordecai_3'),
  voice_mordecai_4: sfx('voice_mordecai_4'),
} as const satisfies Record<string, AssetDef>;

export type AssetKey = keyof typeof ASSETS;
export type SfxKey = { [K in AssetKey]: (typeof ASSETS)[K] extends AudioAsset ? K : never }[AssetKey];

// Decals are a numbered family; generated keys keep them out of the big table above.
export const DECAL_KEYS = Array.from({ length: 17 }, (_, i) => `decal_${i}`);

/** URL usable from the DOM UI (relative so the build works from any sub-path / portal iframe). */
export function assetUrl(key: AssetKey): string {
  const def: AssetDef = ASSETS[key];
  if (def.type !== 'audio' && def.generated) return placeholderSvg(key);
  return `./${def.path}`;
}

function placeholderSvg(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect x="2" y="2" width="60" height="60" rx="8" fill="#2a1a2e" stroke="#ff00aa" stroke-width="3" stroke-dasharray="6 4"/><text x="32" y="36" font-size="8" fill="#ff9ad5" text-anchor="middle" font-family="monospace">${label.slice(0, 12)}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
