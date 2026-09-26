// Draws a night of hunting: city, humans, loot, aura, vampire, bats, effects and floating numbers.
import type { Hunt, Human, Drop } from '../game/hunt'
import { camera, W, H } from '../viewport'
import { activity, effect, humanAtlas, ready, rect, scenery, sprites } from './scenery'

const ROW: Record<Human['kind'], number> = { common: 0, runner: 1, guard: 2, rare: 3, boss: 4 }

function human(c: CanvasRenderingContext2D, h: Human, t: number) {
  const atlas = humanAtlas()
  if (!ready(atlas)) return
  const boss = h.kind === 'boss'
  const scale = boss ? 1.75 : 1
  const x = Math.round(h.x), y = Math.round(h.y)
  c.fillStyle = '#0b0d1a88'
  c.beginPath(); c.ellipse(x, y + 1, 13 * scale, 5 * scale, 0, 0, Math.PI * 2); c.fill()
  if (h.shiny || boss) {
    const glow = c.createRadialGradient(x, y - 28 * scale, 4, x, y - 28 * scale, 40 * scale)
    glow.addColorStop(0, boss ? '#ff4d6d66' : '#ffe27a88'); glow.addColorStop(1, '#0000')
    c.fillStyle = glow; c.beginPath(); c.arc(x, y - 28 * scale, 40 * scale, 0, Math.PI * 2); c.fill()
  }
  const frame = h.flash > 0 ? 4 : h.panic > 0 ? [1, 3, 2, 3][Math.floor(t * 12 + h.id) % 4] : Math.floor(t * 5 + h.id) % 3
  c.save(); c.translate(x, y); if (h.vx < 0) c.scale(-1, 1)
  c.drawImage(atlas, frame * 96, ROW[h.kind] * 96, 96, 96, -26 * scale, -60 * scale, 52 * scale, 62 * scale)
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
  if (!boss && h.hp < h.maxHp) { rect(c, x - 16, y - 66, 32, 4, '#1c1729'); rect(c, x - 15, y - 65, 30 * Math.max(0, h.hp / h.maxHp), 2, h.shiny ? '#ffd35c' : '#ff5470') }
  if (boss) { rect(c, x - 5, y - 122, 10, 8, '#ffe38a'); rect(c, x - 9, y - 126, 4, 6, '#ffe38a'); rect(c, x + 5, y - 126, 4, 6, '#ffe38a') }
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
  c.drawImage(sprites.vampires, frame * 112, hunt.city.era * 112, 112, 112, x - 42, y - 86, 84, 89)
}

function bats(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const n = Math.min(16, hunt.bats)
  for (let i = 0; i < n; i++) {
    const a = t * (1.6 + (i % 3) * 0.3) + (i / n) * Math.PI * 2
    const r = hunt.radius * 0.9 + Math.sin(t * 2 + i) * 14
    const x = hunt.auraX + Math.cos(a) * r, y = hunt.auraY + Math.sin(a) * r * 0.55 - 10
    effect(c, 4, Math.floor(t * 12 + i), x, y, 34)
  }
}

export function drawHunt(c: CanvasRenderingContext2D, hunt: Hunt, t: number) {
  const { scale, x: ox, y: oy } = camera(c.canvas.width, c.canvas.height)
  c.setTransform(1, 0, 0, 1, 0, 0)
  c.clearRect(0, 0, c.canvas.width, c.canvas.height)
  const shake = hunt.shake
  c.setTransform(scale, 0, 0, scale, ox + (shake ? (Math.random() - 0.5) * shake * scale : 0), oy + (shake ? (Math.random() - 0.5) * shake * scale : 0))
  c.imageSmoothingEnabled = false
  const progress = Math.min(1, hunt.elapsed / hunt.duration)
  if (ready(sprites.sky)) {
    const pos = progress * 7, f = Math.min(7, Math.floor(pos)), n = Math.min(7, f + 1)
    c.drawImage(sprites.sky, f * 512, 0, 512, 160, 0, 0, W, 210)
    if (n !== f) { c.globalAlpha = pos - f; c.drawImage(sprites.sky, n * 512, 0, 512, 160, 0, 0, W, 210); c.globalAlpha = 1 }
  } else rect(c, 0, 0, W, 210, '#261d39')
  c.drawImage(scenery(hunt.city.index), 0, 0)
  if (progress > 0.6) { c.fillStyle = `rgba(255,140,110,${(progress - 0.6) * 0.35})`; c.fillRect(0, 165, W, H - 165) }
  activity(c, hunt.city.era, t, hunt.city.slot)
  aura(c, hunt, t)
  for (const d of hunt.drops) drop(c, d, t)
  const people = [...hunt.humans].sort((a, b) => a.y - b.y)
  let drawn = false
  for (const h of people) { if (!drawn && h.y > hunt.vampireY) { vampire(c, hunt, t); drawn = true } human(c, h, t) }
  if (!drawn) vampire(c, hunt, t)
  for (const f of hunt.fx) effect(c, f.row, Math.floor((f.age / f.duration) * 8), f.x, f.y, f.size)
  bats(c, hunt, t)
  for (const p of hunt.sparks) { c.globalAlpha = Math.min(1, p.life * 2); rect(c, p.x, p.y, p.size, p.size, p.color) }
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
  if (hunt.flashRed > 0) { c.fillStyle = `rgba(200,20,50,${hunt.flashRed * 0.25})`; c.fillRect(0, 0, W, H) }
  c.setTransform(1, 0, 0, 1, 0, 0)
}
