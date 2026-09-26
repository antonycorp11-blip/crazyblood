// One night of hunting: a short, loud, loot-filled run. Pure simulation (no DOM) — the renderer and UI read it.
import { CITIES, type City, type PactId, type Resource } from './data'
import { computeStats, type Stats } from './tree'
import { BOSS_ESCAPE, BOSS_EXPOSED, BOSS_HIT, BOSS_HOWL, BOSS_INTRO, HUMAN_CALM, HUMAN_ERA, HUMAN_PANIC, HUMAN_SHINY, HUMAN_WOLF, pick } from './story'
import type { Save } from './save'
import { controlsReserve, huntCamera } from '../viewport'

export type Kind = 'common' | 'runner' | 'guard' | 'rare' | 'boss'
export interface Human {
  id: number; x: number; y: number; vx: number; vy: number; hp: number; maxHp: number
  kind: Kind; shiny: boolean; flash: number; panic: number; life: number
  /** Humans scatter out of the city when the werewolf arrives. */
  flee?: boolean
}
/** A telegraphed werewolf attack: a slam circle on the ground or a lunge along a line. */
export interface BossAttack { kind: 'slam' | 'lunge'; x: number; y: number; dx: number; dy: number; len: number; r: number; windup: number; t: number; done: boolean; traveled: number }
/** The boss duel: the night clock stops, the city empties and it's you against the werewolf. */
export interface Duel { phase: 'intro' | 'fight'; t: number; timer: number; max: number; cd: number; exposed: number; howl: number; attack: BossAttack | null; count: number }
export type DropType = 'vial' | 'teeth' | 'shard' | 'pure'
export interface Drop { id: number; x: number; y: number; z: number; vz: number; type: DropType; amount: number; life: number; pulled: boolean }
export interface FloatText { x: number; y: number; vy: number; life: number; text: string; color: string; size: number }
export interface Spark { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
export interface Fx { x: number; y: number; row: number; age: number; duration: number; size: number }
export interface Loot { blood: number; teeth: number; shard: number; pure: number }
export interface Splat { x: number; y: number; r: number; life: number; rot: number }
export interface Soul { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
/** A speech bubble attached to a human (or the werewolf) by id. */
export interface Bubble { id: number; text: string; life: number; max: number; boss: boolean }
export interface Ring { x: number; y: number; r: number; max: number; life: number; color: string; width: number }
const COMBO_MARKS = [10, 25, 50, 100, 200, 400]

const rand = (a: number, b: number) => a + Math.random() * (b - a)
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
let NEXT = 1

export class Hunt {
  readonly city: City
  readonly stats: Stats
  readonly pact: PactId | null
  humans: Human[] = []
  drops: Drop[] = []
  texts: FloatText[] = []
  sparks: Spark[] = []
  fx: Fx[] = []
  splats: Splat[] = []
  souls: Soul[] = []
  rings: Ring[] = []
  bubbles: Bubble[] = []
  private chatClock = 1.2
  /** Brief slow-motion on big moments (boss kill, shiny). */
  hitStop = 0
  /** Camera punch-in, decays to 0. */
  punch = 0
  comboMark = 0
  loot: Loot = { blood: 0, teeth: 0, shard: 0, pure: 0 }
  elapsed = 0
  duration: number
  captures = 0
  shinies = 0
  crits = 0
  combo = 0
  bestCombo = 0
  comboClock = 0
  terror = 0
  boss: Human | null = null
  bossSpawned = false
  bossKilled = false
  bossEscaped = false
  duel: Duel | null = null
  /** Vampire invulnerability after being hit by the werewolf. */
  invuln = 0
  playerHits = 0
  ended = false
  shake = 0
  flashRed = 0
  sounds: string[] = []
  // aura / vampire
  auraX = 500; auraY = 340; auraOn = false
  /** Where the player wants the vampire to go (mouse) and the joystick vector (touch, length ≤ 1). */
  targetX = 500; targetY = 340
  joyX = 0; joyY = 0
  vampireX = 500; vampireY = 360
  bite = 0
  private tickClock = 0
  private spawnClock = 0
  private batClock = 0
  private biteCooldown = 0
  private bounds = { left: 120, right: 880, top: 190, bottom: 490 }

