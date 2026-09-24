# HEMOFARM — Inventário de Assets (v0.1)

Fonte reaproveitada: `~/Desktop/hemofarmclaude/public/assets` + `public/audio` (jogo irmão "Hemofazenda").
Estilo herdado: **pixel art isométrica escura** (tiles 256×128, spritesheets de 16 frames, ícones 64px de altura).
Todo asset novo precisa seguir esse estilo para não misturar com o HD pintado das imagens de referência.

Legenda: ✅ reaproveita direto · 🟡 reaproveita adaptado (tint/crop/composição) · ❌ falta

Prioridade dos faltantes: **P0** = bloqueia a vertical slice v0.1 · **P1** = estágios 1–2 / Market / Legacy · **P2** = estágios 3–5 / polish / loja

---

## A. Branding
| ID Hemofarm | Status | Origem / observação |
|---|---|---|
| logo_hemofarm | ❌ **P0** | `title_logo` diz "HEMOFAZENDA" — precisa logo "HEMOFARM" no mesmo estilo |
| logo_hemofarm_compact | ❌ P1 | versão curta para top bar / desktop |
| icon_game | ❌ P2 | `icon-192/512.png` são do Hemofazenda |
| loading_background | ✅ | `title_background.jpg` (1536×1024, landscape) |

## B. Backgrounds
| ID | Status | Origem |
|---|---|---|
| farm_bg_stage_0…5 | 🟡 | Não usar imagem chapada: a fazenda é montada com tiles iso + estruturas (melhor para progressão visual). Céu = `backdrop_sky.jpg` |
| night_sky / moon_large / mountains / forest | 🟡 | tudo junto em `backdrop_sky.jpg`. Camadas separadas p/ parallax: ❌ P2 |
| castle_distant | 🟡 | `castle_cliff` |
| market_background | ❌ P1 | taverna/salão gótico noturno (landscape 1920×1080) |
| legacy_background | ❌ P1 | sala do trono / cripta (landscape) |
| upgrade_background | 🟡 | `research_codex_bg.jpg` |

## C. Terrain
| ID | Status | Origem |
|---|---|---|
| ground_grass_dark | ✅ | `tile_grass_a`, `tile_grass_b`, `tile_forest_floor` |
| ground_dirt | ✅ | `tile_soil` |
| ground_stone | ✅ | `tile_castle_stone`, `tile_cobble_a/b` |
| path_dirt | ✅ | `tile_dirt_road` |
| path_stone | ✅ | `tile_cobble_a/b` |
| fence_* (h/v/corner) | ✅ | `rail_fence_ne/nw/post`, `fence_palisade_ne/nw/post` |
| fence_gate | ✅ | `gate_main`, `gate_reinforced` |
| stone_wall | ✅ | `stone_wall_ne/nw` |
| bridge | ✅ | `tile_bridge` |
| stairs | ❌ P2 | |

## D. Farm structures
| ID | Status | Origem |
|---|---|---|
| small/medium/large_human_pen | 🟡 | compor com `rail_fence_*` / `fence_palisade_*` + `mattress_pile` + `plot_marker` |
| **small_blood_tank** | ❌ **P0** | o ponto de coleta clicável do início. Precisa: corpo do tanque + **camada de líquido separada** (para encher 0–100%) |
| medium_blood_tank / large_blood_tank | ❌ P1 | mesma lógica, maiores |
| blood_storage | 🟡 | `bld_collect_2`, `crate_vials` |
| blood_processor | ❌ P1 | máquina de processamento |
| blood_lab | ✅ | `bld_lab` |
| collection_station | ✅ | `bld_collect_1` |
| warehouse | ❌ P1 | |
| small_barn | ✅ | `bld_housing_1` (cabana inicial) |
| large_barn | ✅ | `bld_boarding` |
| worker_house | ✅ | `bld_housing_2`, `bld_housing_3` |
| vampire_office | ❌ P1 | |
| market_cart | ✅ | `bld_market` |
| delivery_cart | ✅ | `hand_cart` |
| construção em andamento | ✅ | `bld_site_small`, `bld_site_large` (bom para "expandindo...") |
| industrial_machine_01/02/03 | ❌ P2 | |

