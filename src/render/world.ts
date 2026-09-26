// Draws a night of hunting: city, humans, loot, aura, vampire, bats, effects and floating numbers.
import type { Hunt, Human, Drop } from '../game/hunt'
import { huntCamera, huntZoom, W, H } from '../viewport'
import { BOSS_WOLVES } from '../game/data'
import { activity, bat as drawBat, drawSky, glow, humanAtlas, ready, rect, scenery, sprites } from './scenery'

const ROW: Record<Human['kind'], number> = { common: 0, runner: 1, guard: 2, rare: 3, boss: 4 }

// ───────── werewolf bosses (sheets from the sister project: 0-3 walk, 4-7 walk away, 8-11 claw, 12-15 howl)
const wolfCache = new Map<string, HTMLImageElement | HTMLCanvasElement>()
function wolfSheet(index: number) {
  const [name, tint] = BOSS_WOLVES[index], key = name + (tint ?? '')
  const hit = wolfCache.get(key); if (hit) return hit
  const img = new Image()
  img.src = `/assets/wolves/${name}.webp`
  wolfCache.set(key, img)
  if (tint) img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
    const g = cv.getContext('2d')!
    g.drawImage(img, 0, 0)
    g.globalCompositeOperation = 'color'; g.globalAlpha = 0.65; g.fillStyle = tint; g.fillRect(0, 0, cv.width, cv.height)
    g.globalCompositeOperation = 'destination-in'; g.globalAlpha = 1; g.drawImage(img, 0, 0)
    wolfCache.set(key, cv)
  }
  return img
}

function werewolf(c: CanvasRenderingContext2D, hunt: Hunt, h: Human, t: number) {
  const sheet = wolfSheet(hunt.city.index)
  if (sheet instanceof HTMLImageElement && !ready(sheet)) return
  const fw = sheet.width / 16, fh = sheet.height, size = BOSS_WOLVES[hunt.city.index][2]
  const hh = 165 * size, ww = hh * fw / fh
  const d = hunt.duel
  let frame: number
  let wobble = 0
  if (d && d.howl > 0) frame = 12 + Math.min(3, Math.floor((1 - d.howl / 0.9) * 4))
  else if (d?.attack) { const a = d.attack; frame = a.t < a.windup ? 8 + Math.min(1, Math.floor((a.t / a.windup) * 2)) : 10 + (Math.floor(t * 14) % 2) }
  else if (d && d.exposed > 0) { frame = 11; wobble = Math.sin(t * 30) * 3 }
  else frame = (h.vy < -30 ? 4 : 0) + (Math.floor(t * 7) % 4)
  const x = Math.round(h.x), y = Math.round(h.y)
  // menace: red halo under the beast
  c.globalCompositeOperation = 'lighter'
  glow(c, x, y - hh * 0.45, hh * 0.7, d && d.exposed > 0 ? 'rgba(255,190,60,0.35)' : 'rgba(255,40,70,0.28)')
  c.globalCompositeOperation = 'source-over'
  c.fillStyle = '#05030acc'; c.beginPath(); c.ellipse(x, y + 2, ww * 0.34, 12 * size, 0, 0, Math.PI * 2); c.fill()
  c.save(); c.translate(x + wobble, y); if (h.vx < 0) c.scale(-1, 1)
  c.drawImage(sheet, frame * fw, 0, fw, fh, -ww / 2, -hh + 6, ww, hh)
  if (h.flash > 0) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, h.flash * 6) * 0.55
    c.drawImage(sheet, frame * fw, 0, fw, fh, -ww / 2, -hh + 6, ww, hh)
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
  }
  c.restore()
  if (d && d.exposed > 0) for (let i = 0; i < 3; i++) {
    const a = t * 6 + i * 2.1
    c.fillStyle = '#ffd35c'; c.font = '900 18px Inter, sans-serif'; c.textAlign = 'center'
    c.fillText('★', x + Math.cos(a) * 30, y - hh - 4 + Math.sin(a) * 8)
  }
}

