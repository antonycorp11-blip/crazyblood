// End of night: blood dice, banking loot, boss/city results.
import type { Hunt, Loot } from './hunt'
import { persist, type Save } from './save'
import { clearCity } from './progress'

export interface DiceResult {
  faces: number[]
  rerolled: number[]
  bonus: Loot
  labels: string[]
}

export function rollDice(hunt: Hunt): DiceResult {
  const count = 2 + hunt.stats.dice
  let faces = Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 6))
  const rerolled: number[] = []
  for (let r = 0; r < hunt.stats.reroll; r++) {
    const low = faces.indexOf(Math.min(...faces))
    if (faces[low] >= 4) break
    faces[low] = 1 + Math.floor(Math.random() * 6)
    rerolled.push(low)
  }
  faces = [...faces]
  const sum = faces.reduce((a, b) => a + b, 0)
  const bonus: Loot = { blood: hunt.loot.blood * sum * 0.02, teeth: 0, shard: 0, pure: 0 }
  const labels: string[] = [`Soma ${sum}: +${Math.round(sum * 2)}% de sangue`]
  const counts = new Map<number, number>()
  faces.forEach((f) => counts.set(f, (counts.get(f) ?? 0) + 1))
  const tier = 1 + hunt.city.era
  for (const [face, n] of counts) {
    if (n === 2) { bonus.teeth += Math.ceil(tier * 3); labels.push(`Par de ${face}: dentes de ouro`) }
    if (n >= 3) { bonus.pure += 1; bonus.shard += Math.ceil(tier * 4); labels.push(`Trinca de ${face}: Sangue Puro!`) }
  }
  if (faces.every((f) => f === 6)) { bonus.blood *= 3; labels.push('SEIS EM TUDO: jackpot ×3') }
  return { faces, rerolled, bonus, labels }
}

export interface NightReport {
  total: Loot
  dice: DiceResult
  outcome: 'none' | 'city' | 'era' | 'victory'
}

export function bankNight(save: Save, hunt: Hunt): NightReport {
  const dice = rollDice(hunt)
  const total: Loot = {
    blood: hunt.loot.blood + dice.bonus.blood,
    teeth: hunt.loot.teeth + dice.bonus.teeth,
    shard: hunt.loot.shard + dice.bonus.shard,
    pure: hunt.loot.pure + dice.bonus.pure,
  }
  save.res.blood += total.blood
  save.res.teeth += Math.floor(total.teeth)
  save.res.shard += Math.floor(total.shard)
  save.res.pure += Math.floor(total.pure)
  save.nights++
  save.captures += hunt.captures
  save.shinies += hunt.shinies
  save.bestNight = Math.max(save.bestNight, hunt.captures)
  save.pact = null
  const outcome = hunt.bossKilled ? clearCity(save, hunt.city.index) : 'none'
  persist(save)
  return { total, dice, outcome }
}
