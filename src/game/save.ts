import type { PactId, Resource } from './data'
import { NODES } from './tree'

export interface Save {
  v: 6
  res: Record<Resource, number>
  levels: Record<string, number>
  city: number
  unlocked: number
  cleared: Record<number, boolean>
  echoes: number
  pact: PactId | null
  nights: number
  captures: number
  shinies: number
  bestNight: number
  victory: boolean
  muted: boolean
}

const KEY = 'crazyblood-lootfest-v6'
const fresh = (): Save => ({
  v: 6, res: { blood: 0, teeth: 0, shard: 0, pure: 0 }, levels: {}, city: 0, unlocked: 0, cleared: {}, echoes: 0,
  pact: null, nights: 0, captures: 0, shinies: 0, bestNight: 0, victory: false, muted: false,
})

export function load(): Save {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (raw && raw.v === 6) return { ...fresh(), ...raw, res: { ...fresh().res, ...raw.res }, levels: raw.levels || {}, cleared: raw.cleared || {} }
  } catch { /* corrupted save: start over */ }
  return fresh()
}

export const persist = (s: Save) => { try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ } }
export const resetSave = () => { try { localStorage.removeItem(KEY) } catch { /* ignore */ } }

export const level = (s: Save, id: string) => s.levels[id] ?? 0
export const totalLevels = (s: Save) => NODES.reduce((n, node) => n + level(s, node.id), 0)