## E. Industrial components — tudo ❌ P1/P2
pipe_straight_horizontal, pipe_straight_vertical, pipe_corner_01, pipe_corner_02, pipe_t_junction, pipe_cross, pipe_valve, pipe_pump, pipe_connector (**isométricos NE/NW**), industrial_tank, blood_fountain.
Tubos são P1 (Stage 2 "primeiros tubos"); o resto P2.

## F. Transport
| ID | Status | Origem |
|---|---|---|
| small_cart | ✅ | `hand_cart` |
| blood_cart | 🟡 | `hand_cart` + `crate_vials` |
| delivery_wagon / royal_carriage | ✅ | `carriage` (estático — **animação andando ❌ P1**) |
| industrial_wagon | ❌ P2 | |

## G. Humans
| ID | Status | Origem |
|---|---|---|
| human_male_01 | ✅ | `human_actions` (12f) + `human_walk_front/back` |
| human_male_02 | ✅ | `human_b` (16f: walk, idle, talk, eat/work, sleep) |
| human_male_03 | ✅ | `davi` (16f) |
| elderly_human_01 | ✅ | `human_c` (16f) |
| human_female_01 | ✅ | `lia` (16f) |
| worker_human_01 | ✅ | `human_actions_2` |
| human_female_02 / 03 | ❌ P1 | 16f no padrão `human_b` |
| farmer_human_01 (chapéu) | ❌ P2 | |
| animações **sit** e **carry (balde)** | ❌ P1 | existem idle/walk/talk/eat/work/sleep; faltam sentar e carregar balde |

## H. Vampire workers
| ID | Status | Origem |
|---|---|---|
| vampire_worker_01 | ✅ | `vampire_buyer` (16f) |
| vampire_worker_02 | ✅ | `ghoul_worker` (16f) |
| vampire_manager | ✅ | `boris` (16f, prancheta) |
| vampire_lab_worker | ✅ | `hematico` / `alchemist_unit` |
| **vampire_collector** (anda + coleta + carrega balde) | ❌ **P0** | é o visual do Auto Collect ("vampiros começam a andar pelo mapa"). Temporário: `vampire_buyer` sem balde |
| vampire_driver | ❌ P2 | |

## I. NPC portraits (256×256, 1 expressão cada)
| NPC | Status | Origem |
|---|---|---|
| npc_mordecai | ✅ | `portrait_boris` (mordomo-ghoul cínico com prancheta — encaixa perfeito) |
| npc_lady_vespera | ✅ | `portrait_rubelia` (cabelo branco, vestido vermelho, leque) |
| npc_silas_blackbottle | ✅ | `portrait_merchant` (chapéu, frasco de sangue) |
| npc_count_drakan | ✅ | `portrait_aureliano` (nobre armado, bigode, arrogante) |
| npc_dr_hematic | ✅ | `portrait_hematico` |
| npc_inspector_graves | ✅ | `portrait_inspector` |
| npc_baroness_nocturna | 🟡 | `portrait_vesper` (elegante com taça) — ou retrato novo P1 |
| expressões happy/annoyed/angry/smug | ❌ P2 | hoje só neutral |
| sprites de corpo inteiro dos NPCs | ✅ | `boris`, `rubelia`, `aureliano`, `hematico`, `vesper` (16f) |

## J. Resource icons
| ID | Status | Origem |
|---|---|---|
| icon_blood | ✅ | `icon_blood` |
| icon_gold | ✅ | `icon_gold` |
| icon_ancestral_essence | ✅ | `blood_umbra` (gota roxa com olho) |
| icon_fine_blood | ✅ | `blood_rubra` |
| icon_royal_blood | ✅ | `blood_carmesim` (gota com coroa) |
| icon_garlic | ❌ P1 | |
| icon_storage | 🟡 | `barrel` reduzido |
| icon_population | ✅ | `icon_population` |
| icon_time | ✅ | `icon_time` |

