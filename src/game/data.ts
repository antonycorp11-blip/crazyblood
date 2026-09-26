// Static game data: eras, cities, resources and pacts. Balance knobs live here.

export const ERAS = [
  { name: 'Pré-história', years: '30.000 a.C.', color: '#e4a66a', cities: [
    ['Clã da Lua', 'Nara, a batedora'], ['Vale das Cinzas', 'Grom, o caçador'], ['Rio dos Ossos', 'Uma, a curandeira'], ['Colinas de Fogo', 'Kara, a guerreira'], ['Grande Caverna', 'Tarek, o chefe']] },
  { name: 'Era Medieval', years: 'ano 1180', color: '#c289db', cities: [
    ['Vila das Lanternas', 'Mara, a mensageira'], ['Mercado de Bruma', 'Dario, o vigia'], ['Cidade Velha', 'Iris, a alquimista'], ['Fortaleza Rubra', 'Capitão Solano'], ['Capital do Sol', 'Regente Aurora']] },
  { name: 'Era Contemporânea', years: 'ano 2026', color: '#71ccef', cities: [
    ['Bairro Neon', 'Lia, a entregadora'], ['Terminal Central', 'Raul, o policial'], ['Distrito Industrial', 'Dra. Vega'], ['Centro Financeiro', 'Chefe Atlas'], ['Metrópole Solar', 'Prefeita Helia']] },
  { name: 'Era Futura', years: 'ano 2280', color: '#8ce7e4', cities: [
    ['Colônia Prisma', 'AX-7, a exploradora'], ['Porto Orbital', 'Sentinela Voss'], ['Núcleo Sintético', 'Dra. Nyx'], ['Bastião Quântico', 'Comandante Zero'], ['Nova Aurora', 'Imperatriz Solaris']] },
] as const

export const CITY_COUNT = 20
/** Difficulty curve: human HP and blood value per city (index 0-19). */
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
  const humanHp = Math.round(3 * Math.pow(CITY_BALANCE.hpGrowth, k))
  return {
    index: k, era: e, slot, name, boss,
    humanHp,
    blood: Math.round(Math.pow(CITY_BALANCE.bloodGrowth, k) * 10) / 10,
    terror: 30 + k * 9,
    bossHp: humanHp * (CITY_BALANCE.bossBase + k * CITY_BALANCE.bossPerCity) * Math.pow(CITY_BALANCE.bossExtra, k),
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