/** Ground markings for incoming werewolf attacks — get out of the red. */
function telegraphs(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const a = hunt.duel?.attack
  if (!a) return
  const k = Math.min(1, a.t / a.windup)
  if (a.kind === 'slam') {
    if (a.done) return
    c.fillStyle = `rgba(255,30,60,${0.12 + k * 0.28})`
    c.beginPath(); c.ellipse(a.x, a.y, a.r, a.r * 0.55, 0, 0, Math.PI * 2); c.fill()
    c.strokeStyle = `rgba(255,90,110,${0.6 + Math.sin(t * 30) * 0.3})`; c.lineWidth = 3
    c.stroke()
    c.fillStyle = 'rgba(255,60,80,0.35)'
    c.beginPath(); c.ellipse(a.x, a.y, a.r * k, a.r * 0.55 * k, 0, 0, Math.PI * 2); c.fill()
  } else if (a.t < a.windup) {
    c.save(); c.translate(a.x, a.y); c.rotate(Math.atan2(a.dy, a.dx))
    c.fillStyle = `rgba(255,30,60,${0.12 + k * 0.3})`; c.fillRect(0, -a.r * 0.8, a.len, a.r * 1.6)
    c.strokeStyle = `rgba(255,90,110,${0.6 + Math.sin(t * 30) * 0.3})`; c.lineWidth = 3; c.strokeRect(0, -a.r * 0.8, a.len, a.r * 1.6)
    c.fillStyle = 'rgba(255,200,210,0.7)'
    for (let i = 0; i < 4; i++) {
      const px = ((i / 4 + t * 1.5) % 1) * a.len
      c.beginPath(); c.moveTo(px, -14); c.lineTo(px + 16, 0); c.lineTo(px, 14); c.lineTo(px + 6, 0); c.closePath(); c.fill()
    }
    c.restore()
  }
}

/** Comic speech bubbles over heads; the werewolf's are bigger and red. */
function bubbles(c: CanvasRenderingContext2D, hunt: Hunt) {
  for (const b of hunt.bubbles) {
    const h = hunt.humans.find((x) => x.id === b.id); if (!h) continue
    const age = b.max - b.life, pop = age < 0.12 ? 0.6 + age / 0.12 * 0.4 : 1
    const size = b.boss ? 16 : 12
    c.font = `800 ${size}px Inter, system-ui, sans-serif`
    const tw = c.measureText(b.text).width, pw = tw + 16, ph = size + 12
    const top = b.boss ? h.y - 165 * BOSS_WOLVES[hunt.city.index][2] - 18 : h.y - 76
    const x = Math.max(pw / 2 + 4, Math.min(W - pw / 2 - 4, h.x))
    c.save(); c.translate(x, top); c.scale(pop, pop); c.globalAlpha = Math.min(1, b.life * 3)
    c.fillStyle = b.boss ? '#2a0610f0' : '#fffaf0f2'; c.strokeStyle = b.boss ? '#ff3a5c' : '#1a0a14'; c.lineWidth = 2
    c.beginPath(); c.roundRect(-pw / 2, -ph, pw, ph, 8); c.fill(); c.stroke()
    c.beginPath(); c.moveTo(h.x - x - 5, -1); c.lineTo(h.x - x, 8); c.lineTo(h.x - x + 5, -1); c.closePath(); c.fill()
    c.fillStyle = b.boss ? '#ffd0d8' : '#1a0a14'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(b.text, 0, -ph / 2 + 1)
    c.restore()
  }
  c.globalAlpha = 1; c.textBaseline = 'alphabetic'
}