## K. Upgrade icons
| ID | Status | Origem |
|---|---|---|
| upgrade_buy_human | 🟡 | `icon_population` (ideal: rosto de humano ❌ P1) |
| upgrade_auto_collect | ✅ | `icon_collect` |
| upgrade_expand_estate | ✅ | `icon_build` |
| upgrade_blood_processing | ✅ | `icon_research` |
| upgrade_storage | 🟡 | `barrel` |
| upgrade_logistics | 🟡 | `hand_cart` |
| upgrade_contracts | ✅ | `icon_contracts` |
| upgrade_offline | ✅ | `icon_offline` |
| upgrade_speed | ✅ | `icon_time` |
| upgrade_capacity | ❌ P1 | |

## L. Legacy icons
| ID | Status | Origem |
|---|---|---|
| legacy_crown | ✅ | `icon_prestige` |
| legacy_locked | ✅ | `icon_lock` |
| legacy_blood_production, legacy_trade, legacy_automation, legacy_human_efficiency, legacy_processing, legacy_contract_reward, legacy_client, legacy_refresh, legacy_offline, legacy_empire | ❌ P1 | 10 ícones. Até lá: ícones existentes dentro de moldura colorida por ramo |
| moldura de nó (vermelha/roxa/dourada) | ❌ P1 | |

## M. Navigation
| ID | Status | Origem |
|---|---|---|
| nav_farm | ❌ P0* | casa/celeiro — temporário: crop de `bld_housing_1` |
| nav_upgrades | ✅ | `icon_upgrade` |
| nav_market | ❌ P0* | barraca/loja — temporário: `icon_contracts` |
| nav_legacy | ✅ | `icon_prestige` |
| nav_settings | ✅ | `icon_settings` |

\*P0 com placeholder aceitável.

## N. UI
| ID | Status | Origem |
|---|---|---|
| panel_dark | ✅ | `frame_panel`, `frame_dialog` (9-slice) |
| panel_parchment | ✅ | `frame_card`, `codex_page` |
| panel_red / panel_purple / panel_gold | 🟡 | `frame_panel` tintado / `frame_portrait` (borda dourada) |
| **button_green** | ❌ **P0** | `button_normal` é vermelho; comprar/aceitar precisa verde (normal + pressed + disabled) |
| button_red | ✅ | `button_normal`, `button_pressed` |
| button_gold / button_dark / button_locked | ❌ P1 | |
| progress_bar_bg | ✅ | `bar_frame` |
| progress_bar_fill_red | ✅ | `bar_fills` (linha 1) |
| progress_bar_fill_purple | 🟡 | `bar_fills` azul tintado |
| resource_card (top bar) | ❌ P1 | temporário: `frame_tooltip` |
| upgrade_card | ✅ | `card_unit` |
| contract_card | ✅ | `frame_card` (pergaminho) |
| tooltip | ✅ | `frame_tooltip` |
| dialogue_box | ✅ | `frame_dialog` |
| speech_bubble | ✅ | `frame_bubble` |
| notification_panel / modal_panel | ✅ | `frame_panel` |
| cursores | ✅ | `cursor_arrow/hand/hammer` |
| balões de status (Zzz, ♥, !, ?) | ✅ | `mk_sleep`, `mk_happy`, `mk_event`, `mk_talk`, `mk_angry`, `mk_hungry`, `mk_star`, `mk_contract` |