  constructor(private save: Save, viewport?: { width: number; height: number }) {
    this.city = CITIES[save.city]
    this.stats = computeStats(save.levels)
    this.pact = save.pact
    if (viewport) this.setViewport(viewport.width, viewport.height)
    this.duration = 15 + this.stats.nightTime + (this.pact === 'longnight' ? 6 : 0)
    for (let i = 0; i < 10 + this.city.slot * 2; i++) this.spawn()
  }

  // ───────── derived numbers
  get echoMult() { return Math.pow(1.3, this.save.echoes) }
  get damage() {
    const combo = 1 + (this.stats.comboDmg / 100) * Math.min(10, Math.floor(this.combo / 10))
    return (1 + this.stats.auraDmg) * (1 + this.stats.auraPct / 100) * Math.pow(1.12, this.stats.dmgMult) * this.echoMult * combo * (this.pact === 'fullmoon' ? 1.6 : 1)
  }
  get tickRate() { return 4 * (1 + this.stats.auraRate / 100) }
  /** Vampire movement speed in world px/s — upgraded in the tree. */
  get moveSpeed() { return 380 + this.stats.moveSpeed }
  get radius() { return Math.min(150, 48 + this.stats.auraRadius) }
  get critChance() { return Math.min(0.9, 0.05 + this.stats.critChance / 100 + (this.pact === 'frenzy' ? 0.25 : 0)) }
  get critMult() { return 2 + this.stats.critMult }
  get maxPop() { return Math.min(260, Math.round((22 + this.stats.maxPop) * (this.pact === 'horde' ? 1.7 : 1))) }
  get lootMult() { return (1 + this.stats.lootPct / 100) * (this.pact === 'harvest' ? 2 : 1) }
  get bloodPer() { return this.city.blood * (1 + this.stats.bloodPct / 100) * Math.pow(1.1, this.stats.bloodMult) * this.echoMult }
  get terrorNeeded() { return Math.ceil(this.city.terror * (1 - Math.min(60, this.stats.terrorPct) / 100)) }
  get bats() { return this.stats.bats + (this.pact === 'bats' ? 4 : 0) }
  get remaining() { return Math.max(0, this.duration - this.elapsed) }
  get humanHp() { return Math.max(1, this.city.humanHp * (1 - Math.min(75, this.stats.weaken) / 100)) }

  setViewport(width: number, height: number) {
    const v = huntCamera(width, Math.max(1, height))
    const reserve = controlsReserve(width, height) / v.scale
    this.bounds = { left: Math.max(60, v.left + 30), right: Math.min(940, v.right - 30), top: Math.max(185, v.top + 70), bottom: Math.min(500, v.bottom - 30 - reserve) }
  }

  // ───────── spawning
  private gaveShiny = false
  spawn(kind?: Kind, forceShiny = false) {
    if (!kind && this.humans.length >= this.maxPop) return
    const b = this.bounds
    const r = Math.random()
    const k: Kind = kind ?? (r < this.city.guardShare ? 'guard' : r < 0.26 ? 'runner' : r < 0.33 ? 'rare' : 'common')
    const shinyChance = (0.004 + this.stats.shinyChance / 100) * (this.pact === 'goldfever' ? 4 : 1)
    const shiny = k !== 'boss' && (forceShiny || Math.random() < shinyChance)
    const base = k === 'boss' ? this.city.bossHp * (1 - Math.min(75, this.stats.weaken) / 100) : this.humanHp * (k === 'guard' ? 3 : k === 'rare' ? 1.6 : k === 'runner' ? 0.8 : 1)
    const hp = base * (shiny ? 2.5 : 1)
    const fromEdge = this.elapsed > 0.2 && k !== 'boss'
    const x = fromEdge ? (Math.random() < 0.5 ? b.left : b.right) : rand(b.left, b.right)
    const y = rand(b.top, b.bottom)
    const h: Human = { id: NEXT++, x, y, vx: rand(-20, 20), vy: rand(-12, 12), hp, maxHp: hp, kind: k, shiny, flash: 0, panic: 0, life: 0 }
    if (k === 'boss') { h.x = (b.left + b.right) / 2; h.y = b.top - 60; h.vx = 0; h.vy = 1; this.boss = h }
    this.humans.push(h)
    if (shiny) { this.sounds.push('shiny'); this.say(h, pick(HUMAN_SHINY)) }
  }

  // ───────── input
  setAura(x: number, y: number, on: boolean) { this.targetX = x; this.targetY = y; this.auraOn = on }
  /** Virtual joystick: the vampire runs in this direction at moveSpeed × length. */
  steer(x: number, y: number) { const l = Math.hypot(x, y); const k = l > 1 ? 1 / l : 1; this.joyX = x * k; this.joyY = y * k; this.auraOn = true }

