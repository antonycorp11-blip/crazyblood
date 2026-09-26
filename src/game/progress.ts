// Tree purchases, visibility and city unlocks.
import { CITIES, type PactId, PACTS } from './data'
import { NODES, NODE_BY_ID, nodeCost, type TreeNode } from './tree'
import { level, persist, type Save } from './save'

/** A node is on the map once its parent is owned (the root is always there). */
export const isRevealed = (s: Save, n: TreeNode) => !n.parent || level(s, n.parent) > 0
export const isMaxed = (s: Save, n: TreeNode) => level(s, n.id) >= n.max
export const priceOf = (s: Save, n: TreeNode) => nodeCost(n, level(s, n.id))
export const canBuy = (s: Save, n: TreeNode) => isRevealed(s, n) && !isMaxed(s, n) && s.res[n.res] >= priceOf(s, n)

export function buyNode(s: Save, id: string): boolean {
  const n = NODE_BY_ID[id]
  if (!n || !canBuy(s, n)) return false
  s.res[n.res] -= priceOf(s, n)
  s.levels[id] = level(s, id) + 1
  persist(s)
  return true
}

export const affordableCount = (s: Save) => NODES.filter((n) => canBuy(s, n)).length

/** Boss of a city killed: unlock the next one. Returns 'era' when a whole era was completed. */
export function clearCity(s: Save, index: number): 'city' | 'era' | 'victory' {
  const first = !s.cleared[index]
  s.cleared[index] = true
  if (index === CITIES.length - 1) { s.victory = true; persist(s); return 'victory' }
  if (s.unlocked <= index) s.unlocked = index + 1
  const eraDone = first && index % 5 === 4
  if (eraDone) s.echoes++
  if (first) s.city = index + 1
  persist(s)
  return eraDone ? 'era' : 'city'
}

export function rollPacts(count: number): PactId[] {
  const all = Object.keys(PACTS) as PactId[]
  for (let i = all.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [all[i], all[j]] = [all[j], all[i]] }
  return all.slice(0, count)
}
