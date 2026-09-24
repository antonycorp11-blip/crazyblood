// Copies the art/audio reused from the sibling game (Hemofazenda / hemofarmclaude) into
// public/, renamed to Hemofarm asset IDs. Re-run after the sibling assets change:
//   npm run assets:sync            (default source: ../hemofarmclaude/public)
//   HEMO_SRC=/path/to/public npm run assets:sync
// Final art for an ID simply replaces the file at the destination path — no code changes needed.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = process.env.HEMO_SRC ?? resolve(root, '../hemofarmclaude/public');

// [sibling file (relative to SRC), destination (relative to public/)]
const MAP = [
  // branding / backgrounds
  ['assets/title_background.jpg', 'assets/backgrounds/loading_background.jpg'],
  ['assets/backdrop_sky.jpg', 'assets/backgrounds/night_sky.jpg'],
  ['assets/research_codex_bg.jpg', 'assets/backgrounds/upgrade_background.jpg'],
  ['assets/loading_bat.webp', 'assets/vfx/bat_loading.webp'],

  // terrain
  ['assets/tile_grass_a.webp', 'assets/terrain/ground_grass_dark_a.webp'],
  ['assets/tile_grass_b.webp', 'assets/terrain/ground_grass_dark_b.webp'],
  ['assets/tile_forest_floor.webp', 'assets/terrain/ground_forest.webp'],
  ['assets/tile_soil.webp', 'assets/terrain/ground_dirt.webp'],
  ['assets/tile_dirt_road.webp', 'assets/terrain/path_dirt.webp'],
  ['assets/tile_cobble_a.webp', 'assets/terrain/path_stone.webp'],
  ['assets/tile_castle_stone.webp', 'assets/terrain/ground_stone.webp'],
  ['assets/rail_fence_ne.webp', 'assets/terrain/fence_wood_ne.webp'],
  ['assets/rail_fence_nw.webp', 'assets/terrain/fence_wood_nw.webp'],
  ['assets/rail_fence_post.webp', 'assets/terrain/fence_wood_post.webp'],
  ['assets/fence_palisade_ne.webp', 'assets/terrain/palisade_ne.webp'],
  ['assets/fence_palisade_nw.webp', 'assets/terrain/palisade_nw.webp'],
  ['assets/fence_palisade_post.webp', 'assets/terrain/palisade_post.webp'],
  ['assets/gate_main.webp', 'assets/terrain/fence_gate.webp'],

  // structures
  ['assets/bld_housing_1.webp', 'assets/structures/small_barn.webp'],
  ['assets/bld_housing_2.webp', 'assets/structures/worker_house.webp'],
  ['assets/bld_housing_3.webp', 'assets/structures/worker_house_large.webp'],
  ['assets/bld_boarding.webp', 'assets/structures/large_barn.webp'],
  ['assets/bld_collect_1.webp', 'assets/structures/collection_station.webp'],
  ['assets/bld_collect_2.webp', 'assets/structures/blood_storage.webp'],
  ['assets/bld_lab.webp', 'assets/structures/blood_lab.webp'],
  ['assets/bld_market.webp', 'assets/structures/market_cart.webp'],
  ['assets/bld_site_small.webp', 'assets/structures/construction_small.webp'],
  ['assets/castle_cliff.webp', 'assets/structures/castle_distant.webp'],
  ['assets/well.webp', 'assets/structures/well.webp'],
  ['assets/fire_pit.webp', 'assets/structures/fire_pit.webp'],
  ['assets/hand_cart.webp', 'assets/transport/small_cart.webp'],
  ['assets/carriage.webp', 'assets/transport/delivery_wagon.webp'],

  // characters (16-frame strips: 0-3 walk front, 4-7 walk back, 8+ actions)
  ['assets/human_actions.webp', 'assets/characters/human_male_01_actions.webp'],
  ['assets/human_walk_front.webp', 'assets/characters/human_male_01_walk_front.webp'],
  ['assets/human_walk_back.webp', 'assets/characters/human_male_01_walk_back.webp'],
  ['assets/human_b.webp', 'assets/characters/human_male_02.webp'],
  ['assets/davi.webp', 'assets/characters/human_male_03.webp'],
  ['assets/human_c.webp', 'assets/characters/elderly_human_01.webp'],
  ['assets/lia.webp', 'assets/characters/human_female_01.webp'],
  ['assets/vampire_buyer.webp', 'assets/characters/vampire_worker_01.webp'],
  ['assets/ghoul_worker.webp', 'assets/characters/vampire_worker_02.webp'],
  ['assets/boris.webp', 'assets/characters/vampire_manager.webp'],

  // portraits
  ['assets/portrait_boris.webp', 'assets/portraits/npc_mordecai.webp'],
  ['assets/portrait_rubelia.webp', 'assets/portraits/npc_lady_vespera.webp'],
  ['assets/portrait_merchant.webp', 'assets/portraits/npc_silas_blackbottle.webp'],
  ['assets/portrait_aureliano.webp', 'assets/portraits/npc_count_drakan.webp'],
  ['assets/portrait_hematico.webp', 'assets/portraits/npc_dr_hematic.webp'],
  ['assets/portrait_vesper.webp', 'assets/portraits/npc_baroness_nocturna.webp'],
  ['assets/portrait_inspector.webp', 'assets/portraits/npc_inspector_graves.webp'],

  // icons
  ['assets/icon_blood.webp', 'assets/icons/icon_blood.webp'],
  ['assets/icon_gold.webp', 'assets/icons/icon_gold.webp'],
  ['assets/blood_umbra.webp', 'assets/icons/icon_ancestral_essence.webp'],
  ['assets/blood_rubra.webp', 'assets/icons/icon_fine_blood.webp'],
  ['assets/blood_carmesim.webp', 'assets/icons/icon_royal_blood.webp'],
  ['assets/icon_population.webp', 'assets/icons/icon_population.webp'],
  ['assets/icon_time.webp', 'assets/icons/icon_time.webp'],
  ['assets/icon_lock.webp', 'assets/icons/legacy_locked.webp'],
  ['assets/icon_quest.webp', 'assets/icons/icon_quest.webp'],
  ['assets/icon_population.webp', 'assets/icons/upgrade_buy_human.webp'],
  ['assets/icon_collect.webp', 'assets/icons/upgrade_auto_collect.webp'],
  ['assets/icon_build.webp', 'assets/icons/upgrade_expand_estate.webp'],
  ['assets/icon_research.webp', 'assets/icons/upgrade_blood_processing.webp'],
  ['assets/icon_contracts.webp', 'assets/icons/upgrade_contracts.webp'],
  ['assets/icon_offline.webp', 'assets/icons/upgrade_offline.webp'],
  ['assets/barrel.webp', 'assets/icons/upgrade_storage.webp'],
  ['assets/hand_cart.webp', 'assets/icons/upgrade_logistics.webp'],
  ['assets/icon_upgrade.webp', 'assets/icons/nav_upgrades.webp'],
  ['assets/icon_prestige.webp', 'assets/icons/nav_legacy.webp'],
  ['assets/icon_settings.webp', 'assets/icons/nav_settings.webp'],
  ['assets/bld_market.webp', 'assets/icons/nav_market.webp'], // PLACEHOLDER: shop icon missing
  ['assets/bld_housing_1.webp', 'assets/icons/nav_farm.webp'], // PLACEHOLDER: barn icon missing

  // ui
  ['assets/frame_panel.webp', 'assets/ui/panel_dark.webp'],
  ['assets/frame_dialog.webp', 'assets/ui/dialogue_box.webp'],
  ['assets/frame_card.webp', 'assets/ui/panel_parchment.webp'],
  ['assets/frame_bubble.webp', 'assets/ui/speech_bubble.webp'],
  ['assets/frame_tooltip.webp', 'assets/ui/tooltip.webp'],
  ['assets/frame_portrait.webp', 'assets/ui/portrait_frame.webp'],
  ['assets/button_normal.webp', 'assets/ui/button_red.webp'],
  ['assets/button_pressed.webp', 'assets/ui/button_red_pressed.webp'],
  ['assets/card_unit.webp', 'assets/ui/upgrade_card.webp'],
  ['assets/mk_sleep.webp', 'assets/ui/bubble_sleep.webp'],
  ['assets/mk_happy.webp', 'assets/ui/bubble_heart.webp'],
  ['assets/mk_event.webp', 'assets/ui/bubble_alert.webp'],
  ['assets/mk_talk.webp', 'assets/ui/bubble_talk.webp'],
  ['assets/mk_angry.webp', 'assets/ui/bubble_angry.webp'],
  ['assets/mk_star.webp', 'assets/ui/bubble_star.webp'],

  // decoration
  ['assets/torch_stand.webp', 'assets/decoration/torch.webp'],
  ['assets/lamp_post.webp', 'assets/decoration/lantern.webp'],
  ['assets/barrel.webp', 'assets/decoration/barrel.webp'],
  ['assets/crates.webp', 'assets/decoration/crate.webp'],
  ['assets/crate_vials.webp', 'assets/decoration/blood_bottle.webp'],
  ['assets/prop_4.webp', 'assets/decoration/blood_bucket.webp'],
  ['assets/bench.webp', 'assets/decoration/chair.webp'],
  ['assets/banner_bat.webp', 'assets/decoration/banner_red.webp'],
  ['assets/pine_a.webp', 'assets/decoration/tree_pine_a.webp'],
  ['assets/pine_b.webp', 'assets/decoration/tree_pine_b.webp'],
  ['assets/pine_c.webp', 'assets/decoration/tree_pine_c.webp'],
  ['assets/dead_tree_a.webp', 'assets/decoration/tree_dead_a.webp'],
  ['assets/dead_tree_b.webp', 'assets/decoration/tree_dead_b.webp'],
  ['assets/bush_a.webp', 'assets/decoration/bush_a.webp'],
  ['assets/bush_b.webp', 'assets/decoration/bush_b.webp'],
  ['assets/rock_a.webp', 'assets/decoration/rock_a.webp'],
  ['assets/rock_b.webp', 'assets/decoration/rock_b.webp'],
  ['assets/rock_c.webp', 'assets/decoration/rock_c.webp'],
  ['assets/mattress_pile.webp', 'assets/decoration/mattress_pile.webp'],
  ['assets/harvest_basket.webp', 'assets/decoration/harvest_basket.webp'],
  ...Array.from({ length: 17 }, (_, i) => [`assets/decal_${i}.webp`, `assets/decoration/decal_${i}.webp`]),

  // vfx
  ['assets/fx_blood_drop.webp', 'assets/vfx/blood_drop_particle.webp'],
  ['assets/fx_coins.webp', 'assets/vfx/gold_particle.webp'],
  ['assets/fx_sparkle.webp', 'assets/vfx/purchase_spark.webp'],
  ['assets/fx_smoke.webp', 'assets/vfx/smoke.webp'],
  ['assets/fx_bat_swarm.webp', 'assets/vfx/bat_01.webp'],

  // audio (CC0 — see public/audio/CREDITS.txt)
  ['audio/CREDITS.txt', 'audio/CREDITS.txt'],
  ['audio/music_night.mp3', 'audio/music_farm.mp3'],
  ['audio/music_forest.mp3', 'audio/music_market.mp3'],
  ['audio/sfx_click.mp3', 'audio/sfx_click.mp3'],
  ['audio/sfx_coin.mp3', 'audio/sfx_purchase.mp3'],
  ['audio/sfx_coin2.mp3', 'audio/sfx_gold.mp3'],
  ['audio/sfx_error.mp3', 'audio/sfx_error.mp3'],
  ['audio/sfx_page.mp3', 'audio/sfx_contract_accept.mp3'],
  ['audio/sfx_confirm.mp3', 'audio/sfx_contract_complete.mp3'],
  ['audio/sfx_drop.mp3', 'audio/sfx_blood_collect.mp3'],
  ['audio/sfx_build.mp3', 'audio/sfx_upgrade.mp3'],
  ['audio/sfx_latch.mp3', 'audio/sfx_unlock.mp3'],
  ['audio/sfx_bong.mp3', 'audio/sfx_legacy.mp3'],
  ['audio/sfx_open.mp3', 'audio/sfx_open.mp3'],
  ['audio/sfx_close.mp3', 'audio/sfx_close.mp3'],
  ...[1, 2, 3, 4].map((i) => [`audio/voice_male_deep_${i}.mp3`, `audio/voice_mordecai_${i}.mp3`]),
];

let copied = 0;
const missing = [];
for (const [from, to] of MAP) {
  const src = join(SRC, from);
  if (!existsSync(src)) { missing.push(from); continue; }
  const dst = join(root, 'public', to);
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  copied++;
}
console.log(`[assets] copied ${copied} files from ${SRC}`);
if (missing.length) console.warn('[assets] missing in source:', missing.join(', '));