  /** Tap/click/bite button: a heavy bite where the vampire is. */
  tap() {
    if (this.ended || this.biteCooldown > 0) return
    this.biteCooldown = 0.18
    this.bite = 0.22
    const x = this.auraX, y = this.auraY
    const r = 26 + this.stats.biteRadius
    const dmg = this.damage * (3 + this.stats.biteDmg)
    let hit = false
    for (const h of [...this.humans]) if (!h.flee && Math.hypot(h.x - x, h.y - (h.kind === 'boss' ? 50 : 28) - y) < r + (h.kind === 'boss' ? 50 : 16)) { this.hit(h, dmg, true); hit = true }
    this.fx.push({ x, y, row: 1, age: 0, duration: 0.35, size: 70 })
    if (hit) this.sounds.push('bite')
  }

  // ───────── simulation
  update(dt: number) {
    if (this.ended) return
    dt = Math.min(0.05, dt)
    // visual-only timers run in real time; the simulation slows during hit-stop
    this.punch = Math.max(0, this.punch - dt * 2.5)
    for (const s of this.splats) s.life -= dt * 0.04
    this.splats = this.splats.filter((s) => s.life > 0)
    for (const r of this.rings) { r.life -= dt; r.r += (r.max - r.r) * Math.min(1, dt * 9) }
    this.rings = this.rings.filter((r) => r.life > 0).slice(-40)
    for (const s of this.souls) {
      const dx = this.vampireX - s.x, dy = this.vampireY - 50 - s.y, d = Math.hypot(dx, dy) || 1
      s.vx += (dx / d) * 1400 * dt; s.vy += (dy / d) * 1400 * dt; s.vx *= 0.9; s.vy *= 0.9
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt
      if (d < 18) s.life = 0
    }
    this.souls = this.souls.filter((s) => s.life > 0).slice(-80)
    if (this.hitStop > 0) { this.hitStop -= dt; dt *= 0.15 }
    if (!this.duel) this.elapsed += dt
    this.invuln = Math.max(0, this.invuln - dt)
    this.biteCooldown = Math.max(0, this.biteCooldown - dt)
    this.bite = Math.max(0, this.bite - dt)
    this.shake = Math.max(0, this.shake - dt * 18)
    this.flashRed = Math.max(0, this.flashRed - dt * 2)
    if (!this.duel) { this.comboClock -= dt; if (this.comboClock <= 0) this.combo = 0 }

    // waves: the city fills up as the night goes on
    const wave = 1 + 1.6 * (this.elapsed / this.duration)
    const rate = (2.4 + this.city.slot * 0.35) * (1 + this.stats.spawnPct / 100) * wave * (this.pact === 'horde' ? 1.7 : 1)
    if (!this.duel) this.spawnClock += dt
    while (this.spawnClock > 1 / rate) { this.spawnClock -= 1 / rate; this.spawn() }

    // the aura (the vampire's hunting spot) travels at moveSpeed toward the cursor or along the joystick
    const lim = this.bounds, step = this.moveSpeed * dt
    if (this.joyX || this.joyY) {
      this.auraX = Math.max(lim.left - 40, Math.min(lim.right + 40, this.auraX + this.joyX * step))
      this.auraY = Math.max(lim.top - 70, Math.min(lim.bottom, this.auraY + this.joyY * step))
      this.targetX = this.auraX; this.targetY = this.auraY
    } else {
      const dx = this.targetX - this.auraX, dy = this.targetY - this.auraY, d = Math.hypot(dx, dy)
      if (d <= step) { this.auraX = this.targetX; this.auraY = this.targetY } else { this.auraX += dx / d * step; this.auraY += dy / d * step }
    }
    // vampire body follows the aura
    this.vampireX += (this.auraX - this.vampireX) * Math.min(1, dt * 8)
    this.vampireY += (this.auraY + 26 - this.vampireY) * Math.min(1, dt * 8)

    if (this.duel) this.updateDuel(dt)
    // a guaranteed first shiny on the second night: the first jackpot comes early
    if (!this.gaveShiny && this.save.shinies === 0 && this.save.nights >= 1 && this.elapsed > 4 && !this.duel) { this.gaveShiny = true; this.spawn('rare', true) }

    // aura ticks
    if (this.auraOn) {
      this.tickClock += dt
      const gap = 1 / this.tickRate
      while (this.tickClock >= gap) {
        this.tickClock -= gap
        const r = this.radius
        let hits = 0
        for (const h of [...this.humans]) if (!h.flee && Math.hypot(h.x - this.auraX, (h.y - (h.kind === 'boss' ? 50 : 26)) - this.auraY) < r + (h.kind === 'boss' ? 45 : 12)) { this.hit(h, this.damage, false); hits++ }
        if (hits) this.rings.push({ x: this.auraX, y: this.auraY, r: r * 0.5, max: r, life: 0.25, color: '#ff5a74', width: 2 })
      }
    }

    // bats
    const bats = this.bats
    if (bats > 0) {
      this.batClock += dt
      const gap = 0.9 / (1 + this.stats.batRate / 100) / bats
      while (this.batClock >= gap) {
        this.batClock -= gap
        const target = this.boss && (this.duel || Math.random() < 0.35) ? this.boss : this.humans[Math.floor(Math.random() * this.humans.length)]
        if (target) {
          this.hit(target, this.damage * 0.6 * (1 + this.stats.batDmg / 100) * (target.kind === 'boss' ? 0.5 : 1), false, '#6be7d5')
          this.fx.push({ x: target.x, y: target.y - 30, row: 4, age: 0, duration: 0.4, size: 40 })
        }
      }
    }

    // humans wander and flee from the aura
    const b = this.bounds
    for (const h of this.humans) {
      h.life += dt; h.flash = Math.max(0, h.flash - dt); h.panic = Math.max(0, h.panic - dt)
      if (h.kind === 'boss') continue // the duel moves the werewolf
      if (h.flee) { h.x += h.vx * dt; h.y += h.vy * dt; continue }
      if (h.shiny && Math.random() < dt * 14) this.sparks.push({ x: h.x + rand(-12, 12), y: h.y - rand(10, 50), vx: rand(-10, 10), vy: rand(-40, -10), life: 0.6, color: '#ffe38a', size: 2 })
      const dx = h.x - this.auraX, dy = h.y - 26 - this.auraY, d = Math.hypot(dx, dy)
      if (this.auraOn && d < this.radius * 2.2) { h.vx += (dx / (d || 1)) * 60 * dt; h.vy += (dy / (d || 1)) * 40 * dt }
      const speed = (h.kind === 'runner' ? 1.9 : h.kind === 'guard' ? 0.7 : 1) * (h.shiny ? 2.2 : 1) * (h.panic > 0 ? 1.8 : 1)
      h.x += h.vx * speed * dt; h.y += h.vy * speed * dt
      if (h.x < b.left || h.x > b.right) h.vx *= -1
      if (h.y < b.top || h.y > b.bottom) h.vy *= -1
      h.x = clamp(h.x, b.left, b.right); h.y = clamp(h.y, b.top, b.bottom)
      h.vx = clamp(h.vx + rand(-12, 12) * dt, -40, 40); h.vy = clamp(h.vy + rand(-8, 8) * dt, -24, 24)
    }

    // chatter: now and then someone says something (scared if the vampire is close)
    this.chatClock -= dt
    if (this.chatClock <= 0) {
      this.chatClock = rand(1.4, 2.8)
      const pool = this.humans.filter((h) => h.kind !== 'boss' && !h.flee)
      const h = pool[Math.floor(Math.random() * pool.length)]
      if (h) {
        const near = Math.hypot(h.x - this.auraX, h.y - 26 - this.auraY) < this.radius * 2.5
        this.say(h, near ? pick(Math.random() < 0.5 ? HUMAN_PANIC : HUMAN_ERA[this.city.era]) : pick(HUMAN_CALM[this.city.era]))
      }
    }
    for (const bb of this.bubbles) bb.life -= dt
    this.bubbles = this.bubbles.filter((bb) => bb.life > 0 && this.humans.some((h) => h.id === bb.id))

    // loot on the ground: bounce, magnet, expire
    const pickup = this.radius * 0.6 + 30 + this.stats.magnet
    for (const d of this.drops) {
      d.life -= dt
      d.vz -= 520 * dt; d.z = Math.max(0, d.z + d.vz * dt); if (d.z === 0) d.vz = Math.abs(d.vz) > 60 ? -d.vz * 0.35 : 0
      const dist = Math.hypot(d.x - this.auraX, d.y - 20 - this.auraY)
      if (this.auraOn && dist < pickup) d.pulled = true
      if (d.pulled) {
        d.x += (this.auraX - d.x) * Math.min(1, dt * 12); d.y += (this.auraY + 20 - d.y) * Math.min(1, dt * 12)
        if (Math.hypot(d.x - this.auraX, d.y - 20 - this.auraY) < 16) { this.collect(d); d.life = -1 }
      }
    }
    this.drops = this.drops.filter((d) => d.life > 0)
    this.humans = this.humans.filter((h) => !h.flee || (h.x > b.left - 120 && h.x < b.right + 120))

    for (const t of this.texts) { t.y += t.vy * dt; t.vy *= 0.94; t.life -= dt }
    this.texts = this.texts.filter((t) => t.life > 0).slice(-60)
    for (const p of this.sparks) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.life -= dt }
    this.sparks = this.sparks.filter((p) => p.life > 0).slice(-260)
    for (const f of this.fx) f.age += dt
    this.fx = this.fx.filter((f) => f.age < f.duration).slice(-80)