function human(c: CanvasRenderingContext2D, hunt: Hunt, h: Human, t: number) {
  if (h.kind === 'boss') return werewolf(c, hunt, h, t)
  const atlas = humanAtlas(hunt.city.era)
  if (!ready(atlas)) return
  const scale = 1
  const x = Math.round(h.x), y = Math.round(h.y)
  c.fillStyle = '#0b0d1a88'
  c.beginPath(); c.ellipse(x, y + 1, 13 * scale, 5 * scale, 0, 0, Math.PI * 2); c.fill()
  if (h.shiny) {
    const glow = c.createRadialGradient(x, y - 28 * scale, 4, x, y - 28 * scale, 40 * scale)
    glow.addColorStop(0, '#ffe27a88'); glow.addColorStop(1, '#0000')
    c.fillStyle = glow; c.beginPath(); c.arc(x, y - 28 * scale, 40 * scale, 0, Math.PI * 2); c.fill()
  }
  const frame = h.flash > 0 ? 4 : h.panic > 0 ? [1, 3, 2, 3][Math.floor(t * 12 + h.id) % 4] : Math.floor(t * 5 + h.id) % 3
  c.save(); c.translate(x, y); if (h.vx < 0) c.scale(-1, 1)
  c.drawImage(atlas, frame * 96, ROW[h.kind] * 96, 96, 96, -26 * scale, -60 * scale, 52 * scale, 62 * scale)
  if (h.flash > 0) {
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, h.flash * 8) * 0.8
    c.drawImage(atlas, frame * 96, ROW[h.kind] * 96, 96, 96, -26 * scale, -60 * scale, 52 * scale, 62 * scale)
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
  }
  if (h.shiny) {
    // gold sheen: redraw with additive blending
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 + Math.sin(t * 8 + h.id) * 0.15
    c.drawImage(atlas, frame * 96, ROW[h.kind] * 96, 96, 96, -26, -60, 52, 62)
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1
  }
  c.restore()
  if (h.shiny) for (let i = 0; i < 3; i++) {
    const a = t * 3 + i * 2.1 + h.id
    rect(c, x + Math.cos(a) * 18, y - 34 + Math.sin(a * 1.3) * 16, 3, 3, '#fff3b0')
  }
  if (h.hp < h.maxHp) { rect(c, x - 16, y - 66, 32, 4, '#1c1729'); rect(c, x - 15, y - 65, 30 * Math.max(0, h.hp / h.maxHp), 2, h.shiny ? '#ffd35c' : '#ff5470') }
}

function drop(c: CanvasRenderingContext2D, d: Drop, t: number) {
  if (d.life < 1.4 && Math.floor(t * 10) % 2) return // blink before vanishing
  const x = d.x, y = d.y - d.z
  const color = d.type === 'vial' ? '#ff4262' : d.type === 'teeth' ? '#ffd35c' : d.type === 'shard' ? '#c68bff' : '#ffffff'
  const glow = c.createRadialGradient(x, y, 1, x, y, d.type === 'pure' ? 26 : 16)
  glow.addColorStop(0, color + 'cc'); glow.addColorStop(1, color + '00')
  c.fillStyle = glow; c.beginPath(); c.arc(x, y, d.type === 'pure' ? 26 : 16, 0, Math.PI * 2); c.fill()
  c.fillStyle = '#0006'; c.beginPath(); c.ellipse(d.x, d.y + 2, 6, 2.5, 0, 0, Math.PI * 2); c.fill()
  c.save(); c.translate(x, y)
  const bob = Math.sin(t * 5 + d.id) * 1.5
  c.translate(0, bob)
  c.lineWidth = 2; c.strokeStyle = '#1a0a14'
  if (d.type === 'vial') {
    c.fillStyle = '#ffe9ee'; c.fillRect(-3, -9, 6, 4)
    c.beginPath(); c.moveTo(-5, -5); c.lineTo(5, -5); c.lineTo(6, 6); c.lineTo(-6, 6); c.closePath(); c.fillStyle = color; c.fill(); c.stroke()
    c.fillStyle = '#fff8'; c.fillRect(-3, -3, 2, 6)
  } else if (d.type === 'teeth') {
    c.beginPath(); c.moveTo(-5, -6); c.lineTo(5, -6); c.lineTo(3, 7); c.lineTo(0, 3); c.lineTo(-3, 7); c.closePath(); c.fillStyle = color; c.fill(); c.stroke()
  } else if (d.type === 'shard') {
    c.rotate(t * 2)
    c.beginPath(); c.moveTo(0, -8); c.lineTo(6, 0); c.lineTo(0, 8); c.lineTo(-6, 0); c.closePath(); c.fillStyle = color; c.fill(); c.stroke()
  } else {
    c.rotate(t * 3)
    c.beginPath()
    for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = (i / 10) * Math.PI * 2; c.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
    c.closePath(); c.fillStyle = color; c.fill(); c.strokeStyle = '#ff9ed0'; c.stroke()
  }
  c.restore()
}