## O. Decoration
| ID | Status | Origem |
|---|---|---|
| torch | ✅ | `torch_stand` |
| lantern | ✅ | `lamp_post`, `prop_8` |
| candle | ❌ P2 | |
| barrel | ✅ | `barrel` |
| crate | ✅ | `crates` |
| blood_bottle | ✅ | `crate_vials` |
| blood_bucket | ✅ | `prop_4` |
| wood_table / chair | ✅ | `prop_9`, `bench` |
| banner_red | ✅ | `banner_bat` |
| banner_black | 🟡 | `banner_bat` tintado |
| skull | ❌ P2 | |
| grave | ✅ | `tombstone_set` |
| statue | ✅ | `gargoyle` |
| tree_dark | ✅ | `pine_a/b/c`, `dead_tree_a/b` |
| bush / rock | ✅ | `bush_a/b`, `rock_a/b/c` |
| mushroom | ❌ P2 | |
| extras | ✅ | `well`, `fire_pit`, `mattress_pile`, `harvest_basket`, `prop_0…11`, `decal_0…16` |

## P. VFX
| ID | Status | Origem |
|---|---|---|
| blood_drop_particle | ✅ | `fx_blood_drop` (4f) |
| gold_particle | ✅ | `fx_coins` (4f) |
| essence_particle | 🟡 | `fx_sparkle` tintado roxo |
| purchase_spark | ✅ | `fx_sparkle` |
| upgrade_flash / unlock_flash | ❌ P1 | (dá para fazer em código no v0.1) |
| legacy_energy | 🟡 | `fx_spells` |
| smoke | ✅ | `fx_smoke` |
| steam | ❌ P2 | |
| fire | ❌ P2 | (tochas hoje são estáticas; chama animada ajudaria o "mundo vivo") |
| blood_orb (coleta flutuante) | ✅ | `blood_orb` (16f) |

## Q. World ambience
| ID | Status | Origem |
|---|---|---|
| bat_01 / bat_02 | ✅ | `fx_bat_swarm` (16f), `loading_bat` |
| crow | 🟡 | `wolf_raven` (é inimigo, testar) |
| cloud / fog | ❌ P2 | `fx_weather` tem névoa parcial |

## R. Audio (CC0)
| ID | Status | Origem |
|---|---|---|
| music_farm | ✅ | `music_night.mp3` |
| music_market | 🟡 | `music_forest.mp3` |
| music_legacy | ❌ P1 | |
| ambient_night | ❌ P1 | vento + grilos + morcegos (loop) |
| ambient_industry | ❌ P2 | máquinas/líquido |
| sfx_click | ✅ | `sfx_click` |
| sfx_purchase | ✅ | `sfx_coin` |
| sfx_error | ✅ | `sfx_error` |
| sfx_contract_accept | ✅ | `sfx_page` / `sfx_confirm` |
| sfx_contract_complete | ✅ | `sfx_coin2` |
| sfx_gold | ✅ | `sfx_coin` |
| sfx_blood_collect | ✅ | `sfx_drop` / `sfx_flask` |
| sfx_upgrade | ✅ | `sfx_build` |
| sfx_unlock | ✅ | `sfx_latch` |
| sfx_legacy | ✅ | `sfx_bong` / `sfx_bell` |
| sfx_cart | ❌ P2 | |
| sfx_bat | ❌ P2 | |
| vozes blip de diálogo | ✅ | `voice_*` (Mordecai = `voice_male_deep`) |

## S. Mobile / Store — tudo ❌ P2
game_icon, splash_screen, portrait_promo, landscape_promo, thumbnail, social_preview.

## Não utilizados (fora do escopo do incremental)
`wolf_*`, `unit_*`, `ghoul_guard/wall`, `sentinel_vampire`, `hunt_*`, `pin_*`, `regional_map`, `wave_flag`, `crop_*`, `temper_*`, `trait_*`, `quality_*`, `bld_guard_post/watchtower/sentinel_tower/bell/shelter`, `palisade_broken_*`, `rubble`, `fx_bolt/bomb/fear/hit/bell_wave/vampire_poof`.