    if (this.elapsed >= this.duration) this.finish()
  }

  hit(h: Human, base: number, bite: boolean, color?: string) {
    if (!this.humans.includes(h) || h.flee) return
    if (h.kind === 'boss' && this.duel?.phase === 'intro') return
    const crit = Math.random() < this.critChance
    let dmg = base * (crit ? this.critMult : 1)
    const exposed = h.kind === 'boss' && (this.duel?.exposed ?? 0) > 0
    if (h.kind === 'boss') dmg *= (1 + this.stats.bossDmg / 100) * (this.pact === 'hunter' ? 2.5 : 1) * (exposed ? 2 : 1)
    h.hp -= dmg; h.flash = 0.12; h.panic = 1
    if (crit) { this.crits++; if (h.kind === 'boss') this.hitStop = Math.max(this.hitStop, 0.03) }
    if (crit || bite || h.kind === 'boss') this.float(h.x + rand(-(h.kind === 'boss' ? 40 : 10), h.kind === 'boss' ? 40 : 10), h.y - (h.kind === 'boss' ? 120 : 58), fmtShort(dmg) + (crit ? '!' : ''), exposed ? '#ffb13b' : crit ? '#ffd35c' : color ?? '#ffffff', crit || exposed ? 20 : 14)
    if (h.hp <= 0) this.capture(h)
  }