function aura(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const { auraX: x, auraY: y } = hunt
  const r = hunt.radius
  const on = hunt.auraOn
  const pulse = on ? 1 + Math.sin(t * hunt.tickRate * Math.PI * 2) * 0.04 : 1
  const g = c.createRadialGradient(x, y, r * 0.1, x, y, r * pulse)
  g.addColorStop(0, on ? '#ff2a4a30' : '#ff2a4a10'); g.addColorStop(0.75, on ? '#ff2a4a22' : '#ff2a4a08'); g.addColorStop(1, '#ff2a4a00')
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r * pulse, 0, Math.PI * 2); c.fill()
  c.save(); c.translate(x, y); c.rotate(t * 0.8)
  c.strokeStyle = on ? '#ff5a74' : '#ff5a7466'; c.lineWidth = 2.5; c.setLineDash([10, 8])
  c.beginPath(); c.arc(0, 0, r * pulse, 0, Math.PI * 2); c.stroke()
  c.rotate(-t * 1.9); c.setLineDash([3, 14]); c.lineWidth = 4; c.strokeStyle = on ? '#ffb3c1aa' : '#ffb3c133'
  c.beginPath(); c.arc(0, 0, r * 0.72, 0, Math.PI * 2); c.stroke()
  c.restore(); c.setLineDash([])
  if (hunt.bite > 0) {
    const k = hunt.bite / 0.22
    c.strokeStyle = `rgba(255,220,230,${k})`; c.lineWidth = 6 * k
    c.beginPath(); c.arc(x, y, (26 + hunt.stats.biteRadius) * (1.6 - k * 0.6), 0, Math.PI * 2); c.stroke()
  }
}

function vampire(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  if (!ready(sprites.vampires)) return
  const x = Math.round(hunt.vampireX), y = Math.round(hunt.vampireY)
  c.fillStyle = '#090b19aa'; c.beginPath(); c.ellipse(x, y + 2, 18, 6, 0, 0, Math.PI * 2); c.fill()
  const moving = Math.hypot(hunt.auraX - hunt.vampireX, hunt.auraY + 26 - hunt.vampireY) > 14
  const frame = hunt.bite > 0.1 ? 4 : hunt.bite > 0 ? 3 : moving ? [1, 3, 2, 3][Math.floor(t * 9) % 4] : Math.floor(t * 4) % 3
  const speed = Math.hypot(hunt.auraX - hunt.vampireX, hunt.auraY + 26 - hunt.vampireY)
  if (speed > 40) {
    c.globalAlpha = 0.25; c.globalCompositeOperation = 'lighter'
    c.drawImage(sprites.vampires, frame * 112, hunt.city.era * 112, 112, 112, x - 42 - (hunt.auraX - hunt.vampireX) * 0.15, y - 86 - (hunt.auraY + 26 - hunt.vampireY) * 0.15, 84, 89)
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'
  }
  if (hunt.invuln > 0 && Math.floor(t * 20) % 2) c.globalAlpha = 0.35
  c.drawImage(sprites.vampires, frame * 112, hunt.city.era * 112, 112, 112, x - 42, y - 86, 84, 89)
  c.globalAlpha = 1
}

function bats(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const n = Math.min(16, hunt.bats)
  for (let i = 0; i < n; i++) {
    const a = t * (1.6 + (i % 3) * 0.3) + (i / n) * Math.PI * 2
    const r = hunt.radius * 0.9 + Math.sin(t * 2 + i) * 14
    const x = hunt.auraX + Math.cos(a) * r, y = hunt.auraY + Math.sin(a) * r * 0.55 - 10
    glow(c, x, y, 16, 'rgba(107,231,213,0.35)')
    drawBat(c, x, y, 1.1, t + i * 0.37, '#1c0f24')
  }
}

