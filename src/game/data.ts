// Static game data: eras, cities, resources and pacts. Balance knobs live here.

export const ERAS = [
  { name: 'Pré-história', years: '30.000 a.C.', color: '#e4a66a', cities: [
    ['Clã da Lua', 'Garra Cinzenta'], ['Vale das Cinzas', 'Uivo Rubro'], ['Rio dos Ossos', 'Presa de Pedra'], ['Colinas de Fogo', 'Salto Negro'], ['Grande Caverna', 'Alfa Fenrik']] },
  { name: 'Era Medieval', years: 'ano 1180', color: '#c289db', cities: [
    ['Vila das Lanternas', 'Lobo da Bruma'], ['Mercado de Bruma', 'Cavador de Tumbas'], ['Cidade Velha', 'Xamã Ulric'], ['Fortaleza Rubra', 'Lorde Couraça'], ['Capital do Sol', 'Alfa Varg']] },
  { name: 'Era Contemporânea', years: 'ano 2026', color: '#71ccef', cities: [
    ['Bairro Neon', 'Caçador Neon'], ['Terminal Central', 'Uivador da Tempestade'], ['Distrito Industrial', 'Brutamontes de Aço'], ['Centro Financeiro', 'Couraça Blindada'], ['Metrópole Solar', 'Mãe da Matilha']] },
  { name: 'Era Futura', years: 'ano 2280', color: '#8ce7e4', cities: [
    ['Colônia Prisma', 'Saltador Prisma'], ['Porto Orbital', 'Xamã Sintético'], ['Núcleo Sintético', 'Tempestade Quântica'], ['Bastião Quântico', 'Alfa Zero'], ['Nova Aurora', 'Mãe do Eclipse']] },
] as const

/** Every boss is a werewolf — the vampires' natural enemy. Sheet from /assets/wolves, optional tint, size. */
export const BOSS_WOLVES: Array<[string, string | null, number]> = [
  ['hunter', null, 1], ['howler', null, 1.05], ['brute', null, 1.1], ['leaper', null, 1.1], ['alpha', null, 1.2],
  ['scout', '#8a5cff', 1.05], ['digger', null, 1.1], ['shaman', null, 1.1], ['armored', null, 1.15], ['alpha', '#b04cff', 1.25],
  ['hunter', '#3ad0ff', 1.1], ['storm', null, 1.15], ['brute', '#6fa8ff', 1.2], ['armored', '#3ad0ff', 1.25], ['mother', null, 1.2],
  ['leaper', '#39ffe0', 1.2], ['shaman', '#39ffe0', 1.2], ['storm', '#8cf7ff', 1.25], ['alpha', '#39ffe0', 1.3], ['mother', '#ff2a4a', 1.35],
]

export const CITY_COUNT = 20
/** Difficulty curve: human HP and blood value per city (index 0-19). */
/** The first era is tuned to flow fast (a new city every ~2-3 nights): softer humans and werewolves. */
export const EARLY_EASE: Array<{ hp: number; boss: number }> = [{ hp: 0.67, boss: 0.4 }, { hp: 0.6, boss: 0.5 }, { hp: 0.55, boss: 0.32 }, { hp: 0.55, boss: 0.19 }, { hp: 0.7, boss: 0.09 }, { hp: 0.85, boss: 0.18 }, { hp: 0.9, boss: 0.55 }, { hp: 0.95, boss: 0.8 }]
export const CITY_BALANCE = { hpGrowth: 2.25, bloodGrowth: 1.35, bossBase: 220, bossPerCity: 40, bossExtra: 1.7 }

export interface City {
  index: number
  era: number
  slot: number
  name: string
  boss: string
  humanHp: number
  blood: number
  /** Captures in a single night that summon the boss. */
  terror: number
  bossHp: number
  guardShare: number
}

export const CITIES: City[] = ERAS.flatMap((era, e) => era.cities.map(([name, boss], slot) => {
  const k = e * 5 + slot
  const baseHp = 3 * Math.pow(CITY_BALANCE.hpGrowth, k)
  const ease = EARLY_EASE[k] ?? { hp: 1, boss: 1 }
  const humanHp = Math.max(2, Math.round(baseHp * ease.hp))
  return {
    index: k, era: e, slot, name, boss,
    humanHp,
    blood: Math.round(Math.pow(CITY_BALANCE.bloodGrowth, k) * 10) / 10,
    terror: k < 5 ? 20 + k * 7 : 30 + k * 9,
    bossHp: baseHp * (CITY_BALANCE.bossBase + k * CITY_BALANCE.bossPerCity) * Math.pow(CITY_BALANCE.bossExtra, k) * ease.boss,
    guardShare: Math.min(0.28, 0.02 + k * 0.018),
  }
}))

export type Resource = 'blood' | 'teeth' | 'shard' | 'pure'

export const RESOURCES: Record<Resource, { name: string; color: string; glyph: string }> = {
  blood: { name: 'Sangue', color: '#ff5470', glyph: '♦' },
  teeth: { name: 'Dentes de ouro', color: '#ffd35c', glyph: '▲' },
  shard: { name: 'Fragmentos', color: '#c68bff', glyph: '◆' },
  pure: { name: 'Sangue Puro', color: '#fff1f6', glyph: '✦' },
}

export type PactId = 'fullmoon' | 'longnight' | 'horde' | 'goldfever' | 'harvest' | 'frenzy' | 'bats' | 'hunter'

export const PACTS: Record<PactId, { name: string; text: string; icon: number }> = {
  fullmoon: { name: 'Lua Cheia', text: '+60% de dano na próxima noite', icon: 0 },
  longnight: { name: 'Noite Longa', text: '+6 s de noite', icon: 4 },
  horde: { name: 'Horda', text: '+70% de humanos', icon: 26 },
  goldfever: { name: 'Febre Dourada', text: 'Humanos shiny ×4', icon: 22 },
  harvest: { name: 'Colheita', text: '+100% de loot', icon: 23 },
  frenzy: { name: 'Frenesi', text: '+25% de chance de crítico', icon: 10 },
  bats: { name: 'Revoada', text: '+4 morcegos', icon: 12 },
  hunter: { name: 'Caçador de Reis', text: '+150% de dano no chefe', icon: 16 },
}