  private capture(h: Human) {
    const i = this.humans.indexOf(h)
    if (i < 0) return
    this.humans.splice(i, 1)
    this.fx.push({ x: h.x, y: h.y - 30, row: 1, age: 0, duration: 0.5, size: h.kind === 'boss' ? 160 : 70 })
    if (h.kind === 'boss') return this.killBoss(h)
    this.captures++
    this.terror++
    this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.comboClock = 1.3
    const kindMult = h.kind === 'guard' ? 2.5 : h.kind === 'rare' ? 1.8 : h.kind === 'runner' ? 1.3 : 1
    const blood = this.bloodPer * kindMult
    this.loot.blood += blood
    this.float(h.x, h.y - 44, '+' + fmtShort(blood), '#ff5470', 13)
    this.burst(h.x, h.y - 24, h.shiny ? '#ffd35c' : '#e0183a', h.shiny ? 22 : 8)
    this.splats.push({ x: h.x + rand(-6, 6), y: h.y + rand(-3, 3), r: rand(7, 13) * (h.kind === 'guard' ? 1.4 : 1), life: 1, rot: rand(0, Math.PI) })
    if (this.splats.length > 140) this.splats.shift()
    for (let k = 0; k < (h.shiny ? 5 : 1); k++) this.souls.push({ x: h.x, y: h.y - 30, vx: rand(-160, 160), vy: rand(-220, -80), life: 1.4, color: h.shiny ? '#ffe38a' : '#ff3a5a', size: h.shiny ? 5 : 3.5 })
    this.rings.push({ x: h.x, y: h.y - 24, r: 4, max: 34, life: 0.3, color: h.shiny ? '#ffe38a' : '#ff7088', width: 3 })
    const mark = COMBO_MARKS.find((m) => this.combo === m)
    if (mark) { this.comboMark = mark; this.sounds.push('combo'); this.rings.push({ x: this.auraX, y: this.auraY, r: 10, max: 220, life: 0.5, color: '#ffe38a', width: 5 }) }
    this.sounds.push('capture')
    // loot rolls
    const s = this.stats
    if (Math.random() < 0.04 + s.vialChance / 100) this.drop(h, 'vial', blood * 5)
    if (Math.random() < s.teethChance / 100) this.drop(h, 'teeth', 1)
    if ((h.kind === 'rare' && Math.random() < 0.3) || Math.random() < s.shardChance / 100) this.drop(h, 'shard', 1)
    if (h.shiny) {
      this.shinies++
      const bonus = 1 + s.shinyValue
      for (let k = 0; k < 4; k++) this.drop(h, 'vial', blood * 5 * bonus)
      this.drop(h, 'teeth', Math.ceil(3 * bonus))
      if (Math.random() < 0.25) this.drop(h, 'pure', 1)
      this.shake = 8
      this.hitStop = 0.12
      this.punch = 0.6
      this.rings.push({ x: h.x, y: h.y - 30, r: 10, max: 120, life: 0.6, color: '#ffe38a', width: 6 })
      this.sounds.push('jackpot')
    }
    // explosions
    if (Math.random() < s.explodeChance / 100) this.explode(h.x, h.y, 0)
    // boss summon
    if (!this.bossSpawned && this.terror >= this.terrorNeeded) this.startDuel()
  }