export function drawHunt(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const { scale, x: ox, y: oy } = huntCamera(c.canvas.width, c.canvas.height)
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.fillStyle = '#07040b'; c.fillRect(0, 0, c.canvas.width, c.canvas.height)
  wolfSheet(hunt.city.index) // preload the city's werewolf
  const shake = hunt.shake
  // camera punch: zoom toward the action on big moments
  const z = 1 + Math.sin(Math.min(1, hunt.punch) * Math.PI / 2) * 0.07
  const s2 = scale * z
  const fx = hunt.vampireX, fy = hunt.vampireY - 40
  const jx = shake ? (Math.random() - 0.5) * shake * scale : 0, jy = shake ? (Math.random() - 0.5) * shake * scale : 0
  c.setTransform(s2, 0, 0, s2, ox + fx * scale - fx * s2 + jx, oy + fy * scale - fy * s2 + jy)
  c.imageSmoothingEnabled = false
  const progress = Math.min(1, hunt.elapsed / hunt.duration)
  drawSky(c, hunt.city.era, progress, t)
  c.drawImage(scenery(hunt.city.index), 0, 0)
  if (progress > 0.6) { c.fillStyle = `rgba(255,140,110,${(progress - 0.6) * 0.3})`; c.fillRect(0, 165, W, H - 165) }
  // blood splats stay on the ground for the whole night
  for (const s of hunt.splats) {
    c.save(); c.translate(s.x, s.y); c.rotate(s.rot); c.scale(1, 0.45); c.globalAlpha = Math.min(0.85, s.life)
    c.fillStyle = '#6a0a1a'; c.beginPath(); c.arc(0, 0, s.r, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#9a1028'; c.beginPath(); c.arc(-s.r * 0.2, -s.r * 0.2, s.r * 0.6, 0, Math.PI * 2); c.fill()
    for (let k = 0; k < 4; k++) { const a = s.rot * 3 + k * 1.7; c.fillStyle = '#7a0a1e'; c.beginPath(); c.arc(Math.cos(a) * s.r * 1.4, Math.sin(a) * s.r * 1.4, s.r * 0.22, 0, Math.PI * 2); c.fill() }
    c.restore()
  }
  c.globalAlpha = 1
  activity(c, hunt.city.era, t, hunt.city.index)
  if (hunt.duel) {
    // duel: the city goes dark and a blood-moon spotlight falls on the arena
    const k = Math.min(1, hunt.duel.t / 1.2)
    c.fillStyle = `rgba(8,0,12,${0.45 * k})`; c.fillRect(-W, -H, 3 * W, 3 * H)
    c.globalCompositeOperation = 'lighter'
    glow(c, ((hunt.boss?.x ?? hunt.vampireX) + hunt.vampireX) / 2, 360, 340, `rgba(160,20,40,${0.25 * k})`)
    c.globalCompositeOperation = 'source-over'
  }
  telegraphs(c, hunt, t)
  aura(c, hunt, t)
  for (const d of hunt.drops) drop(c, d, t)
  const people = [...hunt.humans].sort((a, b) => a.y - b.y)
  let drawn = false
  for (const h of people) { if (!drawn && h.y > hunt.vampireY) { vampire(c, hunt, t); drawn = true } human(c, hunt, h, t) }
  if (!drawn) vampire(c, hunt, t)
  bubbles(c, hunt)
  for (const f of hunt.fx) {
    const k = f.age / f.duration
    if (f.row === 3) { // explosion
      c.globalCompositeOperation = 'lighter'
      glow(c, f.x, f.y, f.size * 0.5 * (0.4 + k), `rgba(255,${Math.round(160 - k * 100)},60,${1 - k})`)
      glow(c, f.x, f.y, f.size * 0.25 * (1 - k), 'rgba(255,240,200,0.9)')
      c.globalCompositeOperation = 'source-over'
    } else if (f.row === 4) { // bat strike
      c.strokeStyle = `rgba(107,231,213,${1 - k})`; c.lineWidth = 2
      for (let s = -1; s <= 1; s++) { c.beginPath(); c.moveTo(f.x - 8 + s * 5, f.y - 10); c.lineTo(f.x + 8 + s * 5, f.y + 10); c.stroke() }
    } else { // bite / claw slash
      c.strokeStyle = `rgba(255,${Math.round(200 - k * 150)},${Math.round(210 - k * 150)},${1 - k})`; c.lineWidth = 4 * (1 - k) + 1; c.lineCap = 'round'
      const r = f.size * 0.4
      for (let s = -1; s <= 1; s++) { c.beginPath(); c.moveTo(f.x - r + s * 9, f.y - r * 0.8); c.quadraticCurveTo(f.x + s * 9, f.y, f.x + r * 0.6 + s * 9, f.y + r * 0.9); c.stroke() }
      c.lineCap = 'butt'
    }
  }
  // shockwave rings
  for (const r of hunt.rings) {
    c.globalAlpha = Math.max(0, Math.min(1, r.life * 3))
    c.strokeStyle = r.color; c.lineWidth = r.width
    c.beginPath(); c.ellipse(r.x, r.y, r.r, r.r * 0.55, 0, 0, Math.PI * 2); c.stroke()
  }
  c.globalAlpha = 1
  // souls flying to the vampire, with glowing trails
  c.globalCompositeOperation = 'lighter'
  for (const s of hunt.souls) {
    glow(c, s.x, s.y, s.size * 4, s.color + '99')
    glow(c, s.x - s.vx * 0.03, s.y - s.vy * 0.03, s.size * 3, s.color + '55')
    glow(c, s.x - s.vx * 0.06, s.y - s.vy * 0.06, s.size * 2, s.color + '33')
    rect(c, s.x - s.size / 2, s.y - s.size / 2, s.size, s.size, '#fff')
  }
  c.globalCompositeOperation = 'source-over'
  bats(c, hunt, t)
  c.globalCompositeOperation = 'lighter'
  for (const p of hunt.sparks) { c.globalAlpha = Math.min(1, p.life * 2); rect(c, p.x, p.y, p.size, p.size, p.color); if (p.size > 3) glow(c, p.x, p.y, p.size * 3, p.color + '55') }
  c.globalCompositeOperation = 'source-over'
  c.globalAlpha = 1
  c.textAlign = 'center'
  for (const f of hunt.texts) {
    const k = f.life / 0.9
    const pop = k > 0.8 ? 1 + (k - 0.8) * 2.5 : 1
    c.globalAlpha = Math.min(1, k * 2.2)
    c.font = `900 ${Math.round(f.size * pop)}px Inter, system-ui, sans-serif`
    c.lineWidth = 4; c.strokeStyle = '#1a0710'; c.strokeText(f.text, f.x, f.y); c.fillStyle = f.color; c.fillText(f.text, f.x, f.y)
  }
  c.globalAlpha = 1
  // outside the city is night fog (visible when the camera zooms out on phones)
  if (huntZoom(c.canvas.width, c.canvas.height) < 1) {
    const fog = '#07040b'
    c.fillStyle = fog; c.fillRect(-W, H, 3 * W, H); c.fillRect(-W, -H, W, 3 * H); c.fillRect(W, -H, W, 3 * H)
    const edge = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
      const g = c.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, '#07040b00'); g.addColorStop(1, fog)
      c.fillStyle = g; c.fillRect(rx, ry, rw, rh)
    }
    edge(0, H - 80, 0, H, -W, H - 80, 3 * W, 80)
    edge(70, 0, 0, 0, 0, -H, 70, 3 * H)
    edge(W - 70, 0, W, 0, W - 70, -H, 70, 3 * H)
  }
  if (hunt.flashRed > 0) { c.fillStyle = `rgba(200,20,50,${hunt.flashRed * 0.25})`; c.fillRect(0, 0, W, H) }
  c.setTransform(1, 0, 0, 1, 0, 0)
  // screen-space: vignette that turns red as the combo climbs, white flash on hit-stop
  const cw = c.canvas.width, ch = c.canvas.height
  const heat = Math.min(1, hunt.combo / 60)
  const v = c.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(${Math.round(40 + heat * 150)},0,${Math.round(20 - heat * 10)},${0.45 + heat * 0.25})`)
  c.fillStyle = v; c.fillRect(0, 0, cw, ch)
  if (hunt.hitStop > 0) { c.fillStyle = `rgba(255,240,230,${Math.min(0.35, hunt.hitStop)})`; c.fillRect(0, 0, cw, ch) }
}
