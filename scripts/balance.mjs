// Balance simulator: a scripted player hunts night after night using the real game code.
//   node scripts/balance.mjs            → summary per city
//   node scripts/balance.mjs verbose    → every night
import esbuild from 'esbuild'
const memory = new Map(); globalThis.localStorage = { getItem: (k) => memory.get(k) || null, setItem: (k, v) => memory.set(k, v), removeItem: (k) => memory.delete(k) }
let seed = Number((process.argv.find((a) => a.startsWith("seed=")) || "seed=7").slice(5)); Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
const build = await esbuild.build({ stdin: { contents: "export * from './src/game/hunt.ts'; export * from './src/game/save.ts'; export * from './src/game/progress.ts'; export * from './src/game/night-end.ts'; export * from './src/game/tree.ts'; export * from './src/game/data.ts'", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', write: false })
const G = await import('data:text/javascript;base64,' + Buffer.from(build.outputFiles[0].contents).toString('base64'))
const verbose = process.argv.includes('verbose')
const early = process.argv.includes('early') // stop once the second era starts (the first ~15 minutes)
const SHOP_SECONDS = 12 // time a player spends between nights

function playNight(save) {
  const h = new G.Hunt(save, { width: 900, height: 500 })
  h.bossLeft = 0
  let tapClock = 0
  h.realTime = 0
  while (!h.ended) {
    h.realTime += 0.05
    // aim at the densest spot, the boss, or loot about to expire
    const drop = h.drops.find((d) => !d.pulled && d.life < 2.5)
    let tx = h.auraX, ty = h.auraY
    const a = h.duel?.attack
    if (a && a.botDodge === undefined) a.botDodge = Math.random() < 0.75 // players miss some dodges
    if (a && a.botDodge && a.t > 0.3 && !a.done) {
      // dodge: step out of the slam circle / sideways off the lunge line
      const fx = h.auraX, fy = h.auraY + 26
      if (a.kind === 'slam') { const dx = fx - a.x, dy = fy - a.y, d = Math.hypot(dx, dy) || 1; tx = a.x + dx / d * (a.r + 60); ty = a.y + dy / d * (a.r + 60) - 26 }
      else { const side = (fx - a.x) * a.dy - (fy - a.y) * a.dx >= 0 ? 1 : -1; tx = fx + a.dy * side * 120; ty = fy - a.dx * side * 120 - 26 }
    } else if (h.duel) { tx = h.boss.x + 30; ty = h.boss.y - 50 }
    else if (h.boss && Math.random() < 0.6) { tx = h.boss.x; ty = h.boss.y - 26 }
    else if (drop && Math.random() < 0.5) { tx = drop.x; ty = drop.y - 20 }
    else if (h.humans.length) {
      let best = h.humans[0], bestN = -1
      for (let i = 0; i < Math.min(12, h.humans.length); i++) {
        const c = h.humans[Math.floor(Math.random() * h.humans.length)]
        const n = h.humans.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < h.radius).length
        if (n > bestN) { best = c; bestN = n }
      }
      tx = best.x; ty = best.y - 26
    }
    // cursor moves at human speed (~900 px/s)
    const dx = tx - h.auraX, dy = ty - h.auraY, d = Math.hypot(dx, dy), step = 900 * 0.05
    h.setAura(d > step ? h.auraX + dx / d * step : tx, d > step ? h.auraY + dy / d * step : ty, true)
    tapClock += 0.05
    if (tapClock > 0.25) { tapClock = 0; h.tap() }
    h.update(0.05)
    if (h.boss) h.bossLeft = h.boss.hp / h.boss.maxHp
    if (h.duel) h.duelSeen = (h.duelSeen ?? 0) + 0.05
  }
  return h
}

function shop(save) {
  for (let k = 0; k < 200; k++) {
    const opts = G.NODES.filter((n) => G.canBuy(save, n)).sort((a, b) => G.priceOf(save, a) / (save.res[a.res] + 1) - G.priceOf(save, b) / (save.res[b.res] + 1))
    if (!opts.length) break
    G.buyNode(save, opts[0].id)
  }
}

const save = G.load()
let clock = 0, nights = 0
const cityStart = {}
const lines = []
while (!save.victory && nights < 450 && !(early && save.city >= 8)) {
  const city = save.city
  cityStart[city] ??= { t: clock, n: nights }
  if (!save.pact && nights > 0) save.pact = G.rollPacts(3)[0]
  const h = playNight(save)
  const report = G.bankNight(save, h)
  nights++; clock += h.realTime + SHOP_SECONDS + 4 /* result screen + dice */ + (h.bossKilled ? 12 : 0) /* story chapter */
  shop(save)
  if (verbose) console.log(`#${nights} t=${(clock / 60).toFixed(1)}m c${city + 1} ${h.captures} cap, terror ${h.terror}/${h.terrorNeeded}, boss ${h.bossSpawned ? (h.bossKilled ? 'KILLED' : 'fled ' + Math.round(h.bossLeft * 100) + '% hits ' + h.playerHits) : '-'} duel ${Math.round(h.duelSeen ?? 0)}s, +${G.fmtShort(report.total.blood)} blood, teeth ${Math.floor(report.total.teeth)}, shard ${Math.floor(report.total.shard)}, pure ${report.total.pure}, shinies ${h.shinies}, levels ${G.totalLevels(save)}, dmg ${G.fmtShort(h.damage)} x${h.tickRate.toFixed(1)}/s r${h.radius}, bossHp ${G.fmtShort(h.city.bossHp)}, humanHp ${G.fmtShort(h.humanHp)}`)
  if (report.outcome !== 'none') {
    const s = cityStart[city]
    lines.push(`Cidade ${String(city + 1).padStart(2)} ${G.CITIES[city].name.padEnd(20)} ${String(nights - s.n).padStart(3)} noites  ${(Math.round((clock - s.t) / 6) / 10).toString().padStart(5)} min   total ${Math.round(clock / 60)} min   níveis ${G.totalLevels(save)}   ${report.outcome === 'era' ? '★ nova era' : ''}`)
  }
}
console.log(lines.join('\n'))
console.log(`\n${save.victory ? 'VITÓRIA' : 'SEM VITÓRIA'} em ${nights} noites, ~${Math.round(clock / 60)} min de jogo. Níveis comprados ${G.totalLevels(save)}/${G.NODES.filter((n) => !n.infinite).reduce((a, n) => a + n.max, 0)} finitos. Shinies ${save.shinies}.`)