  private explode(x: number, y: number, depth: number) {
    this.fx.push({ x, y: y - 20, row: 3, age: 0, duration: 0.55, size: 150 })
    this.rings.push({ x, y: y - 20, r: 8, max: 80, life: 0.45, color: '#ffae5c', width: 6 })
    this.shake = Math.max(this.shake, 4)
    this.sounds.push('boom')
    const dmg = this.damage * (2 + this.stats.explodeDmg)
    for (const h of [...this.humans]) {
      if (h.kind !== 'boss' && Math.hypot(h.x - x, h.y - y) < 70) {
        const before = this.captures
        this.hit(h, dmg, false, '#ff9a4a')
        if (this.stats.chain > 0 && depth < 3 && this.captures > before && Math.random() < 0.25) this.explode(h.x, h.y, depth + 1)
      }
    }
  }

  // ───────── the werewolf duel
  get duelTime() { return 20 + this.stats.nightTime * 0.5 }

  say(h: Human, text: string, life = 1.7) {
    const boss = h.kind === 'boss'
    this.bubbles = this.bubbles.filter((b) => b.id !== h.id)
    if (!boss && this.bubbles.filter((b) => !b.boss).length >= 3) return
    this.bubbles.push({ id: h.id, text, life, max: life, boss })
  }

  private startDuel() {
    this.bossSpawned = true
    const b = this.bounds, mid = (b.left + b.right) / 2
    for (const h of this.humans) { h.flee = true; h.panic = 3; const dir = h.x < mid ? -1 : 1; h.vx = dir * rand(260, 360); h.vy = rand(-30, 30) }
    for (const h of this.humans.slice(0, 2)) this.say(h, pick(HUMAN_WOLF), 1.4)
    this.spawn('boss')
    const t = this.duelTime
    this.duel = { phase: 'intro', t: 0, timer: t, max: t, cd: 1.4, exposed: 0, howl: 0, attack: null, count: 0 }
    this.flashRed = 1; this.shake = 10; this.punch = 1
    this.sounds.push('boss')
  }

  /** Where the vampire stands (feet), for werewolf hits. */
  private get feet() { return { x: this.auraX, y: this.auraY + 26 } }

