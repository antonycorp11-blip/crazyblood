// Smoke test for the game rules (runs the real TypeScript modules in Node).
import assert from 'node:assert/strict'
import esbuild from 'esbuild'
const memory = new Map(); globalThis.localStorage = { getItem: (k) => memory.get(k) || null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }
let seed = 9327; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const build = await esbuild.build({ stdin: { contents: "export * from './src/game/hunt.ts'; export * from './src/game/save.ts'; export * from './src/game/progress.ts'; export * from './src/game/night-end.ts'; export * from './src/game/tree.ts'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false })
const G = await import('data:text/javascript;base64,' + Buffer.from(build.outputFiles[0].contents).toString('base64'))

// a night with the aura parked on the crowd captures humans and ends at dawn
const save = G.load()
const hunt = new G.Hunt(save, { width: 900, height: 500 })
while (!hunt.ended) { const h = hunt.humans[0]; if (h) hunt.setAura(h.x, h.y - 26, true); hunt.update(0.05) }
assert.ok(hunt.captures > 0, 'captures humans')
assert.ok(hunt.loot.blood > 0, 'earns blood')
const report = G.bankNight(save, hunt)
assert.ok(save.res.blood > 0 && report.dice.faces.length >= 2, 'banks loot and rolls dice')

// the tree reveals children only after buying the parent
const child = G.NODES.find((n) => n.parent === 'root')
assert.equal(G.isRevealed(save, child), false)
save.res.blood = 1e6
assert.ok(G.buyNode(save, 'root'))
assert.equal(G.isRevealed(save, child), true)
assert.ok(G.buyNode(save, child.id))

// killing the boss clears the city and unlocks the next
assert.equal(G.clearCity(save, 0), 'city')
assert.equal(save.unlocked, 1)
assert.equal(save.city, 1)
console.log('smoke ok')