  private updateDuel(dt: number) {
    const d = this.duel!, boss = this.boss
    if (!boss) { this.duel = null; return }
    const b = this.bounds, era = this.city.era
    d.t += dt
    d.howl = Math.max(0, d.howl - dt)
    if (d.phase === 'intro') {
      boss.y += (b.top + 60 - boss.y) * Math.min(1, dt * 2.5)
      if (d.t > 1.2 && d.howl <= 0 && d.t < 1.3) { d.howl = 0.9; this.sounds.push('howl'); this.shake = 8; this.say(boss, BOSS_INTRO[this.city.index] ?? 'AUUUU!', 2.6) }
      if (d.t > 2.2) d.phase = 'fight'
      return
    }
    d.timer -= dt
    if (d.timer <= 0) return this.bossEscape()
    d.exposed = Math.max(0, d.exposed - dt)
    const f = this.feet
    const a = d.attack
    if (a) {
      a.t += dt
      if (a.kind === 'slam') {
        if (a.t >= a.windup && !a.done) {
          a.done = true; d.exposed = 1.3
          if (Math.random() < 0.4 && this.invuln <= 0) this.say(boss, pick(BOSS_EXPOSED), 1.2)
          this.shake = Math.max(this.shake, 9); this.sounds.push('slam')
          this.rings.push({ x: a.x, y: a.y, r: a.r * 0.3, max: a.r * 1.15, life: 0.35, color: '#ffb070', width: 7 })
          this.burst(a.x, a.y - 6, '#b89070', 18)
          if (Math.hypot(f.x - a.x, (f.y - a.y) / 0.55) < a.r) this.hurtPlayer(a.x, a.y)
        }
        if (a.t >= a.windup + 0.3) d.attack = null
      } else if (a.t >= a.windup) {
        const step = 950 * dt
        boss.x = clamp(boss.x + a.dx * step, b.left, b.right); boss.y = clamp(boss.y + a.dy * step, b.top, b.bottom); a.traveled += step
        boss.vx = a.dx
        if (Math.random() < 0.8) this.sparks.push({ x: boss.x + rand(-20, 20), y: boss.y - rand(0, 20), vx: -a.dx * 80, vy: rand(-60, -10), life: 0.4, color: '#c8b090', size: 3 })
        if (!a.done && Math.hypot(f.x - boss.x, (f.y - boss.y) / 0.6) < 60) { a.done = true; this.hurtPlayer(boss.x, boss.y) }
        if (a.traveled >= a.len) { d.attack = null; d.exposed = 1; this.shake = Math.max(this.shake, 5); this.sounds.push('slam') }
      }
      return
    }
    // stalk the vampire
    const dx = f.x - boss.x, dy = f.y - boss.y, dist = Math.hypot(dx, dy) || 1
    if (d.exposed <= 0 && dist > 80) {
      const sp = (70 + era * 12) * dt
      boss.x += dx / dist * sp; boss.y += dy / dist * sp; boss.vx = dx
    }
    boss.vy = dy
    boss.x = clamp(boss.x, b.left, b.right); boss.y = clamp(boss.y, b.top, b.bottom)
    if (d.exposed > 0) return
    d.cd -= dt
    if (d.cd > 0) return
    d.count++
    const enraged = boss.hp < boss.maxHp * 0.5
    const windup = Math.max(0.5, (enraged ? 0.75 : 0.95) - era * 0.05)
    d.cd = Math.max(0.8, (enraged ? 1.3 : 1.9) - era * 0.1)
    if (enraged && d.count % 3 === 0) {
      // howl: the werewolf calls prey back into the city — food for the vampire's combo
      d.howl = 0.9; this.sounds.push('howl'); this.shake = 6; this.say(boss, pick(BOSS_HOWL), 1.4)
      for (let k = 0; k < 6; k++) this.spawn('common')
      return
    }
    this.sounds.push('warn')
    if (dist > 170 || Math.random() < 0.45) {
      const len = Math.min(dist + 140, 560)
      d.attack = { kind: 'lunge', x: boss.x, y: boss.y, dx: dx / dist, dy: dy / dist, len, r: 46, windup, t: 0, done: false, traveled: 0 }
    } else {
      d.attack = { kind: 'slam', x: f.x, y: f.y, dx: 0, dy: 0, len: 0, r: 88 + era * 6, windup, t: 0, done: false, traveled: 0 }
    }
  }

  private hurtPlayer(fromX: number, fromY: number) {
    if (this.invuln > 0 || !this.duel) return
    this.invuln = 1
    this.playerHits++
    this.duel.timer -= 2
    this.combo = Math.floor(this.combo / 2)
    this.shake = 14; this.flashRed = 1; this.hitStop = 0.08
    const dx = this.auraX - fromX, dy = this.auraY + 26 - fromY, d = Math.hypot(dx, dy) || 1, b = this.bounds
    this.auraX = clamp(this.auraX + dx / d * 90, b.left, b.right); this.auraY = clamp(this.auraY + dy / d * 60, b.top - 60, b.bottom)
    this.targetX = this.auraX; this.targetY = this.auraY
    this.float(this.auraX, this.auraY - 50, '-2s', '#ff4060', 26)
    if (this.boss) this.say(this.boss, pick(BOSS_HIT), 1.2)
    this.burst(this.auraX, this.auraY, '#ff2a4a', 16)
    this.sounds.push('hurt')
  }

  private bossEscape() {
    const boss = this.boss
    this.duel = null
    this.bossEscaped = true
    if (!boss) return
    this.humans = this.humans.filter((h) => h !== boss)
    this.boss = null
    this.float(boss.x, boss.y - 110, 'FUGIU!', '#ffb13b', 28)
    this.texts.push({ x: boss.x, y: boss.y - 150, vy: -30, life: 2, text: pick(BOSS_ESCAPE), color: '#ffffff', size: 16 })
    for (let k = 0; k < 10; k++) this.sparks.push({ x: boss.x + rand(-30, 30), y: boss.y - rand(0, 90), vx: rand(-80, 80), vy: rand(-120, -20), life: 0.8, color: '#8a8aa0', size: 5 })
    this.sounds.push('escape')
  }

  private killBoss(h: Human) {
    this.bossKilled = true
    this.boss = null
    this.duel = null
    this.shake = 16
    this.hitStop = 0.35
    this.punch = 1.4
    for (let k = 0; k < 4; k++) this.rings.push({ x: h.x, y: h.y - 40, r: 10 + k * 20, max: 260 + k * 60, life: 0.7 + k * 0.1, color: k % 2 ? '#ffe38a' : '#ff3a5a', width: 8 - k })
    for (let k = 0; k < 12; k++) this.souls.push({ x: h.x, y: h.y - 40, vx: rand(-300, 300), vy: rand(-320, -60), life: 1.8, color: '#ffe38a', size: 6 })
    this.flashRed = 0.6
    this.sounds.push('bosskill')
    const blood = this.bloodPer * 60
    this.loot.blood += blood
    this.float(h.x, h.y - 80, '+' + fmtShort(blood), '#ff5470', 26)
    for (let k = 0; k < 8; k++) this.drop(h, 'vial', this.bloodPer * 8)
    for (let k = 0; k < 4; k++) this.drop(h, 'shard', 2 + this.city.era)
    this.drop(h, 'pure', 1 + Math.floor(this.city.index / 5))
    this.burst(h.x, h.y - 30, '#ffd35c', 60)
  }

  private drop(h: Human, type: DropType, amount: number) {
    const life = 4.5 + this.stats.dropLife
    const mult = type === 'vial' ? this.lootMult : type === 'pure' ? 1 : Math.sqrt(this.lootMult)
    this.drops.push({ id: NEXT++, x: h.x + rand(-26, 26), y: h.y + rand(-10, 10), z: 10, vz: rand(160, 260), type, amount: amount * mult, life, pulled: false })
  }

  private collect(d: Drop) {
    const key: Resource = d.type === 'vial' ? 'blood' : d.type
    this.loot[key] += d.amount
    const color = d.type === 'vial' ? '#ff5470' : d.type === 'teeth' ? '#ffd35c' : d.type === 'shard' ? '#c68bff' : '#ffffff'
    this.float(this.auraX, this.auraY - 30, '+' + fmtShort(d.amount) + (d.type === 'vial' ? '' : d.type === 'teeth' ? ' ▲' : d.type === 'shard' ? ' ◆' : ' ✦'), color, d.type === 'pure' ? 22 : 15)
    this.sounds.push(d.type === 'pure' ? 'pure' : 'pickup')
    this.rings.push({ x: this.auraX, y: this.auraY + 10, r: 4, max: d.type === 'pure' ? 70 : 30, life: 0.3, color: d.type === 'vial' ? '#ff5470' : d.type === 'teeth' ? '#ffd35c' : d.type === 'shard' ? '#c68bff' : '#ffffff', width: 3 })
  }

  private float(x: number, y: number, text: string, color: string, size: number) {
    this.texts.push({ x, y, vy: -60, life: 0.9, text, color, size })
  }

  private burst(x: number, y: number, color: string, n: number) {
    for (let i = 0; i < n; i++) this.sparks.push({ x, y, vx: rand(-110, 110), vy: rand(-160, -20), life: rand(0.3, 0.8), color, size: rand(2, 5) })
  }

  finish() {
    if (this.ended) return
    this.ended = true
    // everything still on the ground at dawn is swept up at half value
    for (const d of this.drops) { d.amount *= 0.5; const key: Resource = d.type === 'vial' ? 'blood' : d.type; this.loot[key] += d.amount }
    this.drops = []
  }
}

export function fmtShort(n: number): string {
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n))
  const units = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc']
  let u = -1
  while (n >= 1000 && u < units.length - 1) { n /= 1000; u++ }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n).toString()) + units[u]
}
